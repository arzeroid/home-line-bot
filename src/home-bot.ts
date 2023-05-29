require('dotenv').config();

import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import { Express } from 'express-serve-static-core';
import { SecureContextOptions } from 'node:tls';
import * as line from '@line/bot-sdk';
import lineBotClient from './line-bot-client';
import reminderHandler from './handlers/reminder-handler';
import memoryHandler from './handlers/memory-handler';
import scraperHandler from './handlers/scraper-handler';
import BaseHandler from './handlers/base-handler';
import { jsonStringify } from './utils';

const app: Express = express();

app.get('/', (req, res) => {
    res.send('Hello there !!!');
});

app.post('/webhook', line.middleware(lineBotClient.config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

function handleEvent(event: line.WebhookEvent) {

    console.log(jsonStringify(event));

    if (event.type !== 'message' || (event.message.type !== 'text')) {
        return Promise.resolve(null);
    }

    const handlers: Array<BaseHandler> = [
        memoryHandler,
        reminderHandler,
        scraperHandler
    ];

    const promises: Array<Promise<line.MessageAPIResponseBase>> = handlers.map(handler => handler.handle(event));

    return Promise.all(promises);
}

const HTTP_MODE: string = process.env.HTTP_MODE;
const CERT_PATH: string = process.env.CERT_PATH;

// Starting both http & https servers

const httpServer: http.Server = http.createServer(app);
httpServer.listen(80, () => {
    console.log('HTTP Server running on port 80');
});

if (HTTP_MODE == 'HTTPS') {
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
    });
}