import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';

const socketHandler = (io: WebSocketServer) => {
  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`New socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', (clientData) => {
      const { roomId, clientId, clientName } = clientData;
      socket.join(roomId);

      socket.broadcast
        .to(roomId)
        .emit('clientJoin', { roomId, clientId, clientName });

      Rooms.addRoom(roomId);
      Rooms.addClient(roomId, clientId, clientName);

      io.to(roomId).emit('updateClientList', Rooms.getRoomClients(roomId));
    });
  });
};

export default socketHandler;
