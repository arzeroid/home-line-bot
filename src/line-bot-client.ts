import * as line from '@line/bot-sdk';

class LineBotClient {
    public config: line.MiddlewareConfig & line.ClientConfig = {
        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.CHANNEL_SECRET
    };
    private client: line.Client = new line.Client(this.config);

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
        return this.client.(id, {
            type: 'sticker',
            packageId: packageId,
            stickerId: stickerId
        });
    }
}

export default new LineBotClient();