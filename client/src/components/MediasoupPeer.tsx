import { mediasoupEvent } from '../utils/helpers';
import { Device, types as mediasoupType } from 'mediasoup-client';

export class MediasoupPeer {
  private socket: SocketIOClient.Socket;
  private consumers: Map<string, mediasoupType.Consumer>;
  private producers: Map<string, mediasoupType.Producer>;
  private device: Device | undefined;
  private producerTransport: mediasoupType.Transport | undefined;
  private consumerTransport: mediasoupType.Transport | undefined;
  private producerId: string | undefined;
  private remoteAudiosDiv: HTMLElement | null;

  constructor(socket: SocketIOClient.Socket, remoteAudiosDiv: HTMLElement | null) {
    this.socket = socket;
    this.device = undefined;
    this.producerTransport = undefined;
    this.consumerTransport = undefined;
    this.consumers = new Map();
    this.producers = new Map();
    this.producerId = undefined;
    this.remoteAudiosDiv = remoteAudiosDiv;
  }

  // ----------------------------- FUNCTIONS FOR INITIALIZATION -----------------------------
  async init() {
    console.log('initializing data');
    await this.initMediasoupData();
    await this.initSocket();
    console.log('finished initializing data');
  }

  initMediasoupData = async () => {
    console.log('initializing mediasoup data');
    const rtpCapabilities = await mediasoupEvent(this.socket, 'getRtpCapabilities');
    await this.createDevice(rtpCapabilities);
    await this.createProducerTransport();
    await this.createConsumerTransport();
    this.socket.emit('getProducers');
    console.log('finished initializing mediasoup data');
  }

  initSocket() {
    console.log('attaching other socket commands');
    this.socket.on('consumerClosed', (
      { consumerId }: { consumerId: string }
    ) => {
      console.log('closing consumer: ', consumerId);

      this.removeConsumer(consumerId); 

      console.log('finished closing consumer\n');
    });

    this.socket.on('newProducers', async (
      producerData: { producerId: string }[]
    ) => {
      console.log('setting new producers: ', producerData);
      
      for (let { producerId } of producerData) {
        await this.consume(producerId); 
      }

      console.log('finished setting new producers\n', producerData);
    });

    this.socket.on('disconnect', () => {
      this.consumerTransport?.close();
      this.producerTransport?.close();
      this.socket.off('disconnect');
      this.socket.off('newProducers');
      this.socket.off('consumerClosed');
    });
    console.log('finished attaching other socket commands');
  }

  createDevice = async (
    rtpCapabilities: mediasoupType.RtpCapabilities
  ) => {
    console.log('creating device');
    let device =  new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    this.device = device;
    console.log('finished creating device');
  }

  createProducerTransport = async () => {
    if (this.device !== undefined) {
      console.log('creating producer transport');
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
      console.log('finished creating producer transport');
    } else {
      console.error('Device is undefined. There\'s a problem with creating device');
    }
  }

  createConsumerTransport = async () => {
    console.log('creating consumer transport');
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

    console.log('finished creating consumer transport');
  }

  // ----------------------------- MAIN FUNCTIONS -----------------------------
  produce = async (mediaType: string, deviceId: string) => {
    console.log('start producing');
    
    if (this.producerId !== undefined) {
      console.error('producer already exists');
      return;
    }

    const mediaConstraints = {
      audio: {
        deviceId
      },
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
      console.log('producer', producer);
      this.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        this.producers.delete(producer.id);
      });
      
      producer.on('close', () => {
        console.log('close producer');
        this.producers.delete(producer.id);
      });

      producer.on('trackended', () => {
        console.log('trackended, close producer');
        this.closeProducer();
      });

      this.producerId = producer.id;
      console.log('finished producing');
    } catch(error) {
      console.error(error);
    }
  }

  consume = async (producerId: string) => {
    console.log('creating consumer');
    const { consumer, audioStream } = await this.getConsumeStream(producerId);

    this.consumers.set(consumer.id, consumer);
    let audioElem = document.createElement('audio');
    audioElem.srcObject = audioStream;
    audioElem.id = consumer.id;
    audioElem.setAttribute('playsinline', 'true');
    audioElem.autoplay = true;
    this.remoteAudiosDiv?.appendChild(audioElem);     

    consumer.on('trackended', () => {
      this.removeConsumer(consumer.id);
    });

    consumer.on('transportclose', () => {
      this.removeConsumer(consumer.id);
    });
    console.log('finished creating consumer');
  }

  getConsumeStream = async (producerId: string): Promise<{ 
    consumer: mediasoupType.Consumer; 
    audioStream: MediaStream;
  }> => {
    console.log('getting consumer streams');
    if (this.device === undefined) throw new Error('Device is undefined'); 
    const { rtpCapabilities } = this.device;
    const { rtpParameters, consumerId, mediaKind } = 
      await mediasoupEvent(this.socket, 'consume', {
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
    console.log('finished getting consumer streams');
    return {
      consumer,
      audioStream
    }
  }

  closeProducer = () => {
    console.log('closing producer: ', this.producerId);
    
    if (this.producerId === undefined) throw new Error('Producer id is undefined');
    this.socket.emit('producerClosed', { producerId: this.producerId });
    if (this.producers === undefined) throw new Error('Producer map is undefined');
    this.producers.get(this.producerId)?.close();
    this.producers.delete(this.producerId);
    this.producerId = undefined;

    console.log('finished closing producer');
  }

  pauseProducer = () => {
    if (this.producerId === undefined) throw new Error('Producer id is undefined');
    this.producers.get(this.producerId)?.pause();
  }

  resumeProducer = () => {
    if (this.producerId === undefined) throw new Error('Producer id is undefined');
    this.producers.get(this.producerId)?.resume();
  }

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