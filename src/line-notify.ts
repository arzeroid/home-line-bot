import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as qs from 'querystring';
import { LineNotifyResponse } from './interfaces';

const HOME_BOT_TOKEN: string = process.env.HOME_BOT_TOKEN;

class LineNotify {

    private readonly axiosInstance: AxiosInstance = axios.create({
        baseURL: 'https://notify-api.line.me/api/',
        headers: {
            'Authorization': `Bearer ${HOME_BOT_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    public sendMessage = async (message: string): Promise<LineNotifyResponse> => {

        const data = {
            message: message
        };
        console.log(message);

        const response: AxiosResponse<LineNotifyResponse> = await this.axiosInstance.post('notify', qs.stringify(data));
        console.log(response.data);
        return response.data;
    }
}

export default new LineNotify();