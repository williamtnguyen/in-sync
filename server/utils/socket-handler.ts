import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';
import {
  createClientNotifier,
  createPlaylistItem,
  createUserMessage,
  deletePlaylistItem,
  movePlaylistItem,
} from './socket-notifier';

const socketHandler = (io: WebSocketServer) => {
  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`\nNew socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');
      const { roomId, clientId, clientName, youtubeID } = clientData;
      socket.join(roomId);

      Rooms.addRoom(roomId, youtubeID);
      Rooms.addClient(roomId, clientId, clientName);
      Rooms.getRoomClients(roomId).forEach((client) => {
        // tslint:disable-next-line: no-console
        console.log(client);
      });

      // TODO: not sure if this is listened to on client side
      socket.broadcast.to(roomId).emit(
        'notifyClient',
        createClientNotifier('clientJoin', {
          roomId,
          clientId,
          clientName,
        })
      );

      io.to(roomId).emit('updateClientList', Rooms.getRoomClients(roomId));
      io.to(roomId).emit('updatePlaylist', Rooms.getPlaylistVideoIds(roomId));

      // TODO: refactor logic without youtubeID in general
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

      Rooms.addVideo(roomId, youtubeId);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      if (client) {
        io.to(roomId).emit('notifyClient', createPlaylistItem(newPlaylist));
      }
    });

    socket.on('deletePlaylistItem', (videoIndex: number) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);

      Rooms.deleteVideo(roomId, videoIndex);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      if (client) {
        io.to(roomId).emit('notifyClient', deletePlaylistItem(newPlaylist));
      }
    });

    socket.on('changeVideo', (videoIndex: number) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const youtubeID = Rooms.changeVideo(roomId, videoIndex);
      io.to(roomId).emit(
        'notifyClient',
        createClientNotifier('CHANGE_VIDEO', {
          youtubeID,
        })
      );
    });

    socket.on('insertVideoAtIndex', ({ oldIndex, newIndex }) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);

      Rooms.moveVideo(roomId, oldIndex, newIndex);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      io.to(roomId).emit('notifyClient', movePlaylistItem(newPlaylist));
    });

    socket.on('disconnect', () => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const newClientList = Rooms.removeClient(roomId, socket.id);
      io.to(roomId).emit('updateClientList', newClientList);
    });
  });
};

export default socketHandler;
