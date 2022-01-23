import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CronCommand } from 'cron';
import { AdditionalAction, CronFn, DeviceData, DeviceDataRequest, DeviceDataResponse } from '../interfaces';
import { jsonStringify } from '../utils';
import * as line from '@line/bot-sdk';
import lineBotClient from '../line-bot-client';
import BaseHandler from './base-handler';

class DeviceHandler extends BaseHandler{

    protected isCronData: boolean = true;
    protected filePath: string = process.env.DEVICE_MANAGER_FILE;

    protected additionalActions: Array<AdditionalAction> = [
        {
            keyword: 'แสดงรายการอุปกรณ์',
            syntax: 'แสดงรายการอุปกรณ์',
            fn: async (id: string, replyToken: string): Promise<line.MessageAPIResponseBase> => {
                const data: Array<DeviceData> = <Array<DeviceData>> this.cronData[id];
                return lineBotClient.replyMessage(replyToken, jsonStringify(data));
            }
        },
        {
            keyword: 'ตรวจสอบอุปกรณ์',
            syntax: 'ตรวจสอบอุปกรณ์',
            fn: async (id: string, replyToken: string): Promise<line.MessageAPIResponseBase> => {
                const data: Array<DeviceData> = <Array<DeviceData>> this.cronData[id];

                for(const d of data){
                    const reqeust: DeviceDataRequest = {
                        ping_urls: Object.keys(d.local_devices)
                    };
                    const axiosResponse: AxiosResponse<Array<DeviceDataResponse>> = await this.axiosInstance.post(d.local_server_url, reqeust);

                    return lineBotClient.replyMessage(replyToken, jsonStringify(axiosResponse.data));
                }
            }
        }
    ];

    protected cronFn: CronFn = (id: string, data: DeviceData): CronCommand => {
        const axiosInstance: AxiosInstance = this.axiosInstance;
        return async (): Promise<void> => {

            const reqeust: DeviceDataRequest = {
                ping_urls: Object.keys(data.local_devices)
            };
            const axiosResponse: AxiosResponse<Array<DeviceDataResponse>> = await axiosInstance.post(data.local_server_url, reqeust);

            const deviceDataResponses: Array<DeviceDataResponse> = axiosResponse.data;
            deviceDataResponses.forEach(device => {
                console.log(device);
                if(!device.alive) {
                    const deviceName: string = data.local_devices[device.host];
                    lineBotClient.pushMessage(id, `${deviceName} is down`);
                }
            });
        }
    };

    private readonly axiosInstance: AxiosInstance = axios.create({
        headers: {
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
        }
    });
}

const instance: DeviceHandler = new DeviceHandler();
instance.setup();
export default instance;