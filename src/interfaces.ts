import { ScraperNotifyEnum } from "./handlers/enums";

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