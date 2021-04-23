import express, { Application } from 'express';
import http, { Server } from 'http';
import socketIo, { Server as WebSocketServer } from 'socket.io';
import socketHandler from './utils/socket-handler';
const https = require('httpolyglot');
// const { Server } = https;
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.join(__dirname,'./ssl/key.pem'), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname,'./ssl/cert.pem'), 'utf-8'),
  serveClient: false
};

const app: Application = express();
const server: typeof Server = https.createServer(options, app);
// const server: Server = http.createServer(app);
// const io: WebSocketServer = socketIo(server, { serveClient: false });
const io: WebSocketServer = socketIo(server, { serveClient: false });
socketHandler(io);

const PORT: string | number = process.env.PORT || 5000;
// tslint:disable-next-line: no-console
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
