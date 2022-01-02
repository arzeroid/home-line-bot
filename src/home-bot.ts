require('dotenv').config();

import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import {Express} from 'express-serve-static-core';
import {SecureContextOptions} from 'node:tls';
import * as line from '@line/bot-sdk';
import TextHandler from './text-handler';
import { HandlerResult } from './interfaces';
import { jsonStringify } from './utils';

const HTTP_MODE: string = process.env.HTTP_MODE;
const CERT_PATH: string = process.env.CERT_PATH;
const RESOURCE_FILE: string = process.env.RESOURCE_FILE;

const config: line.MiddlewareConfig & line.ClientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

const app: Express = express();

const rawdata: string = fs.readFileSync(RESOURCE_FILE, {encoding: 'utf8'});
const memory: NodeJS.Dict<NodeJS.Dict<Array<string>>> = JSON.parse(rawdata);

app.get('/', (req, res) => {
	res.send('Hello there !');
});

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

const client: line.Client = new line.Client(config);
let isChange: boolean = false;
function handleEvent(event: line.WebhookEvent) {

    console.log(jsonStringify(event));

    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    const replyToken: string = event.replyToken;
    const result: HandlerResult = new TextHandler(memory).handle(event);

    isChange ||= result.isChange;
    if(result.message) {
        reply(replyToken, result.message);
    }

}

function reply(replyToken: string, text: string) {
    return client.replyMessage(replyToken, {
        type: 'text',
        text: text
    });
}

function writeMemory() {
    if(isChange){
        fs.writeFileSync(RESOURCE_FILE, jsonStringify(memory));
        console.log('memory write');
        isChange = false;
    }
    setTimeout(writeMemory, 5000)
}

// Starting both http & https servers
if(HTTP_MODE == 'HTTP'){
    const httpServer: http.Server = http.createServer(app);
    httpServer.listen(80, () => {
        console.log('HTTP Server running on port 80');
        writeMemory();
    });
}
else if(HTTP_MODE == 'HTTPS') {
    // Certificate
    const privateKey: string = fs.readFileSync(`${CERT_PATH}/privkey.pem`, 'utf8');
    const certificate: string = fs.readFileSync(`${CERT_PATH}/cert.pem`, 'utf8');
    const ca: string = fs.readFileSync(`${CERT_PATH}/chain.pem`, 'utf8');

    const credentials: SecureContextOptions = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };

    const httpsServer: http.Server = https.createServer(credentials, app);
    httpsServer.listen(443, () => {
        console.log('HTTPS Server running on port 443');
        writeMemory();
    });
}