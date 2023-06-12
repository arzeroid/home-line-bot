import * as line from '@line/bot-sdk';
import * as fs from 'fs';
import lineBotClient from '../line-bot-client';
import { Readable } from 'stream';
import { jsonStringify } from '../utils';
import BaseHandler from './base-handler';
import { Action, HandlerFn } from '../interfaces';

class ContentHandler extends BaseHandler {

    protected isCronData: boolean = false;
    protected handlerName: string = 'ContentHandler';

    protected isAutoSave: boolean = true;

    public handleContent = (event: line.MessageEvent): Promise<line.MessageAPIResponseBase> => {
        if (!this.isAutoSave) {
            return;
        }

        const source: line.EventSource = event.source;
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
            return lineBotClient.pushMessage(id, `${event.message.type} is saved as ${fileName}`);
        });
    }

    protected enableAutoSaveFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        this.isAutoSave = true;
        return lineBotClient.pushMessage(id, `Enable Auto Save Content`);
    }

    protected disableAutoSaveFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        this.isAutoSave = false;
        return lineBotClient.pushMessage(id, `Disable Auto Save Content`);
    }

    protected autoSaveStatusFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        return lineBotClient.pushMessage(id, `Auto Save Content Status: ${this.isAutoSave}`);
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
    ];
}

const instance: ContentHandler = new ContentHandler();
export default instance;