import axios, { AxiosInstance, AxiosResponse } from 'axios';
import cheerio, { CheerioAPI } from 'cheerio';
import { CronJob } from 'cron';
import { Action, CronFn, HandlerFn, ScraperData } from '../interfaces';
import { jsonStringify } from '../utils';
import lineBotClient from '../line-bot-client';
import { ScraperNotifyEnum } from '../enums';
import BaseHandler from './base-handler';

class ScraperHandler extends BaseHandler {

    protected isCronData: boolean = true;
    protected handlerName: string = 'ScraperHandler';
    protected filePath: string = process.env.SCRAPER_FILE;

    protected addFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split('$');
        if (messages.length != 4) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const url: string = messages[0].trim();
        const element: string = messages[1].trim();
        const notifyWhen: string = messages[2].trim();
        const cronTime: string = messages[3].trim();

        if (url.length == 0 ||
            element.length == 0 ||
            ScraperNotifyEnum[notifyWhen] == undefined ||
            cronTime.length == 0 ||
            cronTime.split(' ').length < 5
        ) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (!this.cronData[id]) {
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

    protected showFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        if (text.length != 0) {
            return this.replyIncorrectSyntax(replyToken);
        }

        const list: NodeJS.Dict<ScraperData> = {};
        if (this.cronData[id]) {
            const messages: Array<ScraperData> = <Array<ScraperData>>this.cronData[id];
            for (let index in messages) {
                list[`${index}`] = messages[index];
            }
        }
        return lineBotClient.replyMessage(replyToken, jsonStringify(list));
    };

    protected cancelFn: HandlerFn = (id: string, replyToken: string, text: string) => {
        const messages: Array<string> = text.split(':');
        const index: number = parseInt(messages[1]);

        if (messages.length != 2 || isNaN(index)) {
            return this.replyIncorrectSyntax(replyToken);
        }

        if (this.cronData[id]) {
            this.cronData[id].splice(index, 1);
            this.jobs[id][index].stop();
            this.jobs[id].splice(index, 1);
            this.isChange = true;
        }
        return lineBotClient.replyMessage(replyToken, 'cancel monitor success');
    };

    protected cronFn: CronFn = (id: string, data: ScraperData) => {
        const axiosInstance: AxiosInstance = this.axiosInstance;
        return async (): Promise<void> => {

            const response: AxiosResponse<any> = await axiosInstance.get(data.url);
            const $: CheerioAPI = cheerio.load(response.data);

            switch (data.notifyWhen) {
                case ScraperNotifyEnum.EXISTS:
                    if ($(data.element).text() != undefined) {
                        lineBotClient.pushMessage(id, `พบ ${data.element} ใน ${data.url} แล้ว`);
                    }
                    break;
                case ScraperNotifyEnum.NOT_EXISTS:
                    if ($(data.element).text() == undefined) {
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

    protected actions: Array<Action> = [
        {
            keyword: 'monitor ',
            syntax: 'monitor <url>$<element>$<EXISTS|NOT_EXISTS|VALUE>$<crontime>',
            fn: this.addFn,
        },
        {
            keyword: 'show monitor',
            syntax: 'show monitor',
            fn: this.showFn,
        },
        {
            keyword: 'cancel monitor',
            syntax: 'cancel monitor:ลำดับรายการ',
            fn: this.cancelFn,
        }
    ];
}

const instance: ScraperHandler = new ScraperHandler();
instance.setup();
export default instance;