import * as line from '@line/bot-sdk';
import * as fs from 'fs';
import lineBotClient from '../line-bot-client';
import { Readable } from 'stream';


class ContentHandler {

    public handle = (event: line.MessageEvent): Promise<line.MessageAPIResponseBase> => {
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


        const source: line.EventSource = event.source;
        let id: string = null;
        if (source.type == 'user') {
            id = source.userId;
        }
        else if (source.type == 'group') {
            id = source.groupId;
        }

        const ws: fs.WriteStream = fs.createWriteStream(fileName);
        return lineBotClient.getMessageContent(event.message.id).then((data: Readable) => {
            data.pipe(ws);
            data.on('end', () => {
                ws.close();
            })
        }).then(() => {
            return lineBotClient.pushMessage(id, `${event.message.type} is saved.`);
        });

    }
}

const instance: ContentHandler = new ContentHandler();
export default instance;