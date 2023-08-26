import * as line from '@line/bot-sdk';
import * as fs from 'fs';
import lineBotClient from '../line-bot-client';
import { Readable } from 'stream';
import { jsonStringify } from '../utils';
import BaseHandler from './base-handler';
import { Action, HandlerFn } from '../interfaces';
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

        let fileName: string = null;

        switch (event.message.type) {
            case 'image':
                fileName = `contents/img/${event.message.id}.jpg`;
                break;
            case 'video':
                fileName = `contents/vdo/${event.message.id}.mp4`;
                break;
            case 'audio':
                fileName = `contents/audio/${event.message.id}.m4a`;
                break;
            case 'file':
                fileName = `contents/files/${event.message.fileName}`;
                break;
            default:
                return;
        }

        const ws: fs.WriteStream = fs.createWriteStream(fileName);
        return lineBotClient.getMessageContent(event.message.id).then((data: Readable) => {
            data.pipe(ws);
            data.on('end', () => {
                ws.close();
            })
        }).then(() => {
            return lineBotClient.replyMessage(replyToken, `${event.message.type} is saved as ${fileName}`);
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

    private getContentUrl = (id: string, message: string): string => {

        if (fs.existsSync(path.join(__dirname, '../..', message.trim()))) {
            this.timeout = moment().add(process.env.GET_CONTENT_TIMEOUT_MIN, 'minutes');
            this.seed = Math.random();
            const hash: string = md5(this.seed + id)
            const url: string = `${process.env.HTTP_MODE.toLowerCase()}://${process.env.DOMAIN_NAME}/${message.trim()}/${hash}`;
            return url;
        }
        else {
            throw new Error("not found");
        }
    }

    protected showImage: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        try {
            return lineBotClient.replyImage(replyToken, this.getContentUrl(id, messages[1]));
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, `File not exists: ${messages[1]}`);
        }
    }

    protected showVideo: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }
        try {
            return lineBotClient.replyVdo(replyToken, this.getContentUrl(id, messages[1]));
        } catch (err) {
            return lineBotClient.replyMessage(replyToken, `File not exists: ${messages[1]}`);
        }
    }

    private deleteContent: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2 || !messages[1].trim().startsWith('contents')) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const filePath: fs.PathLike = path.join(__dirname, '../..', messages[1].trim());
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return lineBotClient.replyMessage(replyToken, `Deleted file: ${messages[1]}`);
        }
        else {
            return lineBotClient.replyMessage(replyToken, `File not exists: ${messages[1]}`);
        }
    }

    private getContentList: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        let folder: string = 'contents/';
        switch (messages[1].trim()) {
            case 'img':
            case 'vdo':
            case 'audio':
            case 'files':
                folder += messages[1].trim();
                break;
            default:
                return;
        }
        const folderPath: fs.PathLike = path.join(__dirname, '../..', folder);
        const filenames: string[] = fs.readdirSync(folderPath);
        return lineBotClient.replyMessage(replyToken, `Files in ${folder}\n\n${filenames.join('\n')}`);
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
            keyword: 'delete content',
            syntax: 'delete content: filepath',
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