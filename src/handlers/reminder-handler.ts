import * as line from '@line/bot-sdk';
import { jsonStringify } from '../utils';
import * as fs from 'fs';
import { ReminderData } from '../interfaces';
import { CronJob } from 'cron';
import lineBotClient from '../line-bot-client';

const REMINDER_FILE: string = process.env.REMINDER_FILE;

class ReminderHandler {
    private jobData: NodeJS.Dict<Array<ReminderData>>;
    private jobs: NodeJS.Dict<Array<CronJob>> = {};
    private isChange: boolean = false;

    constructor (){
        const rawdata: string = fs.readFileSync(REMINDER_FILE, {encoding: 'utf8'});
        this.jobData = JSON.parse(rawdata);
        this.writeFile();

        for (const id in this.jobData) {
            const data: Array<ReminderData> = this.jobData[id];
            this.jobs[id] = [];
            for(const d of data){
                const job: CronJob = this.createNewCronJob(id, d);
                this.jobs[id].push(job);
            }
        }
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

        if(text.startsWith('เพิ่มการแจ้งเตือน')) {
            text = text.substring('เพิ่มการแจ้งเตือน'.length);
            const messages: Array<string> = text.split(':');
            if(messages.length != 2) {
                return lineBotClient.replyMessage(replyToken,  `incorrect fotmat: เพิ่มการแจ้งเตือน<ชื่อการแจ้งเตือน>:crontime
                where crontime: [* ]* * * * *
                    Seconds: 0-59
                    Minutes: 0-59
                    Hours: 0-23
                    Day of Month: 1-31
                    Months: 0-11 (Jan-Dec)
                    Day of Week: 0-6 (Sun-Sat)`);
            }

            text = messages[0].trim();
            const cronTime: string = messages[1].trim();

            if(text.length == 0) {
                return lineBotClient.replyMessage(replyToken,  'incorrect fotmat: ชื่อการแจ้งเตือนต้องมีข้อมูล');
            }

            if(cronTime.length == 0 || cronTime.split(' ').length < 5) {
                return lineBotClient.replyMessage(replyToken,  'incorrect fotmat: crontime ต้องมีข้อมูล');
            }

            if(!this.jobData[id]){
                this.jobData[id] = [];
                this.jobs[id] = [];
            }

            try {
                const data: ReminderData = {
                    cronTime: cronTime,
                    message: text
                };
                const job: CronJob = this.createNewCronJob(id, data);
                this.jobData[id].push(data);
                this.jobs[id].push(job);
                this.isChange = true;
                return lineBotClient.replyMessage(replyToken, 'เพิ่มการแจ้งเตือนแล้ว');
            }
            catch(ex) {
                return lineBotClient.replyMessage(replyToken, (<Error> ex).message);
            }
        }
        else if(text.startsWith('แสดงการแจ้งเตือน')) {

            const list: NodeJS.Dict<ReminderData> = {};
            if(this.jobData[id]){
                const messages: Array<ReminderData> = this.jobData[id];
                for(let index in messages){
                    list[`${index}`] = messages[index];
                }
            }
            return lineBotClient.replyMessage(replyToken, jsonStringify(list));
        }

        else if(text.startsWith('ยกเลิกการแจ้งเตือน')) {
            text = text.substring('ยกเลิกการแจ้งเตือน'.length);
            const messages: Array<string> = text.split(':');
            const index: number = parseInt(messages[1]);

            if(messages.length != 2 || isNaN(index)) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: ยกเลิกการแจ้งเตือน:ลำดับรายการ');
            }

            if(this.jobData[id]) {
                this.jobData[id].splice(index, 1);
                this.jobs[id][index].stop();
                this.jobs[id].splice(index, 1);
                this.isChange = true;
            }
            return lineBotClient.replyMessage(replyToken, 'ลบการแจ้งเตือนแล้ว');
        }
    }

    private createNewCronJob = (id: string, data: ReminderData): CronJob => {
        return new CronJob(data.cronTime, function() {
            lineBotClient.pushSticker(id, '6325', '10979923');
            lineBotClient.pushMessage(id, 'ลืมอะไรหรือเปล่านะ');

            setTimeout(() => {
                lineBotClient.pushMessage(id, `อย่าลืม${data.message}นะครับ`);
            }, 10000)

        }, null, true, 'Asia/Bangkok');
    }

    private writeFile = (): void => {
        if(this.isChange){
            fs.writeFileSync(REMINDER_FILE, jsonStringify(this.jobData));
            console.log(`${REMINDER_FILE} write`);
            this.isChange = false;
        }
        setTimeout(this.writeFile, 5000)
    }
}

export default new ReminderHandler();