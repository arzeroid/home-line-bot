import * as line from '@line/bot-sdk';
import { jsonStringify } from '../utils';
import * as fs from 'fs';
import lineBotClient from '../line-bot-client';

const MEMORY_FILE: string = process.env.MEMORY_FILE;

class MemoryHandler {
    private memory: NodeJS.Dict<NodeJS.Dict<Array<string>>>;
    private isChange: boolean = false;

    constructor (){
        const rawdata: string = fs.readFileSync(MEMORY_FILE, {encoding: 'utf8'});
        this.memory = JSON.parse(rawdata);
        this.writeMemory();
    }

    public handle = (event: line.MessageEvent): Promise<line.MessageAPIResponseBase> => {

        const replyToken: string = event.replyToken;
        const source: line.EventSource = event.source;
        let id: string = null;
        if(source.type == 'user') {
            id = source.userId;
        }
        else if(source.type == 'group') {
            id = source.groupId;
        }

        let message: line.TextEventMessage = <line.TextEventMessage> event.message;
        let text: string = message.text;
        let key: string = null;

        if(text == 'แสดงหัวข้อรายการทั้งหมด') {
            return lineBotClient.replyMessage(replyToken, jsonStringify(Object.keys(this.memory[id])));
        }

        else if(text.startsWith('เพิ่มรายการ')) {
            text = text.substring('เพิ่มรายการ'.length);
            const messages: Array<string> = text.split(':');
            if(messages.length != 2) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: เพิ่มรายการ<ชื่อรายการ>:รายละเอียด');
            }

            key = messages[0].trim();
            text = messages[1].trim();
            if(key.length == 0) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: ชื่อรายการต้องมีข้อมูล');
            }

            if(text.length == 0) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: รายละเอียดต้องมีข้อมูล');
            }

            if(!this.memory[id]){
                this.memory[id] = {};
            }

            if(!this.memory[id][key]){
                this.memory[id][key] = [];
            }

            this.memory[id][key].push(text);
            this.isChange = true;
            return lineBotClient.replyMessage(replyToken, 'บันทึกเรียบร้อย');
        }
        else if(text.startsWith('แสดงรายการ')) {
            key = text.substring('แสดงรายการ'.length).trim();
            if(key.length == 0) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: แสดงรายการ<ชื่อรายการ>');
            }

            if(!this.memory[id] || !this.memory[id][key]){
                return lineBotClient.replyMessage(replyToken, jsonStringify([]));
            }

            const list: NodeJS.Dict<string> = {};
            const messages: Array<string> = this.memory[id][key];
            for(let index in messages){
                list[`${index}`] = messages[index];
            }
            return lineBotClient.replyMessage(replyToken, jsonStringify(list));
        }

        else if(text.startsWith('ลบรายการ')) {
            text = text.substring('ลบรายการ'.length);
            const messages: Array<string> = text.split(':');

            key = messages[0].trim();
            const index: number = parseInt(messages[1]);

            if(messages.length != 2 || isNaN(index)) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: ลบรายการ<ชื่อรายการ>:ลำดับรายการ');
            }

            if(!this.memory[id] || !this.memory[id][key]) {
                return lineBotClient.replyMessage(replyToken, 'ไม่พบรายการที่ระบุ');
            }

            this.memory[id][key].splice(index, 1);
            this.isChange = true;
            return lineBotClient.replyMessage(replyToken, 'ลบเรียบร้อย');
        }
    }

    private writeMemory = (): void => {
        if(this.isChange){
            fs.writeFileSync(MEMORY_FILE, jsonStringify(this.memory));
            console.log('memory write');
            this.isChange = false;
        }
        setTimeout(this.writeMemory, 5000)
    }
}

export default new MemoryHandler();