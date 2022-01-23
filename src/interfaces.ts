import { ScraperNotifyEnum } from "./enums";
import * as line from '@line/bot-sdk';
import { CronCommand } from "cron";

export interface ReminderData {
    cronTime: string | Date;
    message: string
}

export interface ScraperData {
    cronTime: string | Date;
    url: string
    element: string
    notifyWhen: ScraperNotifyEnum
}

export interface DeviceData {
    cronTime: string | Date;
    local_server_url: string;
    local_devices: NodeJS.Dict<string>;
}

export interface DeviceDataRequest {
    ping_urls: Array<string>
}

export interface DeviceDataResponse {
    host: string,
    alive: boolean,
    time: number | "unknown";
}

export type CronData = ReminderData | ScraperData | DeviceData;

export interface HandlerAction {
    add: HandlerActionData;
    show: HandlerActionData;
    cancel: HandlerActionData;
}

export interface HandlerActionData {
    keyword: string,
    syntax: string
}

export type HandlerFn = (id: string, replyToken: string, text?: string) => Promise<line.MessageAPIResponseBase>;
export type CronFn = (id: string, data: CronData) => CronCommand;

export interface AdditionalAction {
    keyword: string,
    syntax: string,
    fn: HandlerFn,
}