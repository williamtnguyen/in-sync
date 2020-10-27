import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';

const socketHandler = (io: WebSocketServer) => {
  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`New socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');
      const { roomId, clientId, clientName } = clientData;
      socket.join(roomId);

      Rooms.addRoom(roomId);
      Rooms.addClient(roomId, clientId, clientName);
      // tslint:disable-next-line: no-console
      Rooms.getRoomClients(roomId).forEach((client) => { console.log(client); });

      socket.broadcast
        .to(roomId)
        .emit('clientJoin', { roomId, clientId, clientName });

      io.to(roomId).emit('updateClientList', Rooms.getRoomClients(roomId));
    });
  });
};

export default socketHandler;
