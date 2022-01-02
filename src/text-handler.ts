import * as line from '@line/bot-sdk';
import { reply, jsonStringify } from './utils';
import { HandlerResult } from './interfaces';
import { TextEventMessage } from '@line/bot-sdk';

export default class TextHandler {
    private memory: NodeJS.Dict<NodeJS.Dict<Array<string>>>;

    constructor (memory: NodeJS.Dict<NodeJS.Dict<Array<string>>>){
        this.memory = memory;
    }

    public handle = (event: line.MessageEvent): HandlerResult => {

        const result: HandlerResult = {
            isChange: false,
            message: null
        };

        const source: line.EventSource = event.source;
        let id: string = null;
        if(source.type == 'user') {
            id = source.userId;
        }
        else if(source.type == 'group') {
            id = source.groupId;
        }

        let message: TextEventMessage = <TextEventMessage> event.message;
        let text: string = message.text;
        let key: string = null;

        if(text == 'แสดงหัวข้อรายการทั้งหมด') {
            result.message = jsonStringify(Object.keys(this.memory[id]));
        }

        else if(text.startsWith('เพิ่มรายการ')) {
            text = text.substring('เพิ่มรายการ'.length);
            const messages: Array<string> = text.split(':');
            if(messages.length != 2) {
                result.message = 'incorrect fotmat: เพิ่มรายการ<ชื่อรายการ>:รายละเอียด';
            }

            key = messages[0].trim();
            text = messages[1].trim();
            if(text.length == 0) {
                result.message = 'incorrect fotmat: รายละเอียดต้องมีข้อมูล';
            }

            if(!this.memory[id]){
                this.memory[id] = {};
            }

            if(!this.memory[id][key]){
                this.memory[id][key] = [];
            }

            this.memory[id][key].push(text);
            result.isChange = true;
            result.message = 'บันทึกเรียบร้อย';
        }
        else if(text.startsWith('แสดงรายการ')) {
            key = text.substring('แสดงรายการ'.length).trim();
            if(text.length < 0) {
                result.message = 'incorrect fotmat: แสดงรายการ<ชื่อรายการ>';
            }

            if(!this.memory[id]){
                result.message = 'ไม่พบชื่อรายการที่ระบุ';
            }

            if(!this.memory[id][key]){
                result.message = jsonStringify([]);
            }

            const list: NodeJS.Dict<string> = {};
            const messages: Array<string> = this.memory[id][key];
            for(let index in messages){
                list[`${index}`] = messages[index];
            }

            result.message = jsonStringify(list);
        }

        else if(text.startsWith('ลบรายการ')) {
            text = text.substring('ลบรายการ'.length);
            const messages: Array<string> = text.split(':');
            if(messages.length != 2 || !parseInt(messages[1])) {
                result.message = 'incorrect fotmat: ลบรายการ<ชื่อรายการ>:ลำดับรายการ';
            }

            key = messages[0].trim();

            if(!this.memory[id]) {
                result.message = 'ไม่พบชื่อรายการที่ระบุ';
            }

            if(!this.memory[id][key]) {
                result.message = 'ไม่พบรายการที่ระบุ';
            }

            this.memory[id][key].splice(parseInt(messages[1]), 1);
            result.isChange = true;
            result.message = 'ลบเรียบร้อย';
        }
        return result;
    }
}