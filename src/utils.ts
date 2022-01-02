import * as line from '@line/bot-sdk';

export function jsonStringify(data: object): string {
    return JSON.stringify(data, null, 4);
}

export function reply(client: line.Client,replyToken: string, text: string) {
    return client.replyMessage(replyToken, {
        type: 'text',
        text: text
    });
}