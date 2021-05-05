import express, { Application } from 'express';
import http, { Server } from 'http';
import { Server as WebSocketServer } from 'socket.io';
import attachSocketEvents from './utils/attach-socket-events';

const app: Application = express();
const server: Server = http.createServer(app);
const io: WebSocketServer = require('socket.io')(server, {
  serveClient: false,
  cors: {
    methods: ['GET', 'PATCH', 'POST', 'PUT'],
    origin: true,
  },
});
attachSocketEvents(io);

const PORT: string | number = process.env.PORT || 4000;
server.listen(PORT, () =>
  // tslint:disable-next-line: no-console
  console.log(`🔊 Voice Server running on port ${PORT}`)
);
