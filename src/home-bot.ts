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
import contentHandler from './handlers/content-handler';
import BaseHandler from './handlers/base-handler';
import * as path from 'path';
import { GetContentParams } from './interfaces';
import * as md5 from 'js-md5';
import moment = require('moment');

const app: Express = express();

// for line to get content when bot reply once
app.get('/contents/:contentType/:filename/:hash', (req, res, next) => {
    const params: GetContentParams = req.params;

    console.log(params);

    if (moment().isBefore(contentHandler.timeout) && md5(contentHandler.seed + process.env.ADMIN_ID)) {
        res.sendFile(path.join(__dirname, '../contents', params.contentType, params.filename))
    }
    else {
        next();
    }
});

app.get('/', (req, res) => {
    res.send('Hello there !!!');
});

app.post('/webhook', line.middleware(lineBotClient.config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

function handleEvent(event: line.WebhookEvent) {

    // console.log(jsonStringify(event));

    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    if (event.message.type == 'text') {
        const handlers: Array<BaseHandler> = [
            memoryHandler,
            reminderHandler,
            scraperHandler,
            contentHandler
        ];

        const promises: Array<Promise<line.MessageAPIResponseBase>> = handlers.map(handler => handler.handle(event));

        return Promise.all(promises);
    }

    if (event.source.userId == process.env.ADMIN_ID) {
        return contentHandler.handleContent(event);
    }
}

app.get('*', function (req, res) {
    res.sendStatus(404);
});

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