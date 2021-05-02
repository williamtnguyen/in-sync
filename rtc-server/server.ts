import express, { Application } from 'express';
import http, { Server } from 'http';
import socketIo, { Server as WebSocketServer } from 'socket.io';
import attachSocketEvents from './utils/socket-events';

const app: Application = express();
const server: Server = http.createServer(app);
const io: WebSocketServer = socketIo(server, { serveClient: false });
attachSocketEvents(io);

const PORT: string | number = process.env.PORT || 4000;
// tslint:disable-next-line: no-console
server.listen(PORT, () =>
  console.log(`🔊 Voice Server running on port ${PORT}`)
);
