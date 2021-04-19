import { Playlist } from './Playlist';
import { types as mediasoupType } from 'mediasoup';
const mediasoupConfig = require('../mediasoup-config');

export interface ClientMap {
  [clientId: string]: string;
}

export interface Client {
  id: string;
  name: string;
  transports: Map<string, mediasoupType.Transport>;
  consumers: Map<string, mediasoupType.Consumer>;
  producers: Map<string, mediasoupType.Producer>;
  rtpCapabilities: mediasoupType.RtpCapabilities | undefined;
}

export interface RoomMap {
  [roomId: string]: {
    clients: Client[];
    youtubeID: string;
    playlist: Playlist;
    router: mediasoupType.Router;
  };
}

/**
 * Singleton class that aggregates/encapsulates all room information in WebSocketServer
 */
class Rooms {
  private roomMap: RoomMap;
  private clientMap: ClientMap; // maps any socket.id to its respective roomId

  constructor() {
    this.roomMap = {};
    this.clientMap = {};
  }

  async addRoom(roomId: string, youtubeID: string, worker: mediasoupType.Worker) {
    if (!this.roomMap[roomId]) {
      const mediaCodecs = mediasoupConfig.mediasoup.router.codecs;
      const router = await worker.createRouter({ mediaCodecs });      
      const roomDetails = {
        clients: [],
        youtubeID,
        playlist: new Playlist(),
        router
      };
      this.roomMap[roomId] = roomDetails;
    }
  }

  getRoomClients(roomId: string): Client[] {
    if (this.roomMap[roomId]) {
      return this.roomMap[roomId].clients;
    }
    throw new Error('Room with this ID does not exist');
  }

  addClient(roomId: string, clientId: string, clientName: string): void {
    if (this.clientMap[clientId]) {
      return;
    }    
    if (this.roomMap[roomId]) {
      const newClient: Client = { 
        id: clientId, 
        name: clientName,
        transports: new Map(),
        consumers: new Map(),
        producers: new Map(),
        rtpCapabilities: undefined
      };
      this.roomMap[roomId].clients.push(newClient);
      this.clientMap[clientId] = roomId;
    } else {
      console.log(roomId);      
      throw new Error('Room with this ID does not exist');
    }
  }

  removeClient(roomId: string, clientId: string) {
    if (!this.clientMap[clientId]) {
      return;
    }
    if (this.roomMap[roomId]) {
      const clientList: Client[] = this.getRoomClients(roomId);
      for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i];
        if (client.id === clientId) {
          clientList.splice(i, 1);
          return clientList;
        }
      }
    } else {
      throw new Error('Room with this ID does not exist');
    }
  }

  getClientRoomId(clientId: string): string {
    if (this.clientMap[clientId]) {
      return this.clientMap[clientId];
    }
    throw new Error('This client ID does not exist');
  }

  getClient(clientId: string): Client {
    const roomId: string = this.getClientRoomId(clientId);
    const clientList: Client[] = this.getRoomClients(roomId);
    const lookup: Client | undefined = clientList.find(
      (client: Client) => client.id === clientId
    );

    if (!lookup) {
      throw new Error('No clients with this ID exist in any rooms');
    } else {
      return lookup;
    }
  }

  getRoom(roomID: string) {
    return this.roomMap[roomID];
  }

  setVideoLink(roomID: string, newYoutubeID: string): void {
    if (this.roomMap[roomID]) {
      this.roomMap[roomID].youtubeID = newYoutubeID;
    }
  }

  addVideo(roomID: string, youtubeID: string): void {
    if (this.roomMap[roomID]) {
      this.roomMap[roomID].playlist.addVideoToTail(youtubeID);
    }
  }

  deleteVideo(roomID: string, videoIndex: number): void {
    if (this.roomMap[roomID]) {
      this.roomMap[roomID].playlist.deleteVideoAtIndex(videoIndex);
    }
  }

  changeVideo(roomID: string, videoIndex: number): string {
    if (this.roomMap[roomID]) {
      const youtubeID = this.roomMap[roomID].playlist.getYoutubeIDAtIndex(
        videoIndex
      );
      this.setVideoLink(roomID, youtubeID);

      return youtubeID;
    } else {
      throw new Error('Room with this ID does not exist');
    }
  }

  moveVideo(roomID: string, oldIndex: number, newIndex: number): void {
    this.roomMap[roomID].playlist.moveVideoToIndex(oldIndex, newIndex);
  }

  getPlaylistVideoIds(roomId: string): string[] {
    return this.roomMap[roomId].playlist.getPlaylistIds();
  }

  getRtpCapabilities(roomId: string): mediasoupType.RtpCapabilities {
    return this.roomMap[roomId].router.rtpCapabilities;
  }

  async createTransport(clientId: string, roomId: string) {
    const {
      maxIncomingBitrate,
      initialAvailableOutgoingBitrate,
      listenIps
    } = mediasoupConfig.mediasoup.webRtcTransport;
    const router = this.roomMap[roomId].router;

    const transport = await router.createWebRtcTransport({
      listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate
    });

    if (maxIncomingBitrate) 
      await transport.setMaxIncomingBitrate(maxIncomingBitrate);

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') transport.close();
    });

    transport.on('close', () => {});
    this.getClient(clientId).transports.set(transport.id, transport);
    return {
      id: transport.id,
      iceParams: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async addTransport(
    client: Client,
    transportId: string,
    dtlsParameters: mediasoupType.DtlsParameters
  ) {
    if (!client.transports.has(transportId)) return;    
    await client.transports.get(transportId)?.connect({
      dtlsParameters
    });
  }

  async addProducer(
    producerTransportId: string,
    rtpParameters: mediasoupType.RtpParameters, 
    mediaType: mediasoupType.MediaKind,
    client: Client
  ) {
    return new Promise(async (resolve) => {
      let producer = await this.createProducer(
        client,
        producerTransportId,
        rtpParameters,
        mediaType
      );
      resolve(producer.id);
    })
  }

  async createProducer(
    client: Client,
    producerTransportId: string,
    rtpParameters: mediasoupType.RtpParameters, 
    mediaType: mediasoupType.MediaKind
  ) {
    let producer = await client.transports.get(producerTransportId)?.produce({
      kind: mediaType,
      rtpParameters
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
    client: Client,
    consumerTransportId: string, 
    producerId: string,
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) {
    const roomId = this.getClientRoomId(client.id);
    const room = this.getRoom(roomId);
    if (!room.router.canConsume({ producerId, rtpCapabilities })) return;

    let consumer: mediasoupType.Consumer | undefined = await this.createConsumer(
      client,
      consumerTransportId,
      producerId,
      rtpCapabilities
    );

    if (consumer === undefined) throw new Error('Consumer is undefined');

    client.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      if (consumer === undefined) throw new Error('Consumer is undefined');
      client.consumers.delete(consumer.id);
    });

    return {
      consumer,
      consumerParams: {
        producerId,
        consumerId: consumer.id,
        mediaKind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        consumerType: consumer.type,
        producerPaused: consumer.producerPaused
      }
    }
  }

  async createConsumer(
    client: Client,
    consumerTransportId: string, 
    producerId: string,
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) {
    let consumerTransport = client.transports.get(consumerTransportId);
    let consumer = await consumerTransport?.consume({
      producerId,
      rtpCapabilities,
      paused: false
    });

    if (consumer?.type === 'simulcast') {
      await consumer.setPreferredLayers({
        spatialLayer: 2,
        temporalLayer: 2
      });
    }

    return consumer;
  }

  closeTransports(client: Client) {
    client.transports.forEach(transport => transport.close());
  }

  closeProducer(client: Client, producerId: string) {
    client.producers.get(producerId)?.close();
    client.producers.delete(producerId);
  }
}

export default new Rooms();
