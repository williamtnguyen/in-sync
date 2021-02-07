import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';
import { createClientNotifier, createPlaylistItem, createUserMessage } from './socket-notifier';

const socketHandler = (io: WebSocketServer) => {
  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`New socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');
      const { roomId, clientId, clientName, youtubeID } = clientData;
      socket.join(roomId);

      Rooms.addRoom(roomId, youtubeID);
      Rooms.addClient(roomId, clientId, clientName);
      // tslint:disable-next-line: no-console
      Rooms.getRoomClients(roomId).forEach((client) => { console.log(client); });

      socket.broadcast
        .to(roomId)
        .emit('notifyClient', createClientNotifier('clientJoin', { roomId, clientId, clientName }));

      io.to(roomId).emit('updateClientList', Rooms.getRoomClients(roomId));

      if (!youtubeID) {
        const room = Rooms.getRoom(roomId);
        socket.emit(
          'notifyClient',
          createClientNotifier('CHANGE_VIDEO', {
            youtubeID: room.youtubeID
          })
        );
      }
    });

    socket.on('videoStateChange', (data) => {
      const client = Rooms.getClient(socket.id);
      socket.broadcast.to(
        Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createClientNotifier('updateVideoState', {
            type: data.type,
            ...data.payload,
            client: {
              name: client.name,
              socketId: socket.id
            }
          })
        );
    });

    socket.on('newMessage', (message) => {
      const client = Rooms.getClient(socket.id);
      if (client) {
        io.to(
          Rooms.getClientRoomId(client.id)).emit(
            'notifyClient',
            createUserMessage(client.name, client.id, message)
          );
      }
    });

    socket.on('updatePlaylist', (imgURL, youtubeId) => {
      
      console.log('updatePlaylist triggered', {imgURL, youtubeId});
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const room = Rooms.getRoom(roomId)
      if (client){
        io.to(
          Rooms.getClientRoomId(client.id)).emit(
            'notifyClient',
            createClientNotifier('CHANGE_VIDEO', {
              playlist : room.playlist
            })
          );
          Rooms.updatePlaylist(roomId, youtubeId);      
        }
    });

    // socket.on('nextVideo', (youtubeId) => {
    //   const client = Rooms.getClient(socket.id);
    //   const roomId = Rooms.getClientRoomId(client.id);
    //   const room = Rooms.getRoom(roomId);
    //   io.to(
    //     Rooms.getClientRoomId(client.id)).emit(
    //       'notifyClient',
    //       createClientNotifier('NEXT_VIDEO', {
    //         playlist : room.playlist
    //       })
    //     );
        
    //     Rooms.setVideoLink(roomId, youtube)

    // });

  });
};

export default socketHandler;
