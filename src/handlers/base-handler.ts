import * as line from '@line/bot-sdk';
import { jsonStringify } from '../utils';
import * as fs from 'fs';
import { HandlerAction, CronData, CronFn, HandlerFn, AdditionalAction, HandlerActionData } from '../interfaces';
import { CronJob } from 'cron';
import lineBotClient from '../line-bot-client';

export default class BaseHandler {
    protected isChange: boolean = false;

    // must be init on inherit class
    protected filePath: string;
    protected isCronData: boolean;
    protected actions: HandlerAction;
    protected addFn: HandlerFn;
    protected showFn: HandlerFn;
    protected cancelFn: HandlerFn;
    protected cronFn: CronFn; // required if isCronData = true
    protected additionalActions: Array<AdditionalAction> = [];

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

            for(let key of Object.keys(this.actions)){
                const handlerData: HandlerActionData= this.actions[key];
                syntaxList.push(handlerData.syntax);
            }

            for(let action of this.additionalActions){
                syntaxList.push(action.syntax);
            }

            return lineBotClient.pushMessage(id, jsonStringify(syntaxList));
        }

        if(text.startsWith(this.actions.add.keyword)) {
            text = text.substring(this.actions.add.keyword.length);

            try {
                return this.addFn(id, replyToken, text);
            }
            catch(ex) {
                return lineBotClient.replyMessage(replyToken, (<Error> ex).message);
            }
        }
        else if(text == this.actions.show.keyword) {
            return this.showFn(id, replyToken, text);
        }
        else if(text.startsWith(this.actions.cancel.keyword)) {
            text = text.substring(this.actions.cancel.keyword.length);
            return this.cancelFn(id, replyToken, text);
        }

        this.additionalActions.forEach(element => {
            if(text == element.keyword) {
                return element.fn(id, replyToken);
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