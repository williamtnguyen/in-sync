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
      const { roomId, clientId, clientName, youtubeID } = clientData;
      socket.join(roomId);

      const worker = getMediasoupWorker(workerIndex, workers);
      if (workerIndex + 1 === workers.length) workerIndex = 0;

      await Rooms.addRoom(roomId, youtubeID, worker);
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

    socket.on('changeVideo', (youtubeId) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      io.to(roomId).emit(
        'notifyClient',
        createClientNotifier('CHANGE_VIDEO', {
          youtubeID: youtubeId,
        })
      );
      Rooms.changeVideo(roomId, youtubeId);
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

    // -------------------------- OTHER EVENTS --------------------------
    socket.on('mute', ({ id }) => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      const newClients = Rooms.updateMute(id, roomId);
      io.to(roomId).emit('updateClientList', newClients);
    });

    socket.on('disconnect', () => {
      const client = Rooms.getClient(socket.id);
      const roomId = Rooms.getClientRoomId(client.id);
      Rooms.closeTransports(client);
      const newClientList = Rooms.removeClient(roomId, socket.id);
      io.to(roomId).emit('updateClientList', newClientList);
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
