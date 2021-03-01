import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';
import { createClientNotifier, createPlaylistItem, createUserMessage, deletePlaylistItem } from './socket-notifier';

const socketHandler = (io: WebSocketServer) => {
  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`\nNew socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');
      const { roomId, oldClientId, newClientId, clientName, youtubeID } = clientData;
      socket.join(roomId);

      Rooms.addRoom(roomId, youtubeID);
      if (oldClientId) Rooms.updateClientId(roomId, oldClientId, newClientId);
      Rooms.addClient(roomId, newClientId, clientName);
      Rooms.getRoomClients(roomId).forEach((client) => {
        // tslint:disable-next-line: no-console
        console.log(client);
      });

      socket.broadcast
        .to(roomId)
        .emit(
          'notifyClient',
          createClientNotifier('clientJoin', { roomId, newClientId, clientName })
        );

      io.to(roomId).emit('updateClientList', Rooms.getRoomClients(roomId));
      io.to(roomId).emit('updatePlaylist', Rooms.getRoom(roomId).playlist.getPlayListIds());

      if (!youtubeID) {
        const room = Rooms.getRoom(roomId);
        socket.emit(
          'notifyClient',
          createClientNotifier('CHANGE_VIDEO', {
            youtubeID: room.youtubeID,
          })
        );
      }
    });

    socket.on('videoStateChange', (data) => {
      const client = Rooms.getClient(socket.id);
      socket.broadcast.to(Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createClientNotifier('updateVideoState', {
          type: data.type,
          ...data.payload,
          client: {
            name: client.name,
            socketId: socket.id,
          },
        })
      );
    });

    socket.on('newMessage', (message) => {
      const client = Rooms.getClient(socket.id);
      if (client) {
        io.to(Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createUserMessage(client.name, client.id, message)
        );
      }
    });

    socket.on('addToPlaylist', (youtubeId) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      if (client) {
        io.to(roomId).emit(
            'notifyClient',
            createPlaylistItem(youtubeId)
          );
        Rooms.updatePlaylist(roomId, youtubeId);
      }
    });

    socket.on('deletePlaylistItem', (youtubeId) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const room = Rooms.getRoom(roomId);

      room.playlist.deleteVideo(youtubeId);
      const newPlaylist: string[] = room.playlist.getPlayListIds();

      if (client) {
        io.to(roomId).emit(
            'notifyClient',
            deletePlaylistItem(newPlaylist)
          );
      }
    });

    socket.on('changeVideo', (youtubeId) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      io.to(
        Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createClientNotifier('CHANGE_VIDEO', {
            youtubeID: youtubeId
          })
        );
      Rooms.changeVideo(roomId, youtubeId);
    });

  });
};

export default socketHandler;
