import { Playlist } from './Playlist';
import { types as mediasoupType } from 'mediasoup';
const mediasoupConfig = require('../mediasoup-config');
import { Server as WebSocketServer, Socket } from 'socket.io';

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

export interface Room {
  clients: Client[];
  youtubeID: string;
  playlist: Playlist;
  router: mediasoupType.Router;
}

export interface RoomMap {
  [roomId: string]: Room;
}

/**
 * Singleton class that aggregates/encapsulates all room information in WebSocketServer
 */
class Rooms {
  private roomMap: RoomMap;
  private clientMap: ClientMap; // maps any socket.id to its respective roomId
  private audioObserver: mediasoupType.AudioLevelObserver | undefined;

  constructor() {
    this.roomMap = {};
    this.clientMap = {};
    this.audioObserver = undefined;
  }

  async addRoom(roomId: string, youtubeID: string, worker: mediasoupType.Worker) {
    if (!this.roomMap[roomId]) {
      const mediaCodecs = mediasoupConfig.mediasoup.router.codecs;
      const router = await worker.createRouter({ mediaCodecs });  
      this.audioObserver = await router.createAudioLevelObserver({
        maxEntries: 100,
        threshold: -90,
        interval: 500
      });
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
      rtpParameters,
      appData: { clientId: client.id } // Used for telling if the user is talking
    });

    if (producer === undefined) throw new Error('Producer is undefined');
    
    client.producers.set(producer.id, producer);
    console.log('producer size: ', client.producers.size);

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
    client: Client,
    consumerTransportId: string, 
    producerId: string,
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) {
    const roomId = this.getClientRoomId(client.id);
    const room = this.getRoom(roomId);

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {      
      throw new Error(`Router can\'t consume ${producerId}`);
    } 

    let consumer: mediasoupType.Consumer | undefined = await this.createConsumer(
      client,
      consumerTransportId,
      producerId,
      rtpCapabilities
    );

    if (this.audioObserver === undefined) throw new Error('Audio observer is undefined');
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

  setAudioObserverEvents(room: Room, io: WebSocketServer, roomId: string) {    
    this.audioObserver?.on('volumes', (volumes) => {
      let clientVolumes: {[clientId: string]: number} = {};
      for (const volume of volumes) {
        clientVolumes[volume.producer.appData.clientId] = volume.volume;
      }     
      // console.log('people are speaking');

      io.to(roomId).emit('activeSpeaker', {
        clientVolumes,
        clients: room.clients
      });
    });

    this.audioObserver?.on('silence', () => {
      // console.log('room is silent');
      
      io.to(roomId).emit('activeSpeaker', {
        clientVolumes: null
      });
    });
  }

  closeTransports(client: Client) {
    client.transports.forEach(transport => transport.close());
  }

  closeProducer(clientId: string, producerId: string) {
    console.log('close producer');
    const client = this.getClient(clientId);
    
    if (client.producers.get(producerId) === undefined) throw new Error(`Producer id ${producerId} can\'t be found`);
    client.producers.get(producerId)?.close();
    client.producers.delete(producerId);
  }
}

export default new Rooms();
