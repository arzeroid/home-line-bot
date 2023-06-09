import * as line from '@line/bot-sdk';
import { Readable } from "stream";
import { LineSticker } from './interfaces';

class LineBotClient {
    public config: line.MiddlewareConfig & line.ClientConfig = {
        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.CHANNEL_SECRET
    };
    private client: line.Client = new line.Client(this.config);

    public stickers: Array<LineSticker> = [
        { packageId: '446', stickerId: '2010' },
        { packageId: '6325', stickerId: '10979923' },
        { packageId: '6325', stickerId: '10979917' },
        { packageId: '6325', stickerId: '10979922' },
    ];

    public replyMessage = (replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        return this.client.replyMessage(replyToken, {
            type: 'text',
            text: text
        });
    }

    public pushMessage = (id: string, text: string): Promise<line.MessageAPIResponseBase> => {
        return this.client.pushMessage(id, {
            type: 'text',
            text: text
        });
    }

    public pushSticker = (id: string, packageId: string, stickerId: string): Promise<line.MessageAPIResponseBase> => {
        return this.client.pushMessage(id, {
            type: 'sticker',
            packageId: packageId,
            stickerId: stickerId
        });
    }

    public getMessageContent = (messageId: string): Promise<Readable> => {
        return this.client.getMessageContent(messageId);
    }
}

export default new LineBotClient();