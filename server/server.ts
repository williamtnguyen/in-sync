import express, { Application } from 'express';
import http, { Server as HttpServer } from 'http';
import { Server as WebSocketServer } from 'socket.io';
import attachSocketEvents from './utils/attach-socket-events';
import { createAdapter } from 'socket.io-redis';
import redisClients from './utils/redis-clients';

const app: Application = express();
const server: HttpServer = http.createServer(app);
const io: WebSocketServer = new WebSocketServer(server, {
  serveClient: false,
  cors: {
    methods: ['GET', 'PATCH', 'POST', 'PUT'],
    origin: true,
  },
});
io.adapter(
  createAdapter({
    pubClient: redisClients.adapterPubClient,
    subClient: redisClients.adapterSubClient,
  })
);
attachSocketEvents(io);

const PORT: string | number = process.env.PORT || 5000;
server.listen(PORT, () =>
  // tslint:disable-next-line: no-console
  console.log(`🚀 Session Server running on port ${PORT}`)
);
