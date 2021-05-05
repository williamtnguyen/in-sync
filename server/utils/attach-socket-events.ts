import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';
import {
  createClientNotifier,
  createPlaylistItem,
  createUserMessage,
  deletePlaylistItem,
  movePlaylistItem,
} from './socket-notifier';
import redisClients from './redis-clients';
const { roomStateClient } = redisClients;

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

        await Rooms.addRoom(roomId, youtubeID, roomType);
        await Rooms.addClient(roomId, clientId, clientName);

        // TODO: not sure if this is listened to on client side
        socket.broadcast.to(roomId).emit(
          'notifyClient',
          createClientNotifier('clientJoin', {
            roomId,
            clientId,
            clientName,
          })
        );

        io.to(roomId).emit(
          'updateClientList',
          await Rooms.getRoomClients(roomId)
        );
        io.to(roomId).emit(
          'updatePlaylist',
          await Rooms.getPlaylistVideoIds(roomId)
        );
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
    socket.on('videoStateChange', async (data) => {
      const client = await Rooms.getClient(socket.id);
      let message = `${client.name} `;
      switch (data.type) {
        case 'PLAY_VIDEO':
          message += 'started the video';
          break;
        case 'PAUSE_VIDEO':
          message += 'paused the video';
          break;
      }

      socket.broadcast.to(await Rooms.getClientRoomId(client.id)).emit(
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
      io.to(await Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    // -------------------------- MESSAGING EVENTS --------------------------
    socket.on('newMessage', async (message) => {
      const client = await Rooms.getClient(socket.id);
      if (client) {
        io.to(await Rooms.getClientRoomId(client.id)).emit(
          'notifyClient',
          createUserMessage(client.name, client.id, message)
        );
      }
    });

    // -------------------------- PLAYLIST EVENTS --------------------------
    socket.on('addToPlaylist', async (youtubeId) => {
      const client = await Rooms.getClient(socket.id);
      const roomId = await Rooms.getClientRoomId(client.id);
      const message = `${client.name} added a new video`;

      await Rooms.addVideo(roomId, youtubeId);
      const newPlaylist: string[] = await Rooms.getPlaylistVideoIds(roomId);

      if (client) {
        io.to(roomId).emit('notifyClient', createPlaylistItem(newPlaylist));
        // io.to(Rooms.getClientRoomId(client.id)).emit(
        io.to(roomId).emit(
          'notifyClient',
          createUserMessage(null, client.id, message)
        );
      }
    });

    socket.on('deletePlaylistItem', async (videoIndex: number) => {
      const client = await Rooms.getClient(socket.id);
      const roomId = await Rooms.getClientRoomId(client.id);
      const message = `${client.name} deleted a playlist item`;

      Rooms.deleteVideo(roomId, videoIndex);
      const newPlaylist: string[] = await Rooms.getPlaylistVideoIds(roomId);

      if (client) {
        io.to(roomId).emit('notifyClient', deletePlaylistItem(newPlaylist));
        // io.to(Rooms.getClientRoomId(client.id)).emit(
        io.to(roomId).emit(
          'notifyClient',
          createUserMessage(null, client.id, message)
        );
      }
    });

    socket.on('changeVideo', async (videoIndex: number) => {
      const client = await Rooms.getClient(socket.id);
      const roomId = await Rooms.getClientRoomId(client.id);
      const youtubeID = await Rooms.changeVideo(roomId, videoIndex);
      const message = `${client.name} changed the video`;

      io.to(roomId).emit(
        'notifyClient',
        createClientNotifier('CHANGE_VIDEO', {
          youtubeID,
        })
      );
      // io.to(Rooms.getClientRoomId(client.id)).emit(
      io.to(roomId).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    socket.on('insertVideoAtIndex', async ({ oldIndex, newIndex }) => {
      const client = await Rooms.getClient(socket.id);
      const roomId = await Rooms.getClientRoomId(client.id);
      const message = `${client.name} swapped playlist item #${
        oldIndex + 1
      } with item #${newIndex + 1}`;

      await Rooms.moveVideo(roomId, oldIndex, newIndex);
      const newPlaylist: string[] = await Rooms.getPlaylistVideoIds(roomId);

      io.to(roomId).emit('notifyClient', movePlaylistItem(newPlaylist));
      // io.to(Rooms.getClientRoomId(client.id)).emit(
      io.to(roomId).emit(
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
        const room = await Rooms.getRoom(roomId);
        const roomType = room.roomType;
        if (roomType === 'private') {
          // Update waiting clients and list in the room
          room.waitingClients = {
            ...room.waitingClients,
            [socket.id]: clientName,
          };
          roomStateClient.SET(roomId, JSON.stringify(room));
          Rooms.mapClientIdToRoomId(socket.id, roomId);

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
      async ({ socketId, status }: { socketId: string; status: string }) => {
        if (status === 'accept') await Rooms.removeFromWaiting(socketId);
        io.to(socketId).emit(status);
      }
    );

    // -------------------------- OTHER EVENTS --------------------------
    socket.on('mute', async ({ id }) => {
      const client = await Rooms.getClient(socket.id);
      const roomId = await Rooms.getClientRoomId(client.id);
      const newClients = await Rooms.updateMute(id, roomId);
      let message = `${client.name} `;
      client.isMuted ? (message += 'muted') : (message += 'unmuted');

      io.to(roomId).emit('updateClientList', newClients);
      // io.to(Rooms.getClientRoomId(client.id)).emit(
      io.to(roomId).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    socket.on('disconnect', async () => {
      if (!(await Rooms.isInWaitingList(socket.id))) {
        const client = await Rooms.getClient(socket.id);
        if (client === undefined) return;
        const roomId = await Rooms.getClientRoomId(client.id);
        const room = await Rooms.getRoom(roomId);

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
            // i think the 1 client is not removed from client->roomId mapping here
            return Rooms.closeRoom(roomId);
          }
        }
        const newClientList = await Rooms.removeClient(roomId, socket.id);
        const message = `${client.name} left`;
        io.to(roomId).emit('updateClientList', newClientList);
        // io.to(Rooms.getClientRoomId(client.id)).emit(
        io.to(roomId).emit(
          'notifyClient',
          createUserMessage(null, client.id, message)
        );
      } else {
        const roomId = await Rooms.getWaitingClientRoomId(socket.id);
        await Rooms.removeFromWaiting(socket.id);
        const room = await Rooms.getRoom(roomId);

        io.to(room.hostId).emit('updateWaitingClients', {
          waitingClientList: room.waitingClients,
          clientIdLeft: socket.id,
        });
      }
    });
  });
}

export default attachSocketEvents;
