import { jsonStringify } from '../utils';
import lineBotClient from '../line-bot-client';
import BaseHandler from './base-handler';
import { Action, HandlerFn } from '../interfaces';

class MemoryHandler extends BaseHandler {

    protected isCronData: boolean = false;
    protected filePath: string = process.env.MEMORY_FILE;

    protected viewAllTopicFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if(text.length > 0) {
            return;
        }

        return lineBotClient.replyMessage(replyToken, jsonStringify(Object.keys(this.data[id])));
    }

    protected deleteTopicFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if(messages.length != 2) {
            return ;
        }

        const key: string = messages[1].trim();

        if(!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบหัวข้อรายการที่ระบุ');
        }

        delete this.data[id][key];
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบหัวข้อรายการเรียบร้อย');
    }

    protected addFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
            if(messages.length != 2) {
                return;
            }

            const key: string = messages[0].trim();
            const description: string = messages[1].trim();
            if(key.length == 0 || description.length == 0) {
                return;
            }

            if(!this.data[id]){
                this.data[id] = {};
            }

            if(!this.data[id][key]){
                this.data[id][key] = [];
            }

            this.data[id][key].push(description);
            this.isChange = true;
            return lineBotClient.replyMessage(replyToken, 'บันทึกเรียบร้อย');
    };

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const key: string = text;
        if(key.length == 0) {
            return;
        }

        if(!this.data[id] || !this.data[id][key]){
            return lineBotClient.replyMessage(replyToken, 'ไม่พบรายการที่ระบุ');
        }

        const list: NodeJS.Dict<string> = {};
        const messages: Array<string> = this.data[id][key];
        for(let index in messages){
            list[`${index}`] = messages[index];
        }
        return lineBotClient.replyMessage(replyToken, jsonStringify(list));
    };

    protected cancelFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');

        const key: string = messages[0].trim();
        const index: number = parseInt(messages[1]);

        if(messages.length != 2 || isNaN(index)) {
            return;
        }

        if(!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบรายการที่ระบุ');
        }

        this.data[id][key].splice(index, 1);
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบเรียบร้อย');
    };

    protected actions: Array<Action> = [
        {
            keyword: 'แสดงหัวข้อรายการทั้งหมด',
            syntax: 'แสดงหัวข้อรายการทั้งหมด',
            fn: this.viewAllTopicFn,
        },
        {
            keyword: 'ลบหัวข้อรายการ',
            syntax: 'ลบหัวข้อรายการ:ชื่อหัวข้อรายการ',
            fn: this.deleteTopicFn,
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
            fn: this.cancelFn,
        }
    ];
}
const instance: MemoryHandler = new MemoryHandler();
instance.setup();
export default instance;