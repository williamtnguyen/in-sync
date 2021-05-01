import { Server as WebSocketServer, Socket } from 'socket.io';
import Rooms from './Rooms';
import {
  createClientNotifier,
  createPlaylistItem,
  createUserMessage,
  deletePlaylistItem,
  movePlaylistItem,
} from './socket-notifier';
import { types as mediasoupType } from 'mediasoup';

const mediasoup = require('mediasoup');
const mediasoupConfig = require('../mediasoup-config');

const socketHandler = async (io: WebSocketServer) => {
  const workers: mediasoupType.Worker[] = [];
  let workerIndex = 0;
  await createMediasoupWorkers(workers);

  // Client connection event
  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`\nNew socket established: ${socket.id}`);

    // Subscribes client to roomId event emitter & broadcasts this info to other clients in room
    socket.on('join', async (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');
      const { roomId, clientId, clientName, youtubeID, roomType, canJoin } = clientData;
      if (canJoin) {
        socket.join(roomId);

        const worker = getMediasoupWorker(workerIndex, workers);
        if (workerIndex + 1 === workers.length) workerIndex = 0;

        await Rooms.addRoom(roomId, youtubeID, worker, roomType);
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

        // TODO: refactor logic without youtubeID in general
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

    // -------------------------- MEDIASOUP EVENTS --------------------------
    socket.on('getRtpCapabilities', (data, callback) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      callback(Rooms.getRtpCapabilities(roomId));
    });

    socket.on('getProducers', () => {
      const roomId = Rooms.getClientRoomId(socket.id);
      const roomClients = Rooms.getRoomClients(roomId);

      const producerIds: { producerId: string }[] = [];
      roomClients.forEach((client) => {
        if (client.id !== socket.id) {
          for (const [producerId, producer] of client.producers) {
            producerIds.push({ producerId: producer.id });
          }
        }
      });

      socket.emit('newProducers', producerIds);
    });

    socket.on('createTransport', async (data, callback) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      callback(await Rooms.createTransport(socket.id, roomId));
    });

    socket.on('connectTransport', async({
      transportId,
      dtlsParameters
    },                                  callback) => {
      const client = Rooms.getClient(socket.id);
      await Rooms.addTransport(client, transportId, dtlsParameters);
      callback('success');
    });

    socket.on('produce', async ({
      producerTransportId,
      mediaType,
      rtpParameters
    },                          callback) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);

      // Create client's producer
      const producerId = await Rooms.addProducer(
        producerTransportId,
        rtpParameters,
        mediaType,
        client
      );

      io.to(roomId).emit('newProducers', [{ producerId }]);
      callback({ producerId });
    });

    socket.on('consume', async ({
      consumerTransportId,
      producerId,
      rtpCapabilities,
    },                          callback) => {
      const client = Rooms.getClient(socket.id);
      const consumerResult = await Rooms.addConsumer(
        io,
        socket,
        client,
        consumerTransportId,
        producerId,
        rtpCapabilities
      );

      if (consumerResult === undefined) throw new Error('Unable to create consumer');
      const { consumerParams } = consumerResult;
      callback(consumerParams);
    });

    socket.on('producerClosed', ({ producerId }) => {
      Rooms.closeProducer(socket.id, producerId);
    });

    // -------------------------- YOUTUBE EVENTS --------------------------
    socket.on('videoStateChange', (data) => {
      const client = Rooms.getClient(socket.id);
      let message = `${client.name} `;
      switch (data.type) {
        case('PLAY_VIDEO'):
          message += 'started the video';
          break;
        case('PAUSE_VIDEO'):
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
      const message = `${client.name} swapped playlist item #${oldIndex + 1} with item #${newIndex + 1}`;

      Rooms.moveVideo(roomId, oldIndex, newIndex);
      const newPlaylist: string[] = Rooms.getPlaylistVideoIds(roomId);

      io.to(roomId).emit('notifyClient', movePlaylistItem(newPlaylist));
      io.to(Rooms.getClientRoomId(client.id)).emit(
        'notifyClient',
        createUserMessage(null, client.id, message)
      );
    });

    // -------------------------- WAITING ROOM EVENTS --------------------------
    socket.on('getRoomType', async (
      { clientName, roomId }: { clientName: string, roomId: string },
      callback
    ) => {
      const room = Rooms.getRoom(roomId);
      const roomType = room.roomType;
      if (roomType === 'private') {
        // Update waiting clients and list in the room
        room.waitingClients = {
          ...room.waitingClients,
          [socket.id]: clientName
        };
        Rooms.addToWaitingList(socket.id, roomId);

        // Update waiting clients on the client side of the host
        io.to(room.hostId).emit('waitingClient', { socketId: socket.id, clientName });
      }

      await callback(roomType);
    });

    socket.on('waitingResponse', (
      { socketId, status }: { socketId: string, status: string }
    ) => {
      Rooms.removeFromWaiting(socketId);
      io.to(socketId).emit(status);
    });

    // -------------------------- OTHER EVENTS --------------------------
    socket.on('mute', ({ id }) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const newClients = Rooms.updateMute(id, roomId);
      let message = `${client.name} `;
      client.isMuted ? message += 'muted' : message += 'unmuted';

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
            socket.to(roomId).emit('newHost', room.clients[1].name, room.hostId);
            io.to(room.hostId).emit('updateWaitingClients', {
              waitingClientList: room.waitingClients,
              clientIdLeft: ''
            });
          } else {
            Rooms.closeRoom(roomId);
            return;
          }
        }
        Rooms.closeTransports(client);
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
          clientIdLeft: socket.id
        });
      }
    });
  });
};

const createMediasoupWorkers = async (workers: mediasoupType.Worker[]) => {
  const {
    numWorkers,
    logLevel,
    logTags,
    rtcMinPort,
    rtcMaxPort
  } = mediasoupConfig.mediasoup;

  for (let i = 0; i < numWorkers; i += 1) {
    const worker = await mediasoup.createWorker({
      logLevel,
      logTags,
      rtcMinPort,
      rtcMaxPort
    });

    worker.on('died', () => {
      throw new Error('worker died');
    });

    workers.push(worker);
  }
};

const getMediasoupWorker = (workerIndex: number, workers: mediasoupType.Worker[]) => {
  const worker = workers[workerIndex];
  return worker;
};

export default socketHandler;
