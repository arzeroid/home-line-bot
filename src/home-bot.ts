require('dotenv').config();

// Dependencies
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import {Express} from 'express-serve-static-core';
import {SecureContextOptions} from 'node:tls';
import * as line from '@line/bot-sdk';

const CERT_PATH: string = process.env.CERT_PATH;
const CHANNEL_ACCESS_TOKEN: string = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET: string = process.env.CHANNEL_SECRET;
const RESOURCE_FILE: string = process.env.RESOURCE_FILE;

const config: line.MiddlewareConfig & line.ClientConfig = {
    channelAccessToken: CHANNEL_ACCESS_TOKEN,
    channelSecret: CHANNEL_SECRET
};

const app: Express = express();

// Certificate
const privateKey: string = fs.readFileSync(`${CERT_PATH}/privkey.pem`, 'utf8');
const certificate: string = fs.readFileSync(`${CERT_PATH}/cert.pem`, 'utf8');
const ca: string = fs.readFileSync(`${CERT_PATH}/chain.pem`, 'utf8');

const rawdata: string = fs.readFileSync(RESOURCE_FILE, {encoding: 'utf8'});
const memory: NodeJS.Dict<NodeJS.Dict<Array<string>>> = JSON.parse(rawdata);

const credentials: SecureContextOptions = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.get('/', (req, res) => {
	res.send('Hello there !');
});

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

const client = new line.Client(config);
function handleEvent(event: line.WebhookEvent) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    const source: line.EventSource = event.source;
    let id: string = null;
    if(source.type == 'user') {
        id = source.userId;
    }
    else if(source.type == 'group') {
        id = source.groupId;
    }

    const replyToken: string = event.replyToken;
    let message: string = event.message.text;

    if(message.startsWith('เพิ่มรายการ')) {
        message = message.substring('เพิ่มรายการ'.length);
        const messages: Array<string> = message.split(':');
        if(messages.length != 2) {
            return reply(replyToken, 'incorrect fotmat: เพิ่มรายการ<ชื่อรายการ>:รายละเอียด');
        }

        message = messages[2].trim();
        if(message.length == 0) {
            return reply(replyToken, 'incorrect fotmat: รายละเอียดต้องมีข้อมูล');
        }

        if(!memory[id]){
            memory[id] = {};
        }

        if(!memory[id][messages[1]]){
            memory[id][messages[1]] = [];
        }

        memory[id][messages[1]].push(message);
        return reply(replyToken, 'บันทึกเรียบร้อย');
    }
    else if(message.startsWith('แสดงรายการ')) {
        message = message.substring('แสดงรายการ'.length);
        if(message.length < 0) {
            return reply(replyToken, 'incorrect fotmat: แสดงรายการ<ชื่อรายการ>');
        }

        if(!memory[id][message]){
            return reply(replyToken, jsonStringify([]));
        }

        const list: NodeJS.Dict<string> = {};
        const messages: Array<string> = memory[id][message];
        for(let index in messages){
            list[`${index}`] = messages[index];
        }

        return reply(replyToken, jsonStringify(memory[id][message]));
    }

    else if(message.startsWith('ลบรายการ')) {
        message = message.substring('ลบรายการ'.length);
        const messages: Array<string> = message.split(':');
        if(messages.length != 2 || !parseInt(messages[1])) {
            return reply(replyToken, 'incorrect fotmat: ลบรายการ<ชื่อรายการ>:ลำดับรายการ');
        }

        if(!memory[id] || !memory[id][messages[1]]){
            return reply(replyToken, 'ไม่พบชื่อรายการที่ระบุ');
        }

        memory[id][messages[1]].splice(parseInt(messages[1]) - 1, 1);
        return reply(event.replyToken, 'ลบเรียบร้อย');
    }

    else {
        reply(event.replyToken, message);
    }
}

function jsonStringify(data: object): string {
    return JSON.stringify(data, null, 4);
}

function reply(replyToken: string, text: string) {
    return client.replyMessage(replyToken, {
        type: 'text',
        text: text
    });
}

setTimeout(()=> {
    fs.writeFileSync(RESOURCE_FILE, jsonStringify(memory));
}, 3600000)

// Starting both http & https servers
const httpServer: http.Server = http.createServer(app);
const httpsServer: http.Server = https.createServer(credentials, app);

httpServer.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});