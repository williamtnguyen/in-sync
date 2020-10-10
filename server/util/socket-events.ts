import { Server as WebSocketServer, Socket } from 'socket.io';

const socketHandler = (io: WebSocketServer) => {
  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`New user connected: ${socket.id}`);
  });
};

export default socketHandler;
