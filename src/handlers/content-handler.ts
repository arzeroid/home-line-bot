import * as line from '@line/bot-sdk';
import * as fs from 'fs';
import lineBotClient from '../line-bot-client';
import { Readable } from 'stream';
import { jsonStringify } from '../utils';

class ContentHandler {
    protected isAutoSave: boolean = true;

    public handle = (event: line.MessageEvent): Promise<line.MessageAPIResponseBase> => {
        const source: line.EventSource = event.source;
        let id: string = null;
        if (source.type == 'user') {
            id = source.userId;
        }
        else if (source.type == 'group') {
            id = source.groupId;
        }

        if (event.message.type == 'text') {
            let message: line.TextEventMessage = <line.TextEventMessage>event.message;
            let text: string = message.text;

            switch (text) {
                case 'แสดงคำสั่งทั้งหมด':
                    return lineBotClient.pushMessage(id, jsonStringify([
                        'enable auto save',
                        'disable auto save',
                        'auto save status'
                    ]));

                case 'enable auto save':
                    this.isAutoSave = true;
                    return lineBotClient.pushMessage(id, `Enable Auto Save Content`);

                case 'disable auto save':
                    this.isAutoSave = false;
                    return lineBotClient.pushMessage(id, `Disable Auto Save Content`);

                case 'auto save status':
                    return lineBotClient.pushMessage(id, `Auto Save Content Status: ${this.isAutoSave}`);
            }
        }

        if (!this.isAutoSave) {
            return;
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
}

const instance: ContentHandler = new ContentHandler();
export default instance;