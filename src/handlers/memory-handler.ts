import { jsonStringify } from '../utils';
import lineBotClient from '../line-bot-client';
import BaseHandler from './base-handler';
import { Action, HandlerFn } from '../interfaces';

class MemoryHandler extends BaseHandler {

    protected isCronData: boolean = false;
    protected handlerName: string = 'MemoryHandler';
    protected filePath: string = process.env.MEMORY_FILE;

    protected viewAllTopicFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length > 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        return lineBotClient.replyMessage(replyToken, jsonStringify(Object.keys(this.data[id])));
    }

    protected deleteTopicFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        const length: number = messages.length;
        if (length < 1 || length > 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const key: string = messages[0].trim();
        const isForce: boolean = (length == 2) && (messages[1].trim() == 'force');

        if (!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบชื่อรายการที่ระบุ');
        }

        if (this.data[id][key].length > 0 && !isForce) {
            return lineBotClient.replyMessage(replyToken, 'ไม่สามารถลบชื่อรายการที่ไม่ว่างได้');
        }

        delete this.data[id][key];
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบชื่อรายการเรียบร้อย');
    }

    protected renameTopicFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length != 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const oldTopic: string = messages[0].trim();
        const newTopic: string = messages[1].trim();

        if (!this.data[id] || !this.data[id][oldTopic]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบชื่อรายการที่ระบุ');
        }

        if (this.data[id][newTopic]) {
            return lineBotClient.replyMessage(replyToken, 'ชื่อรายการใหม่ซ้ำ');
        }

        this.data[id][newTopic] = this.data[id][oldTopic];
        delete this.data[id][oldTopic];
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบชื่อรายการเรียบร้อย');
    }

    protected addFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if (messages.length < 2) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const key: string = messages[0].trim();
        const description: string = messages.slice(1).join(':').trim();
        if (key.length == 0 || description.length == 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (!this.data[id]) {
            this.data[id] = {};
        }

        if (!this.data[id][key]) {
            this.data[id][key] = [];
        }

        this.data[id][key].push(description);
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'บันทึกเรียบร้อย');
    };

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const key: string = text.trim();
        if (key.length == 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (key == 'ทั้งหมด') {
            return;
        }

        if (!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบรายการที่ระบุ');
        }

        const list: NodeJS.Dict<string> = {};
        const messages: Array<string> = this.data[id][key];
        for (let index in messages) {
            list[`${index}`] = messages[index];
        }
        return lineBotClient.replyMessage(replyToken, jsonStringify(list));
    };

    protected deleteFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');

        const key: string = messages[0].trim();
        const index: number = parseInt(messages[1]);

        if (messages.length != 2 || isNaN(index)) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบรายการที่ระบุ');
        }

        this.data[id][key].splice(index, 1);
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบเรียบร้อย');
    };

    protected actions: Array<Action> = [
        {
            keyword: 'แสดงชื่อรายการ',
            syntax: 'แสดงชื่อรายการ',
            fn: this.viewAllTopicFn,
        },
        {
            keyword: 'แสดงรายการทั้งหมด',
            syntax: 'แสดงรายการทั้งหมด',
            fn: this.viewAllTopicFn,
        },
        {
            keyword: 'ลบชื่อรายการ',
            syntax: 'ลบชื่อรายการ<ชื่อรายการ>(:force)?',
            fn: this.deleteTopicFn,
        },
        {
            keyword: 'เปลื่ยนชื่อรายการ',
            syntax: 'เปลื่ยนชื่อรายการ<ชื่อรายการเดิม>ชื่อรายการใหม่',
            fn: this.renameTopicFn,
        },
        {
            keyword: 'เพิ่มรายการ',
            syntax: 'เพิ่มรายการ<ชื่อรายการ>:รายละเอียด',
            fn: this.addFn,
        },
        {
            keyword: 'แสดงรายการ',
            syntax: 'แสดงรายการ<ชื่อรายการ>',
            fn: this.showFn,
        },
        {
            keyword: 'ลบรายการ',
            syntax: 'ลบรายการ<ชื่อรายการ>:ลำดับรายการ',
            fn: this.deleteFn,
        }
    ];
}
const instance: MemoryHandler = new MemoryHandler();
instance.setup();
export default instance;