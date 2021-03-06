import { jsonStringify } from '../utils';
import { Action, CronFn, HandlerFn, ReminderData } from '../interfaces';
import { CronJob } from 'cron';
import lineBotClient from '../line-bot-client';
import BaseHandler from './base-handler';

class ReminderHandler extends BaseHandler {

    protected isCronData: boolean = true;
    protected filePath: string = process.env.REMINDER_FILE;

    protected addFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        if(messages.length != 2) {
            return ;
        }

        const topic: string = messages[0].trim();
        const cronTime: string = messages[1].trim();

        if(topic.length == 0 || cronTime.length == 0 || cronTime.split(' ').length < 5) {
            return;
        }

        if(!this.cronData[id]){
            this.cronData[id] = [];
            this.jobs[id] = [];
        }

        const data: ReminderData = {
            cronTime: cronTime,
            message: topic
        };
        const job: CronJob = this.createNewCronJob(id, data);
        this.cronData[id].push(data);
        this.jobs[id].push(job);
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'เพิ่มการแจ้งเตือนแล้ว');
    };

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if(text.length != 0) {
            return;
        }

        const list: NodeJS.Dict<ReminderData> = {};
            if(this.cronData[id]){
                const messages: Array<ReminderData> = <Array<ReminderData>> this.cronData[id];
                for(let index in messages){
                    list[`${index}`] = messages[index];
                }
            }
            return lineBotClient.replyMessage(replyToken, jsonStringify(list));

    };

    protected cancelFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        const index: number = parseInt(messages[1]);

        if(messages.length != 2 || isNaN(index)) {
            return;
        }

        if(this.cronData[id]) {
            this.cronData[id].splice(index, 1);
            this.jobs[id][index].stop();
            this.jobs[id].splice(index, 1);
            this.isChange = true;
        }
        return lineBotClient.replyMessage(replyToken, 'ลบการแจ้งเตือนแล้ว');
    };

    protected cronFn: CronFn = (id: string, data: ReminderData) => {
        return () => {
            lineBotClient.pushSticker(id, '6325', '10979923');
            lineBotClient.pushMessage(id, 'ลืมอะไรหรือเปล่านะ');

            setTimeout(() => {
                lineBotClient.pushMessage(id, `อย่าลืม${data.message}นะ`);
            }, 10000)
        }
    };

    protected actions: Array<Action> = [
        {
            keyword: 'เพิ่มการแจ้งเตือน',
            syntax: 'เพิ่มการแจ้งเตือน<ชื่อการแจ้งเตือน>:crontime',
            fn: this.addFn,
        },
        {
            keyword: 'แสดงการแจ้งเตือน',
            syntax: 'แสดงการแจ้งเตือน',
            fn: this.showFn,
        },
        {
            keyword: 'ยกเลิกการแจ้งเตือน',
            syntax: 'ยกเลิกการแจ้งเตือน:ลำดับรายการ',
            fn: this.cancelFn,
        }
    ];
}

const instance: ReminderHandler = new ReminderHandler();
instance.setup();

export default instance;