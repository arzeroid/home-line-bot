import axios, { AxiosInstance, AxiosResponse } from 'axios';
import cheerio, { Cheerio, CheerioAPI } from 'cheerio';
import { CronCommand, CronJob } from 'cron';
import { CronFn, HandlerAction, HandlerFn, ScraperData } from '../interfaces';
import { jsonStringify } from '../utils';
import * as line from '@line/bot-sdk';
import lineBotClient from '../line-bot-client';
import { ScraperNotifyEnum } from '../enums';
import BaseHandler from './base-handler';

class ScraperHandler extends BaseHandler{

    protected isCronData: boolean = true;
    protected filePath: string = process.env.SCRAPER_FILE;

    protected actions: HandlerAction = {
        add: {
            keyword: 'monitor ',
            syntax: 'monitor <url>$<element>$<EXISTS|NOT_EXISTS|VALUE>$<crontime>'
        },
        show: {
            keyword: 'show monitor',
            syntax: 'show monitor'
        },
        cancel: {
            keyword: 'cancel monitor',
            syntax: 'cancel monitor:ลำดับรายการ'
        }
    };

    protected addFn: HandlerFn = (id: string, replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const messages: Array<string> = text.split('$');
        if(messages.length != 4) {
            return lineBotClient.replyMessage(replyToken,  `incorrect fotmat: ${this.actions.add.syntax}`);
        }

        const url: string = messages[0].trim();
        const element: string = messages[1].trim();
        const notifyWhen: string = messages[2].trim();
        const cronTime: string = messages[3].trim();

        if(url.length == 0) {
            return lineBotClient.replyMessage(replyToken,  'incorrect fotmat: url ต้องมีข้อมูล');
        }

        if(element.length == 0) {
            return lineBotClient.replyMessage(replyToken,  'incorrect fotmat: element ต้องมีข้อมูล');
        }

        if(ScraperNotifyEnum[notifyWhen] == undefined) {
            return lineBotClient.replyMessage(replyToken,  'incorrect fotmat: notify_when ไม่ถูกต้อง');
        }

        if(cronTime.length == 0 || cronTime.split(' ').length < 5) {
            return lineBotClient.replyMessage(replyToken,  'incorrect fotmat: crontime ต้องมีข้อมูล');
        }

        if(!this.cronData[id]){
            this.cronData[id] = [];
            this.jobs[id] = [];
        }

        const data: ScraperData = {
            url: url,
            element: element,
            notifyWhen: ScraperNotifyEnum[notifyWhen],
            cronTime: cronTime
        };
        const job: CronJob = this.createNewCronJob(id, data);
        this.cronData[id].push(data);
        this.jobs[id].push(job);
        this.isChange = true;
        return lineBotClient.replyMessage(replyToken, 'monitor success');
    };

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const list: NodeJS.Dict<ScraperData> = {};
        if(this.cronData[id]){
            const messages: Array<ScraperData> = <Array<ScraperData>> this.cronData[id];
            for(let index in messages){
                list[`${index}`] = messages[index];
            }
        }
        return lineBotClient.replyMessage(replyToken, jsonStringify(list));
    };

    protected cancelFn: HandlerFn = (id: string, replyToken: string, text: string): Promise<line.MessageAPIResponseBase> => {
        const messages: Array<string> = text.split(':');
            const index: number = parseInt(messages[1]);

            if(messages.length != 2 || isNaN(index)) {
                return lineBotClient.replyMessage(replyToken, `incorrect fotmat: ${this.actions.cancel.syntax}`);
            }

            if(this.cronData[id]) {
                this.cronData[id].splice(index, 1);
                this.jobs[id][index].stop();
                this.jobs[id].splice(index, 1);
                this.isChange = true;
            }
            return lineBotClient.replyMessage(replyToken, 'cancel monitor success');
    };

    protected cronFn: CronFn = (id: string, data: ScraperData): CronCommand => {
        const axiosInstance: AxiosInstance = this.axiosInstance;
        return async (): Promise<void> => {

            const response: AxiosResponse<any> = await axiosInstance.get(data.url);
            const $:CheerioAPI = cheerio.load(response.data);

            switch(data.notifyWhen) {
                case ScraperNotifyEnum.EXISTS:
                    if($(data.element).text() != undefined){
                        lineBotClient.pushMessage(id, `พบ ${data.element} ใน ${data.url} แล้ว`);
                    }
                    break;
                case ScraperNotifyEnum.NOT_EXISTS:
                    if($(data.element).text() == undefined){
                        lineBotClient.pushMessage(id, `ไม่พบ ${data.element} ใน ${data.url} แล้ว`);
                    }
                    break;
                case ScraperNotifyEnum.VALUE:
                    const value: string = $(data.element).text();
                    lineBotClient.pushMessage(id, `${data.element} ใน ${data.url} มีค่าเป็น ${value}`);
                    break;
            }
        }
    };

    private readonly axiosInstance: AxiosInstance = axios.create({
        headers: {
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
        }
    });
}

const instance: ScraperHandler = new ScraperHandler();
instance.setup();
export default new ScraperHandler();