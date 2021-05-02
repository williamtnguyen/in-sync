import { Server as WebSocketServer, Socket } from 'socket.io';
import { types as mediasoupType } from 'mediasoup';
import Rooms from './Rooms';

const mediasoup = require('mediasoup');
const mediasoupConfig = require('../mediasoup-config');

/**
 * Attaches event listeners to socket instance
 */
async function attachSocketEvents(io: WebSocketServer) {
  const workers: mediasoupType.Worker[] = [];
  let workerIndex = 0;
  await createMediasoupWorkers(workers);

  io.on('connection', (socket: Socket) => {
    // tslint:disable-next-line: no-console
    console.log(`\nNew socket established: ${socket.id}`);

    socket.on('join', async (clientData) => {
      // tslint:disable-next-line: no-console
      console.log('join broadcast triggered');

      const { roomId, redisClientId } = clientData;

      socket.join(roomId);

      const worker = getMediasoupWorker(workerIndex, workers);
      if (workerIndex + 1 === workers.length) workerIndex = 0;

      await Rooms.addRoom(roomId, worker);
      Rooms.addClient(roomId, socket.id, redisClientId);
    });

    socket.on('getRtpCapabilities', (data, callback) => {
      const redisClientId = Rooms.getRedisClientId(socket.id);
      const roomId = Rooms.getClientRoomId(redisClientId);
      callback(Rooms.getRtpCapabilities(roomId));
    });

    socket.on('getProducers', () => {
      const redisClientId = Rooms.getRedisClientId(socket.id);
      const roomId = Rooms.getClientRoomId(redisClientId);
      const roomClients = Rooms.getRoomClients(roomId);

      const producerIds: { producerId: string }[] = [];
      roomClients.forEach((client) => {
        if (client.redisClientId !== redisClientId) {
          for (const [producerId, producer] of client.producers) {
            producerIds.push({ producerId: producer.id });
          }
        }
      });

      socket.emit('newProducers', producerIds);
    });

    socket.on('createTransport', async (data, callback) => {
      const redisClientId = Rooms.getRedisClientId(socket.id);
      const roomId = Rooms.getClientRoomId(redisClientId);
      callback(await Rooms.createTransport(redisClientId, roomId));
    });

    socket.on(
      'connectTransport',
      async ({ transportId, dtlsParameters }, callback) => {
        const redisClientId = Rooms.getRedisClientId(socket.id);
        const client = Rooms.getClient(redisClientId);
        await Rooms.addTransport(client, transportId, dtlsParameters);
        callback('success');
      }
    );

    socket.on(
      'produce',
      async ({ producerTransportId, mediaType, rtpParameters }, callback) => {
        const redisClientId = Rooms.getRedisClientId(socket.id);
        const client = Rooms.getClient(redisClientId);
        const roomId = Rooms.getClientRoomId(redisClientId);

        // Create client's producer
        const producerId = await Rooms.addProducer(
          producerTransportId,
          rtpParameters,
          mediaType,
          client
        );

        io.to(roomId).emit('newProducers', [{ producerId }]);
        callback({ producerId });
      }
    );

    socket.on(
      'consume',
      async (
        { consumerTransportId, producerId, rtpCapabilities },
        callback
      ) => {
        const redisClientId = Rooms.getRedisClientId(socket.id);
        const client = Rooms.getClient(redisClientId);
        const consumerResult = await Rooms.addConsumer(
          io,
          socket,
          client,
          consumerTransportId,
          producerId,
          rtpCapabilities
        );

        if (consumerResult === undefined) {
          throw new Error('Unable to create consumer');
        }
        const { consumerParams } = consumerResult;
        callback(consumerParams);
      }
    );

    socket.on('producerClosed', ({ producerId }) => {
      const redisClientId = Rooms.getRedisClientId(socket.id);
      Rooms.closeProducer(redisClientId, producerId);
    });

    socket.on('disconnect', () => {
      const redisClientId = Rooms.getRedisClientId(socket.id);
      const client = Rooms.getClient(redisClientId);
      const roomId = Rooms.getClientRoomId(redisClientId);
      const room = Rooms.getRoom(roomId);

      // Choose the next host if the socket that's disconnecting is the host
      if (redisClientId === room.hostId) {
        if (room.clients.length - 1 !== 0) {
          room.hostId = room.clients[1].redisClientId;
        } else {
          return Rooms.closeRoom(roomId);
        }
      }
      Rooms.closeTransports(client);
      Rooms.removeClient(roomId, socket.id, redisClientId);
    });
  });
}

const createMediasoupWorkers = async (workers: mediasoupType.Worker[]) => {
  const {
    numWorkers,
    logLevel,
    logTags,
    rtcMinPort,
    rtcMaxPort,
  } = mediasoupConfig.mediasoup;

  for (let i = 0; i < numWorkers; i += 1) {
    const worker = await mediasoup.createWorker({
      logLevel,
      logTags,
      rtcMinPort,
      rtcMaxPort,
    });

    worker.on('died', () => {
      throw new Error('worker died');
    });

    workers.push(worker);
  }
};

const getMediasoupWorker = (
  workerIndex: number,
  workers: mediasoupType.Worker[]
) => {
  const worker = workers[workerIndex];
  return worker;
};

export default attachSocketEvents;
