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
    const message: string = event.message.text;

    if(message.includes('แจ้งเตือน') || message.includes('เพิ่มรายการ')) {
        const messages: Array<string> = message.split('-');
        if(messages.length != 3) {
            return reply(replyToken, 'incorrect fotmat: เพิ่มรายการ-ชื่อรายการ-รายละเอียด');
        }

        if(!memory[id]){
            memory[id] = {};
        }

        if(!memory[id][messages[1]]){
            memory[id][messages[1]] = [];
        }

        memory[id][messages[1]].push(messages[2]);
        return reply(replyToken, 'บันทึกเรียบร้อย');
    }
    else if(message.includes('แสดงรายการ')) {
        const messages: Array<string> = message.split('-');
        if(messages.length != 2) {
            return reply(replyToken, 'incorrect fotmat: แสดงรายการ-ชื่อรายการ');
        }

        return reply(replyToken, jsonStringify(memory[id][messages[1]]));
    }

    else if(message.includes('ลบรายการ')) {
        const messages: Array<string> = message.split('-');
        if(messages.length != 3 || !parseInt(messages[2])) {
            return reply(replyToken, 'incorrect fotmat: ลบรายการ-ชื่อรายการ-ลำดับรายการ');
        }

        memory[id][messages[1]].splice(parseInt(messages[2]) - 1, 1);
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