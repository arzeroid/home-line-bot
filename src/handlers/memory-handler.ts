import * as line from '@line/bot-sdk';
import { jsonStringify } from '../utils';
import lineBotClient from '../line-bot-client';
import BaseHandler from './base-handler';
import { AdditionalAction, HandlerAction, HandlerFn } from '../interfaces';

class MemoryHandler extends BaseHandler {

    protected isCronData: boolean = false;
    protected filePath: string = process.env.MEMORY_FILE;;
    protected actions: HandlerAction = {
        add: {
            keyword: 'เพิ่มรายการ',
            syntax: 'เพิ่มรายการ<ชื่อรายการ>:รายละเอียด'
        },
        show: {
            keyword: 'แสดงรายการ',
            syntax: 'แสดงรายการ<ชื่อรายการ>'
        },
        cancel: {
            keyword: 'ลบรายการ',
            syntax: 'ลบรายการ<ชื่อรายการ>:ลำดับรายการ'
        }
    };

    protected additionalActions: Array<AdditionalAction> = [
        {
            keyword: 'แสดงหัวข้อรายการทั้งหมด',
            syntax: 'แสดงหัวข้อรายการทั้งหมด',
            fn: (id: string, replyToken: string): Promise<line.MessageAPIResponseBase> => {
                return lineBotClient.replyMessage(replyToken, jsonStringify(Object.keys(this.data[id])));
            }
        }
    ];

    protected addFn: HandlerFn = (id: string, replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const messages: Array<string> = text.split(':');
            if(messages.length != 2) {
                return lineBotClient.replyMessage(replyToken, `incorrect fotmat: ${this.actions.add.syntax}`);
            }

            const key: string = messages[0].trim();
            const description: string = messages[1].trim();
            if(key.length == 0) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: ชื่อรายการต้องมีข้อมูล');
            }

            if(description.length == 0) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: รายละเอียดต้องมีข้อมูล');
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

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const key: string = text;
        if(key.length == 0) {
            return lineBotClient.replyMessage(replyToken, `incorrect fotmat: ${this.actions.show.syntax}`);
        }

        if(!this.data[id] || !this.data[id][key]){
            return lineBotClient.replyMessage(replyToken, jsonStringify([]));
        }

        const list: NodeJS.Dict<string> = {};
        const messages: Array<string> = this.data[id][key];
        for(let index in messages){
            list[`${index}`] = messages[index];
        }
        return lineBotClient.replyMessage(replyToken, jsonStringify(list));
    };

    protected cancelFn: HandlerFn = (id: string, replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const messages: Array<string> = text.split(':');

        const key: string = messages[0].trim();
        const index: number = parseInt(messages[1]);

        if(messages.length != 2 || isNaN(index)) {
            return lineBotClient.replyMessage(replyToken, `incorrect fotmat: ${this.actions.cancel.syntax}`);
        }

        if(!this.data[id] || !this.data[id][key]) {
            return lineBotClient.replyMessage(replyToken, 'ไม่พบรายการที่ระบุ');
        }

        this.data[id][key].splice(index, 1);
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'ลบเรียบร้อย');
    };

}

export default new MemoryHandler();