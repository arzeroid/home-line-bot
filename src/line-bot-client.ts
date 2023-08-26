import * as line from '@line/bot-sdk';
import { Readable } from "stream";

class LineBotClient {
    public config: line.MiddlewareConfig & line.ClientConfig = {
        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.CHANNEL_SECRET
    };
    private client: line.Client = new line.Client(this.config);

    public replyMessage = (replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const message: line.TextMessage = {
            type: 'text',
            text: text
        };
        return this.client.replyMessage(replyToken, message);
    }

    public replyImage = (replyToken: string, url: string): Promise<line.MessageAPIResponseBase> => {
        const message: line.ImageMessage = {
            type: 'image',
            originalContentUrl: url,
            previewImageUrl: url
        };
        return this.client.replyMessage(replyToken, message);
    }

    public replyVdo = (replyToken: string, url: string): Promise<line.MessageAPIResponseBase> => {
        const message: line.VideoMessage = {
            type: 'video',
            originalContentUrl: url,
            previewImageUrl: url
        };
        return this.client.replyMessage(replyToken, message);
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