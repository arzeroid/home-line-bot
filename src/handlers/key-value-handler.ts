import { jsonStringify } from '../utils';
import lineBotClient from '../line-bot-client';
import BaseHandler from './base-handler';
import { Action, HandlerFn } from '../interfaces';

class KeyValueHandler extends BaseHandler {

    protected isCronData: boolean = false;
    protected handlerName: string = 'KeyValueHandler';
    protected data: NodeJS.Dict<NodeJS.Dict<string>>;
    protected filePath: string = process.env.KEY_VALUE_FILE;

    protected viewAllKeyFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        return lineBotClient.replyMessage(replyToken, jsonStringify(Object.keys(this.data[id])));
    }
    protected addFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length < 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const key: string = messages[0].trim();
        const value: string = messages.slice(1).join(':').trim();
        if (key.length == 0 || value.length == 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (!this.data[id]) {
            this.data[id] = {};
        }

        if (!this.data[id][key]) {
            this.data[id][key] = value;
            this.isChange = true;
            return lineBotClient.replyMessage(replyToken, 'บันทึกเรียบร้อย');
        }
        else {
            return lineBotClient.replyMessage(replyToken, `มีข้อมูล ${key} อยู่ในระบบอยู่แล้ว`);
        }
    };

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const key: string = text.trim();
        if (key.length == 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบข้อมูล');
        }

        return lineBotClient.replyMessage(replyToken, this.data[id][key]);
    };

    protected deleteFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');

        const key: string = messages[0].trim();

        if (messages.length != 1) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบข้อมูล');
        }

        delete this.data[id][key];
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบเรียบร้อย');
    };

    protected actions: Array<Action> = [
        {
            keyword: 'ขอ Keys ทั้งหมด',
            syntax: 'ขอ Keys ทั้งหมด',
            fn: this.viewAllKeyFn,
        },
        {
            keyword: 'บันทึกข้อมูล',
            syntax: 'บันทึกข้อมูล<key>:value',
            fn: this.addFn,
        },
        {
            keyword: 'ขอข้อมูล',
            syntax: 'ขอข้อมูล<key>',
            fn: this.showFn,
        },
        {
            keyword: 'ลบข้อมูล',
            syntax: 'ลบข้อมูล<key>',
            fn: this.deleteFn,
        }
    ];
}
const instance: KeyValueHandler = new KeyValueHandler();
instance.setup();
export default instance;