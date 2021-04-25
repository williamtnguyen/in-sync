import { mediasoupEvent } from './helpers';
import { Device, types as mediasoupType } from 'mediasoup-client';
import { Client } from '../../../server/utils/Rooms';

export class MediasoupPeer {
  private socket: SocketIOClient.Socket;
  private consumers: Map<string, mediasoupType.Consumer>;
  private producers: Map<string, mediasoupType.Producer>;
  private device: Device | undefined;
  private producerTransport: mediasoupType.Transport | undefined;
  private consumerTransport: mediasoupType.Transport | undefined;
  private producerId: string | undefined;
  private remoteAudiosDiv: HTMLElement | null;
  private tempClients: Client[] | undefined;

  constructor(socket: SocketIOClient.Socket, remoteAudiosDiv: HTMLElement | null) {
    this.socket = socket;
    this.device = undefined;
    this.producerTransport = undefined;
    this.consumerTransport = undefined;
    this.consumers = new Map();
    this.producers = new Map();
    this.producerId = undefined;
    this.remoteAudiosDiv = remoteAudiosDiv;
    this.tempClients = undefined
  }

  // ----------------------------- FUNCTIONS FOR INITIALIZATION -----------------------------
  async init() {
    await this.initMediasoupData();
    await this.initSocket();
  }

  initMediasoupData = async () => {
    const rtpCapabilities = await mediasoupEvent(this.socket, 'getRtpCapabilities');
    await this.createDevice(rtpCapabilities);
    await this.createProducerTransport();
    await this.createConsumerTransport();
    this.socket.emit('getProducers');
  }

  initSocket() {
    this.socket.on('consumerClosed', (
      { consumerId }: { consumerId: string }
    ) => {

      this.removeConsumer(consumerId); 
    });

    this.socket.on('newProducers', async (
      data: { producerId: string }[]
    ) => {
      console.log('new producer id: ', data);
      for (const { producerId } of data) {
        console.log('consuming: ', producerId);
        await this.consume(producerId); 
      }
    });

    this.socket.on('activeSpeaker', ({ 
      clientVolumes, 
      clients 
    }: {
      clientVolumes: {[clientId: string]: number},
      clients: Client[]
    }) => {         
      if (clients === undefined && this.tempClients === undefined) return;
      if (clients !== undefined) this.tempClients = clients;
      // console.log('clients: ', clients);
      // console.log('client volumes: ', clientVolumes);
      
      this.tempClients?.forEach((client) => {
        let speakerAvatar: any = document.getElementsByClassName(client.id)[0];
        if (clientVolumes !== null && (client.id in clientVolumes)) {          
          speakerAvatar.style.backgroundColor = '#87d068';
        }
        else {
          if (speakerAvatar !== undefined) speakerAvatar.style = null;
        }
      });
    })

    this.socket.on('disconnect', () => {
      this.consumerTransport?.close();
      this.producerTransport?.close();
      this.socket.off('disconnect');
      this.socket.off('newProducers');
      this.socket.off('consumerClosed');
    });
  }

  createDevice = async (
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) => {
    let device =  new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    this.device = device;
  }

  createProducerTransport = async () => {
    if (this.device !== undefined) {
      if (this.device === undefined) 
        throw new Error('Device is undefined while creating producer transport');

      const transport = await mediasoupEvent(this.socket, 'createTransport', {
        forceTcp: false,
        rtpCapabilities: this.device.rtpCapabilities
      });
  
      if (transport.error) throw new Error(transport.error); 
       
      this.producerTransport = this.device.createSendTransport({
        id: transport.id,
        iceParameters: transport.iceParams,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });

      if (this.producerTransport === undefined) {
        console.error('producer transport is undefined');
        return;
      } 

      this.producerTransport.on('connect', async ({ 
        dtlsParameters
      }, callback, errorback) => {
        mediasoupEvent(this.socket, 'connectTransport', {
          transportId: transport.id,
          dtlsParameters
        })
          .then(callback)
          .catch(errorback);
      });

      this.producerTransport.on('produce', async ({ 
        kind, 
        rtpParameters 
      }, callback, errorback) => {
        try {
          if (this.producerTransport !== undefined) {
            const { producerId } = await mediasoupEvent(this.socket, 'produce', {
              producerTransportId: this.producerTransport.id,
              mediaType: kind,
              rtpParameters
            });

            callback({ id: producerId });
          } else {
            console.error('producer transport is undefined');
            return;
          }
        } catch(error) {
          errorback(error);
        }
      });

      this.producerTransport.on('connectionstatechange', async (state) => {
        if (state === 'failed') {
          if (this.producerTransport === undefined) {
            console.error('producer transport is undefined');
            return;
          }
          this.producerTransport.close();
        }
      });
    } else {
      console.error('Device is undefined. There\'s a problem with creating device');
    }
  }

  createConsumerTransport = async () => {
    const transport = await mediasoupEvent(this.socket, 'createTransport', {
      forceTcp: false
    });

    if (transport.error) 
      throw new Error(transport.error);
    if (this.device === undefined) 
      throw new Error('Device is undefined while creating consumer transport');
   
    this.consumerTransport = this.device.createRecvTransport({
      id: transport.id,
      iceParameters: transport.iceParams,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });

    if (this.consumerTransport === undefined) {
      console.error('consumer transport is undefined');
      return;
    } 

    this.consumerTransport.on('connect', async ({ 
      dtlsParameters
    }, callback, errorback) => {
      mediasoupEvent(this.socket, 'connectTransport', {
        transportId: this.consumerTransport?.id,
        dtlsParameters
      })
        .then(callback)
        .catch(errorback);
    });

    this.consumerTransport.on('connectionstatechange', async (state) => {
      if (state === 'failed') {
        if (this.consumerTransport === undefined) {
          console.error('consumer transport is undefined');
          return;
        }
        this.consumerTransport.close();
      }
    });

  }

  // ----------------------------- MAIN FUNCTIONS -----------------------------
  produce = async (deviceId: string) => {
    const mediaConstraints = {
      audio: { deviceId },
      video: false
    };

    try {
      let userMedia = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      const audioTrack: MediaStreamTrack = userMedia.getAudioTracks()[0];
      if (this.producerTransport === undefined) {
        console.error('producer transport is undefined');
        return;
      }

      // Tell transport to send audio tracks to mediasoup router
      let producer = await this.producerTransport.produce({ track: audioTrack });
      this.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        this.producers.delete(producer.id);
      });
      
      producer.on('close', () => {
        console.log('deleting producer: ', this.producerId);
        console.log(this.producers);
        
        this.producers.delete(producer.id);

        console.log(this.producers);
      });

      producer.on('trackended', () => {
        this.closeProducer();
      });

      // console.log('prev producer id: ', this.producerId);
      
      this.producerId = producer.id;
      
      // console.log('new producer id: ', this.producerId);
    } catch(error) {
      console.error(error);
    }
  }

  consume = async (producerId: string) => {
    const { consumer, audioStream } = await this.getConsumeStream(producerId);

    // Does not add user's own audio
    if (producerId !== this.producerId) {
      this.consumers.set(consumer.id, consumer);
      let audioElem = document.createElement('audio');
      audioElem.srcObject = audioStream;
      audioElem.id = consumer.id;
      audioElem.setAttribute('playsinline', 'true');
      audioElem.autoplay = true;
      this.remoteAudiosDiv?.appendChild(audioElem);
    }

    consumer.on('trackended', () => {
      this.removeConsumer(consumer.id);
    });

    consumer.on('transportclose', () => {
      this.removeConsumer(consumer.id);
    });
  }

  getConsumeStream = async (producerId: string): Promise<{ 
    consumer: mediasoupType.Consumer; 
    audioStream: MediaStream;
  }> => {
    if (this.device === undefined) throw new Error('Device is undefined'); 
    const { rtpCapabilities } = this.device;
    const { rtpParameters, consumerId, mediaKind } = await mediasoupEvent(
      this.socket, 
      'consume', 
      {
        rtpCapabilities,
        consumerTransportId: this.consumerTransport?.id,
        producerId
      });

    if (this.consumerTransport === undefined) 
      throw new Error('Consumer transport is undefined'); 

    const consumer = await this.consumerTransport.consume({
        id: consumerId,
        producerId,
        rtpParameters,
        kind: mediaKind
      });

    if (consumer === undefined) throw new Error('Consumer is undefined');
    const audioStream = new MediaStream();
    audioStream.addTrack(consumer.track);
    return {
      consumer,
      audioStream
    }
  }

  closeProducer = () => {
    console.log('closing producer');
    
    // If muted and is selecting a different audio device
    if (this.producerId === undefined) return;

    this.socket.emit('producerClosed', { producerId: this.producerId });
    
    if (this.producers.get(this.producerId) === undefined) throw new Error('Producer map is undefined');
    this.producers.get(this.producerId)?.close();
    this.producers.delete(this.producerId);
    
    this.producerId = undefined;
  }

  // pauseProducer = () => {
  //   if (this.producerId === undefined) throw new Error('Producer id is undefined');
  //   this.producers.get(this.producerId)?.pause();
  // }

  // resumeProducer = () => {
  //   if (this.producerId === undefined) throw new Error('Producer id is undefined');
  //   this.producers.get(this.producerId)?.resume();
  // }

  removeConsumer = (consumerId: string) => {
    let consumerElem: HTMLAudioElement  = document.getElementById(consumerId) as HTMLAudioElement;
    if (consumerElem === null) throw new Error('Consumer element is null');

    // getTracks() doesn't work with MediaProvider or MediaStream so the any type is specified
    let src: any = consumerElem.srcObject;
    src.getTracks().forEach((track: MediaStreamTrack) => {
      track.stop();
    });

    consumerElem?.parentNode?.removeChild(consumerElem);
    this.consumers.delete(consumerId);
  }
}