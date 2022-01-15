import axios, { AxiosInstance, AxiosResponse } from 'axios';
import cheerio, { Cheerio, CheerioAPI } from 'cheerio';
import { CronCommand, CronJob } from 'cron';
import { ScraperData } from '../interfaces';
import { jsonStringify } from '../utils';
import * as fs from 'fs';
import * as line from '@line/bot-sdk';
import lineBotClient from '../line-bot-client';
import { ScraperNotifyEnum } from './enums';

const SCRAPER_FILE: string = process.env.SCRAPER_FILE;

export default
class Scraper {
    private scraperData: NodeJS.Dict<Array<ScraperData>>;
    private jobs: NodeJS.Dict<Array<CronJob>> = {};
    private isChange: boolean = false;

    constructor (){
        const rawdata: string = fs.readFileSync(SCRAPER_FILE, {encoding: 'utf8'});
        this.scraperData = JSON.parse(rawdata);
        this.writeFile();

        for (const id in this.scraperData) {
            const data: Array<ScraperData> = this.scraperData[id];
            this.jobs[id] = [];
            for(const d of data){
                const job: CronJob = this.createNewCronJob(id, d);
                this.jobs[id].push(job);
            }
        }
    }

    private readonly axiosInstance: AxiosInstance = axios.create({
        headers: {
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
        }
    });

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

        if(text.startsWith('monitor ')) {
            text = text.substring('monitor '.length);
            const messages: Array<string> = text.split(':');
            if(messages.length != 4) {
                return lineBotClient.replyMessage(replyToken,  `incorrect fotmat: monitor <url>:<element>:<EXISTS|NOT_EXISTS|VALUE>:<crontime>
                where crontime: [* ]* * * * *
                    Seconds: 0-59
                    Minutes: 0-59
                    Hours: 0-23
                    Day of Month: 1-31
                    Months: 0-11 (Jan-Dec)
                    Day of Week: 0-6 (Sun-Sat)`);
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

            if(!this.scraperData[id]){
                this.scraperData[id] = [];
                this.jobs[id] = [];
            }

            try {
                const data: ScraperData = {
                    url: url,
                    element: element,
                    notifyWhen: ScraperNotifyEnum[notifyWhen],
                    cronTime: cronTime
                };
                const job: CronJob = this.createNewCronJob(id, data);
                this.scraperData[id].push(data);
                this.jobs[id].push(job);
                this.isChange = true;
                return lineBotClient.replyMessage(replyToken, 'monitor success');
            }
            catch(ex) {
                return lineBotClient.replyMessage(replyToken, (<Error> ex).message);
            }
        }
        else if(text.startsWith('show monitor')) {

            const list: NodeJS.Dict<ScraperData> = {};
            if(this.scraperData[id]){
                const messages: Array<ScraperData> = this.scraperData[id];
                for(let index in messages){
                    list[`${index}`] = messages[index];
                }
            }
            return lineBotClient.replyMessage(replyToken, jsonStringify(list));
        }

        else if(text.startsWith('cancel monitor')) {
            text = text.substring('cancel monitor'.length);
            const messages: Array<string> = text.split(':');
            const index: number = parseInt(messages[1]);

            if(messages.length != 2 || isNaN(index)) {
                return lineBotClient.replyMessage(replyToken, 'incorrect fotmat: cancel monitor:ลำดับรายการ');
            }

            if(this.scraperData[id]) {
                this.scraperData[id].splice(index, 1);
                this.jobs[id][index].stop();
                this.jobs[id].splice(index, 1);
                this.isChange = true;
            }
            return lineBotClient.replyMessage(replyToken, 'cancel monitor success');
        }
    }

    private createNewCronJob = (id: string, data: ScraperData): CronJob => {
        const axiosInstance: AxiosInstance = this.axiosInstance;
        return new CronJob(data.cronTime, async function() {

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

        }, null, true, 'Asia/Bangkok');
    }

    private writeFile = (): void => {
        if(this.isChange){
            fs.writeFileSync(SCRAPER_FILE, jsonStringify(this.scraperData));
            console.log(`${SCRAPER_FILE} write`);
            this.isChange = false;
        }
        setTimeout(this.writeFile, 5000)
    }

}