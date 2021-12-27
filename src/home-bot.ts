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

const config: line.MiddlewareConfig & line.ClientConfig = {
    channelAccessToken: CHANNEL_ACCESS_TOKEN,
    channelSecret: CHANNEL_SECRET
};

const app: Express = express();


// Certificate
const privateKey: string = fs.readFileSync(`${CERT_PATH}/privkey.pem`, 'utf8');
const certificate: string = fs.readFileSync(`${CERT_PATH}/cert.pem`, 'utf8');
const ca: string = fs.readFileSync(`${CERT_PATH}/chain.pem`, 'utf8');

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

    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: event.message.text
    });
}

// Starting both http & https servers
const httpServer: http.Server = http.createServer(app);
const httpsServer: http.Server = https.createServer(credentials, app);

httpServer.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});