import { ScraperNotifyEnum } from "./enums";
import * as line from '@line/bot-sdk';
import { CronCommand } from "cron";

export interface ReminderData {
    cronTime: string | Date;
    message: string;
    raw: boolean;
}

export interface ScraperData {
    cronTime: string | Date;
    url: string;
    element: string;
    notifyWhen: ScraperNotifyEnum;
}

export type CronData = ReminderData | ScraperData;

export type HandlerFn = (id: string, replyToken: string, text?: string) => Promise<line.MessageAPIResponseBase>;

export type CronFn = (id: string, data: CronData) => CronCommand;

export interface Action {
    keyword: string,
    syntax: string,
    fn: HandlerFn,
}

export interface DeviceData {
    userId: string,
    data: Array<string>
}

export interface LineNotifyResponse {
    status: number;
    message: string;
}

export interface LineSticker {
    packageId: string;
    stickerId: string;
}

export interface GetContentParams {
    hash: string;
    contentType: string;
    filename: string;
}