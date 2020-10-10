import express, { Application } from 'express';
import http, { Server } from 'http';
import socketIO, { Server as WebSocketServer } from 'socket.io';
import socketHandler from './util/socket-events';

const app: Application = express();
const server: Server = http.createServer(app);
const io: WebSocketServer = socketIO(server);
socketHandler(io);

const PORT: string | number = process.env.PORT || 5000;
// tslint:disable-next-line: no-console
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
