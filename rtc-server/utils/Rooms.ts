import { types as mediasoupType } from 'mediasoup';
const mediasoupConfig = require('../mediasoup-config');
import { Server as WebSocketServer, Socket } from 'socket.io';

interface RtcClient {
  redisClientId: string; // the id of session socket. allows 1:1 mapping from voice server to session server
  transports: Map<string, mediasoupType.Transport>;
  consumers: Map<string, mediasoupType.Consumer>;
  producers: Map<string, mediasoupType.Producer>;
  rtpCapabilities: mediasoupType.RtpCapabilities | undefined;
}

interface Room {
  clients: RtcClient[];
  router: mediasoupType.Router;
  hostId: string;
}

interface RtcClientMap {
  [clientId: string]: string;
}

interface RoomMap {
  [roomId: string]: Room;
}

/**
 * Singleton class that holds all RtcClients in memory
 */
class Rooms {
  private roomMap: RoomMap;
  private clientMap: RtcClientMap;
  private audioObserver: mediasoupType.AudioLevelObserver | undefined;

  constructor() {
    this.roomMap = {};
    this.clientMap = {};
    this.audioObserver = undefined;
  }

  getRoom(roomId: string): Room {
    return this.roomMap[roomId];
  }

  getRoomClients(roomId: string): RtcClient[] {
    if (this.roomMap[roomId]) {
      return this.roomMap[roomId].clients;
    }
    throw new Error('Room with this ID does not exist');
  }

  getClientRoomId(clientId: string): string {
    if (this.clientMap[clientId]) {
      return this.clientMap[clientId];
    }
    throw new Error('This client ID does not exist');
  }

  getClient(clientId: string): RtcClient {
    const roomId: string = this.getClientRoomId(clientId);
    const clientList: RtcClient[] = this.getRoomClients(roomId);
    const lookup: RtcClient | undefined = clientList.find(
      (client: RtcClient) => client.redisClientId === clientId
    );
    if (!lookup) {
      throw new Error('No clients with this ID exist in any rooms');
    } else {
      return lookup;
    }
  }

  getRtpCapabilities(roomId: string): mediasoupType.RtpCapabilities {
    return this.roomMap[roomId].router.rtpCapabilities;
  }

  async addRoom(roomId: string, worker: mediasoupType.Worker) {
    if (!this.roomMap[roomId]) {
      const mediaCodecs = mediasoupConfig.mediasoup.router.codecs;
      const router = await worker.createRouter({ mediaCodecs });
      this.audioObserver = await router.createAudioLevelObserver({
        maxEntries: 100,
        threshold: -90,
        interval: 500,
      });
      const roomDetails = {
        clients: [],
        router,
        hostId: roomId,
      };
      this.roomMap[roomId] = roomDetails;
    }
  }

  addClient(roomId: string, clientId: string) {
    if (this.clientMap[clientId]) {
      return;
    }
    if (this.roomMap[roomId]) {
      const newClient: RtcClient = {
        redisClientId: clientId,
        transports: new Map(),
        consumers: new Map(),
        producers: new Map(),
        rtpCapabilities: undefined,
      };
      this.roomMap[roomId].clients.push(newClient);
      this.clientMap[clientId] = roomId;
      const room = this.getRoom(roomId);
      if (!room.hostId) room.hostId = clientId;
      console.log(this.roomMap[roomId], this.roomMap);
    } else {
      throw new Error('Room with this ID does not exist');
    }
  }

  async createTransport(clientId: string, roomId: string) {
    const {
      maxIncomingBitrate,
      initialAvailableOutgoingBitrate,
      listenIps,
    } = mediasoupConfig.mediasoup.webRtcTransport;
    const router = this.roomMap[roomId].router;

    const transport = await router.createWebRtcTransport({
      listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate,
    });

    if (maxIncomingBitrate) {
      await transport.setMaxIncomingBitrate(maxIncomingBitrate);
    }

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') transport.close();
    });

    this.getClient(clientId).transports.set(transport.id, transport);
    return {
      id: transport.id,
      iceParams: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async addTransport(
    client: RtcClient,
    transportId: string,
    dtlsParameters: mediasoupType.DtlsParameters
  ) {
    if (!client.transports.has(transportId)) return;
    await client.transports.get(transportId)?.connect({
      dtlsParameters,
    });
  }

  async addProducer(
    producerTransportId: string,
    rtpParameters: mediasoupType.RtpParameters,
    mediaType: mediasoupType.MediaKind,
    client: RtcClient
  ) {
    return new Promise(async (resolve) => {
      const producer = await this.createProducer(
        client,
        producerTransportId,
        rtpParameters,
        mediaType
      );
      resolve(producer.id);
    });
  }

  async createProducer(
    client: RtcClient,
    producerTransportId: string,
    rtpParameters: mediasoupType.RtpParameters,
    mediaType: mediasoupType.MediaKind
  ) {
    const producer = await client.transports.get(producerTransportId)?.produce({
      kind: mediaType,
      rtpParameters,
      appData: { clientId: client.redisClientId }, // Used for telling if the user is talking
    });

    if (producer === undefined) throw new Error('Producer is undefined');

    client.producers.set(producer.id, producer);

    producer.on('closeTransport', () => {
      if (producer !== undefined) {
        producer.close();
        client.producers.delete(producer.id);
      }
    });

    return producer;
  }

  async addConsumer(
    io: WebSocketServer,
    socket: Socket,
    client: RtcClient,
    consumerTransportId: string,
    producerId: string,
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) {
    const roomId = this.getClientRoomId(client.redisClientId);
    const room = this.getRoom(roomId);

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Router can\'t consume ${producerId}`);
    }

    const consumer:
      | mediasoupType.Consumer
      | undefined = await this.createConsumer(
      client,
      consumerTransportId,
      producerId,
      rtpCapabilities
    );

    if (this.audioObserver === undefined)
      throw new Error('Audio observer is undefined');
    this.audioObserver.addProducer({ producerId });
    this.setAudioObserverEvents(room, io, roomId);

    if (consumer === undefined) throw new Error('Consumer is undefined');
    consumer.on('transportclose', () => {
      if (consumer === undefined) throw new Error('Consumer is undefined');
      client.consumers.delete(consumer.id);
    });

    consumer.on('producerClosed', () => {
      if (consumer === undefined) throw new Error('Consumer is undefined');
      client.consumers.delete(consumer.id);
      io.to(socket.id).emit('consumerClosed', { consumerId: consumer.id });
    });

    client.consumers.set(consumer.id, consumer);

    return {
      consumer,
      consumerParams: {
        producerId,
        consumerId: consumer.id,
        mediaKind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        consumerType: consumer.type,
        producerPaused: consumer.producerPaused,
      },
    };
  }

  async createConsumer(
    client: RtcClient,
    consumerTransportId: string,
    producerId: string,
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) {
    const consumerTransport = client.transports.get(consumerTransportId);
    const consumer = await consumerTransport?.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    if (consumer?.type === 'simulcast') {
      await consumer.setPreferredLayers({
        spatialLayer: 2,
        temporalLayer: 2,
      });
    }

    return consumer;
  }

  setAudioObserverEvents(room: Room, io: WebSocketServer, roomId: string) {
    this.audioObserver?.on('volumes', (volumes) => {
      const clientVolumes: { [clientId: string]: number } = {};
      let clients: string[] = [];
      for (const volume of volumes) {
        clientVolumes[volume.producer.appData.clientId] = volume.volume;
      }
      room.clients.forEach(client => clients.push(client.redisClientId));
      io.to(roomId).emit('activeSpeaker', {
        clientVolumes,
        clients,
      });
    });

    this.audioObserver?.on('silence', () => {
      io.to(roomId).emit('activeSpeaker', {
        clientVolumes: null,
      });
    });
  }

  closeTransports(client: RtcClient) {
    client.transports.forEach((transport) => transport.close());
  }

  closeProducer(clientId: string, producerId: string) {
    const client = this.getClient(clientId);

    if (client.producers.get(producerId) === undefined) {
      throw new Error(`Producer id ${producerId} can\'t be found`);
    }
    client.producers.get(producerId)?.close();
    client.producers.delete(producerId);
  }

  removeClient(roomId: string, clientId: string) {
    if (!this.clientMap[clientId]) {
      return;
    }
    if (this.roomMap[roomId]) {
      const clientList: RtcClient[] = this.getRoomClients(roomId);
      for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i];
        if (client.redisClientId === clientId) {
          clientList.splice(i, 1);
          return clientList;
        }
      }
    } else {
      throw new Error('Room with this ID does not exist');
    }
  }

  closeRoom(roomId: string) {
    const room = this.getRoom(roomId);
    room.router.close();
    delete this.roomMap[roomId];
  }
}

export default new Rooms();
