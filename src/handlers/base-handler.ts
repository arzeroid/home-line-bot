import * as line from '@line/bot-sdk';
import { jsonStringify } from '../utils';
import * as fs from 'fs';
import { CronData, CronFn, Action } from '../interfaces';
import { CronJob } from 'cron';
import lineBotClient from '../line-bot-client';

export default class BaseHandler {
    protected isChange: boolean = false;

    // must be init on inherit class
    protected filePath: string;
    protected isCronData: boolean;
    protected cronFn: CronFn; // required if isCronData = true
    protected actions: Array<Action> = [];

    // variables when isCronData = false
    protected data: NodeJS.Dict<NodeJS.Dict<Array<string>>>;

    // variables when isCronData = true
    protected cronData: NodeJS.Dict<Array<CronData>>;
    protected jobs: NodeJS.Dict<Array<CronJob>> = {};

    public setup = (): void => {
        const rawData: string = fs.readFileSync(this.filePath, {encoding: 'utf8'});

        if(this.isCronData){
            this.cronData = JSON.parse(rawData);

            for (const id in this.cronData) {
                const data: Array<CronData> = <Array<CronData>> this.cronData[id];
                this.jobs[id] = [];
                for(const d of data){
                    const job: CronJob = this.createNewCronJob(id, d);
                    this.jobs[id].push(job);
                }
            }
        }
        else {
            this.data = JSON.parse(rawData);
        }
        this.writeFile();
    }

    public handle = (event: line.MessageEvent): Promise<line.MessageAPIResponseBase> => {
        const replyToken: string = event.replyToken;
        const source: line.EventSource = event.source;
        let id: string = null;

        console.log(jsonStringify(event));

        if(source.type == 'user') {
            id = source.userId;
        }
        else if(source.type == 'group') {
            id = source.groupId;
        }

        let message: line.TextEventMessage = <line.TextEventMessage> event.message;
        let text: string = message.text;

        if(text == 'แสดงคำสั่งทั้งหมด') {
            const syntaxList: Array<string> = [];

            for(let action of this.actions){
                syntaxList.push(action.syntax);
            }

            return lineBotClient.pushMessage(id, jsonStringify(syntaxList));
        }

        this.actions.forEach(element => {
            if(text.startsWith(element.keyword)) {
                console.log("startsWith:" + element.keyword);
                text = text.substring(element.keyword.length);
                console.log(text);
                return element.fn(id, replyToken, text);
            }
        });
    }

    protected createNewCronJob = (id: string, data: CronData): CronJob => {
        return new CronJob(data.cronTime, this.cronFn(id, data), null, true, 'Asia/Bangkok');
    }

    protected writeFile = (): void => {
        if(this.isChange){
            if(this.isCronData){
                fs.writeFileSync(this.filePath, jsonStringify(this.cronData));
            }
            else {
                fs.writeFileSync(this.filePath, jsonStringify(this.data));
            }

            console.log(`${this.filePath} write`);
            this.isChange = false;
        }
        setTimeout(this.writeFile, 5000)
    }
}