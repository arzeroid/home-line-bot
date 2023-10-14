import * as line from '@line/bot-sdk';
import * as fs from 'fs';
import lineBotClient from '../line-bot-client';
import { Readable } from 'stream';
import { jsonStringify } from '../utils';
import BaseHandler from './base-handler';
import { Action, GetContentParams, HandlerFn } from '../interfaces';
import { Moment } from 'moment';
import moment = require('moment');
import * as md5 from 'js-md5';
import * as path from 'path';

class ContentHandler extends BaseHandler {

    protected isCronData: boolean = false;
    protected isAdminOnly: boolean = true;
    protected handlerName: string = 'ContentHandler';

    protected isAutoSave: boolean = true;

    //  for get content
    public seed: number = 0;
    public timeout: Moment = null;

    protected rootPath: string = path.join(__dirname, '../../contents');
    protected subPaths: Array<string> = [
        'img',
        'vdo',
        'audio',
        'files'
    ];


    public handleContent = (event: line.MessageEvent): Promise<line.MessageAPIResponseBase> => {
        if (!this.isAutoSave) {
            return;
        }

        const source: line.EventSource = event.source;
        const replyToken: string = event.replyToken;
        let id: string = null;
        if (source.type == 'user') {
            id = source.userId;
        }
        else if (source.type == 'group') {
            id = source.groupId;
        }

        let filename: string = null;

        switch (event.message.type) {
            case 'image':
                filename = `contents/img/${event.message.id}.jpg`;
                break;
            case 'video':
                filename = `contents/vdo/${event.message.id}.mp4`;
                break;
            case 'audio':
                filename = `contents/audio/${event.message.id}.m4a`;
                break;
            case 'file':
                filename = `contents/files/${event.message.id}.${event.message.fileName.split('.').pop()}`;
                break;
            default:
                return;
        }

        const ws: fs.WriteStream = fs.createWriteStream(filename);
        return lineBotClient.getMessageContent(event.message.id).then((data: Readable) => {
            data.pipe(ws);
            data.on('end', () => {
                ws.close();
            })
        }).then(() => {
            return lineBotClient.replyMessage(replyToken, `${event.message.type} is saved as ${filename}`);
        });
    }

    protected enableAutoSaveFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        this.isAutoSave = true;
        return lineBotClient.replyMessage(replyToken, `Enable Auto Save Content`);
    }

    protected disableAutoSaveFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        this.isAutoSave = false;
        return lineBotClient.replyMessage(replyToken, `Disable Auto Save Content`);
    }

    protected autoSaveStatusFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        return lineBotClient.replyMessage(replyToken, `Auto Save Content Status: ${this.isAutoSave}`);
    }

    private getContentUrl = (id: string, subPath: string, filename: string): string => {
        if (this.subPaths.includes(subPath) && fs.existsSync(path.join(this.rootPath, subPath, filename))) {
            this.timeout = moment().add(process.env.GET_CONTENT_TIMEOUT_MIN, 'minutes');
            this.seed = Math.random();
            const hash: string = md5(this.seed + id)
            const url: string = `${process.env.HTTP_MODE.toLowerCase()}://${process.env.DOMAIN_NAME}` +
                `/contents/${subPath}/${filename}/${hash}`;
            return url;
        }
        else {
            throw new Error("not found");
        }
    }

    public getContent = (req, res, next) => {
        const params: GetContentParams = req.params;

        console.log(params);

        if (moment().isBefore(this.timeout) && md5(this.seed + process.env.ADMIN_ID) == params.hash) {
            res.sendFile(path.join(this.rootPath, params.contentType, params.filename))
        }
        else {
            next();
        }
    }

    protected showImage: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const filename: string = messages[1].trim();
        try {
            return lineBotClient.replyImage(replyToken, this.getContentUrl(id, 'img', filename));
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, `File not exists: ${filename}`);
        }
    }

    protected showVideo: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const filename: string = messages[1].trim();
        try {
            return lineBotClient.replyVdo(replyToken, this.getContentUrl(id, 'vdo', filename));
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, `File not exists: ${filename}`);
        }
    }

    protected showFile: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const filename: string = messages[1].trim();
        try {
            return lineBotClient.replyMessage(replyToken, this.getContentUrl(id, 'files', filename));
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, `File not exists: ${filename}`);
        }
    }

    protected renameContent: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 4) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const subPath: string = messages[1].trim();
        if (!this.subPaths.includes(subPath)) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const oldFilename: string = messages[2].trim();
        const newFilename: string = messages[3].trim();
        const oldFilePath: fs.PathLike = path.join(this.rootPath, subPath, oldFilename);
        const newFilePath: fs.PathLike = path.join(this.rootPath, subPath, newFilename);
        try {
            if (fs.existsSync(oldFilePath)) {
                fs.renameSync(oldFilePath, newFilePath);
                return lineBotClient.replyMessage(replyToken, `Deleted ${subPath} file: ${oldFilename} -> ${newFilename}`);
            }
            else {
                return lineBotClient.replyMessage(replyToken, `File not exists: ${oldFilename}`);
            }
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, jsonStringify(err));
        }
    }

    protected deleteContent: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 3) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const subPath: string = messages[1].trim();
        if (!this.subPaths.includes(subPath)) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const filename: string = messages[2].trim();
        const filePath: fs.PathLike = path.join(this.rootPath, subPath, filename);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return lineBotClient.replyMessage(replyToken, `Deleted ${subPath} file: ${filename}`);
            }
            else {
                return lineBotClient.replyMessage(replyToken, `File not exists: ${filename}`);
            }
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, jsonStringify(err));
        }
    }

    protected getContentList: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const subPath: string = messages[1].trim();
        if (!this.subPaths.includes(subPath)) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const folderPath: fs.PathLike = path.join(this.rootPath, subPath);
        try {
            if (fs.existsSync(folderPath)) {
                const filenames: string[] = fs.readdirSync(folderPath);
                return lineBotClient.replyMessage(replyToken, `Files in ${folderPath.toString()}\n\n${filenames.join('\n')}`);
            }
            else {
                return lineBotClient.replyMessage(replyToken, `Path not exists: ${folderPath}`);
            }
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, jsonStringify(err));
        }
    }

    protected actions: Array<Action> = [
        {
            keyword: 'enable auto save',
            syntax: 'enable auto save',
            fn: this.enableAutoSaveFn,
        },
        {
            keyword: 'disable auto save',
            syntax: 'disable auto save',
            fn: this.disableAutoSaveFn,
        },
        {
            keyword: 'auto save status',
            syntax: 'auto save status',
            fn: this.autoSaveStatusFn,
        },
        {
            keyword: 'show image',
            syntax: 'show image: filepath',
            fn: this.showImage,
        },
        {
            keyword: 'show vdo',
            syntax: 'show vdo: filepath',
            fn: this.showVideo,
        },
        {
            keyword: 'show file',
            syntax: 'show file: filepath',
            fn: this.showFile,
        },
        {
            keyword: 'rename content',
            syntax: 'rename content: (img, vdo, audio, files): oldFilename: newFilename',
            fn: this.renameContent,
        },
        {
            keyword: 'delete content',
            syntax: 'delete content: (img, vdo, audio, files): filename',
            fn: this.deleteContent,
        },
        {
            keyword: 'get content list',
            syntax: 'get content list: (img, vdo, audio, files)',
            fn: this.getContentList,
        },
    ];
}

const instance: ContentHandler = new ContentHandler();
export default instance;