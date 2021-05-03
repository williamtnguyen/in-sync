import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';
import {
  createClientNotifier,
  createPlaylistItem,
  createUserMessage,
  deletePlaylistItem,
  movePlaylistItem,
} from './socket-notifier';

/**
 * Attaches event listeners to socket instance
 */
async function attachSocketEvents(io: WebSocketServer) {
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`\nNew socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', async (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');
      const {
        roomId,
        clientId,
        clientName,
        youtubeID,
        roomType,
        canJoin,
      } = clientData;
      if (canJoin) {
        socket.join(roomId);

        Rooms.addRoom(roomId, youtubeID, roomType);
        Rooms.addClient(roomId, clientId, clientName);

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
        io.to(roomId).emit(
          'notifyClient',
          createUserMessage(null, clientId, `${clientName} entered`)
        );

        if (!youtubeID) {
          socket.emit(
            'notifyClient',
            createClientNotifier('clientJoin', {
              roomId,
              clientId,
              clientName,
            })
          );
        }
      }
    });

    // -------------------------- YOUTUBE EVENTS --------------------------
    socket.on('videoStateChange', (data) => {
      const client = Rooms.getClient(socket.id);
      let message = `${client.name} `;
      switch (data.type) {
        case 'PLAY_VIDEO':
          message += 'started the video';
          break;
        case 'PAUSE_VIDEO':
          message += 'paused the video';
          break;
      }

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
      io.to(Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    // -------------------------- MESSAGING EVENTS --------------------------
    socket.on('newMessage', (message) => {
      const client = Rooms.getClient(socket.id);
      if (client) {
        io.to(Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createUserMessage(client.name, client.id, message)
        );
      }
    });

    // -------------------------- PLAYLIST EVENTS --------------------------
    socket.on('addToPlaylist', (youtubeId) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const message = `${client.name} added a new video`;

      Rooms.addVideo(roomId, youtubeId);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      if (client) {
        io.to(roomId).emit('notifyClient', createPlaylistItem(newPlaylist));
        io.to(Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createUserMessage(null, client.id, message)
        );
      }
    });

    socket.on('deletePlaylistItem', (videoIndex: number) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const message = `${client.name} deleted a playlist item`;

      Rooms.deleteVideo(roomId, videoIndex);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      if (client) {
        io.to(roomId).emit('notifyClient', deletePlaylistItem(newPlaylist));
        io.to(Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createUserMessage(null, client.id, message)
        );
      }
    });

    socket.on('changeVideo', (videoIndex: number) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const youtubeID = Rooms.changeVideo(roomId, videoIndex);
      const message = `${client.name} changed the video`;

      io.to(roomId).emit(
        'notifyClient',
        createClientNotifier('CHANGE_VIDEO', {
          youtubeID,
        })
      );
      io.to(Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    socket.on('insertVideoAtIndex', ({ oldIndex, newIndex }) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const message = `${client.name} swapped playlist item #${
        oldIndex + 1
      } with item #${newIndex + 1}`;

      Rooms.moveVideo(roomId, oldIndex, newIndex);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      io.to(roomId).emit('notifyClient', movePlaylistItem(newPlaylist));
      io.to(Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    // -------------------------- WAITING ROOM EVENTS --------------------------
    socket.on(
      'getRoomType',
      async (
        { clientName, roomId }: { clientName: string; roomId: string },
        admitClient: () => Promise<void>
      ) => {
        const room = Rooms.getRoom(roomId);
        const roomType = room.roomType;
        if (roomType === 'private') {
          // Update waiting clients and list in the room
          room.waitingClients = {
            ...room.waitingClients,
            [socket.id]: clientName,
          };
          Rooms.addToWaitingList(socket.id, roomId);

          io.to(room.hostId).emit('waitingClient', {
            waitingClients: room.waitingClients,
          });
        } else {
          await admitClient();
        }
      }
    );

    socket.on(
      'waitingResponse',
      ({ socketId, status }: { socketId: string; status: string }) => {
        if (status === 'accept') Rooms.removeFromWaiting(socketId);
        io.to(socketId).emit(status);
      }
    );

    // -------------------------- OTHER EVENTS --------------------------
    socket.on('mute', ({ id }) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const newClients = Rooms.updateMute(id, roomId);
      let message = `${client.name} `;
      client.isMuted ? (message += 'muted') : (message += 'unmuted');

      io.to(roomId).emit('updateClientList', newClients);
      io.to(Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    socket.on('disconnect', () => {
      if (!Rooms.isInWaitingList(socket.id)) {
        const client = Rooms.getClient(socket.id);
        if (client === undefined) return;
        const roomId = Rooms.getClientRoomId(client.id);
        const room = Rooms.getRoom(roomId);

        // Choose the next host if the socket that's disconnecting is the host
        if (socket.id === room.hostId) {
          if (room.clients.length - 1 !== 0) {
            room.hostId = room.clients[1].id;
            socket
              .to(roomId)
              .emit('newHost', room.clients[1].name, room.hostId);
            io.to(room.hostId).emit('updateWaitingClients', {
              waitingClientList: room.waitingClients,
              clientIdLeft: '',
            });
          } else {
            Rooms.closeRoom(roomId);
            return;
          }
        }
        const newClientList = Rooms.removeClient(roomId, socket.id);
        const message = `${client.name} left`;
        io.to(roomId).emit('updateClientList', newClientList);
        io.to(Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createUserMessage(null, client.id, message)
        );
      } else {
        const roomId = Rooms.getWaitingClientRoomId(socket.id);
        Rooms.removeFromWaiting(socket.id);
        const room = Rooms.getRoom(roomId);

        io.to(room.hostId).emit('updateWaitingClients', {
          waitingClientList: room.waitingClients,
          clientIdLeft: socket.id,
        });
      }
    });
  });
}

export default attachSocketEvents;
