import { mediasoupEvent } from './helpers';
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
  private tempClients: string[] | undefined;

  constructor(
    rtcSocket: SocketIOClient.Socket,
    remoteAudiosDiv: HTMLElement | null
  ) {
    this.socket = rtcSocket;
    this.device = undefined;
    this.producerTransport = undefined;
    this.consumerTransport = undefined;
    this.consumers = new Map();
    this.producers = new Map();
    this.producerId = undefined;
    this.remoteAudiosDiv = remoteAudiosDiv;
    this.tempClients = undefined;
  }

  // ----------------------------- FUNCTIONS FOR INITIALIZATION -----------------------------
  async init() {
    await this.initMediasoupData();
    this.initSocket();
  }

  initMediasoupData = async () => {
    const rtpCapabilities = await mediasoupEvent(
      this.socket,
      'getRtpCapabilities'
    );
    await this.createDevice(rtpCapabilities);
    await this.createProducerTransport();
    await this.createConsumerTransport();
    this.socket.emit('getProducers');
  };

  initSocket() {
    this.socket.on(
      'consumerClosed',
      ({ consumerId }: { consumerId: string }) => {
        this.removeConsumer(consumerId);
      }
    );

    this.socket.on('newProducers', async (data: { producerId: string }[]) => {
      for (const { producerId } of data) {
        await this.consume(producerId);
      }
    });

    this.socket.on(
      'activeSpeaker',
      ({
        clientVolumes,
        clients,
      }: {
        clientVolumes: { [clientId: string]: number };
        clients: string[];
      }) => {
        if (clients === undefined && this.tempClients === undefined) return;
        if (clients !== undefined) this.tempClients = clients;

        this.tempClients?.forEach((redisClientId) => {
          const speakerAvatar: any = document.getElementsByClassName(
            redisClientId
          )[0];
          if (clientVolumes !== null && redisClientId in clientVolumes) {
            speakerAvatar.style.backgroundColor = '#87d068';
          } else {
            if (speakerAvatar !== undefined) speakerAvatar.style = null;
          }
        });
      }
    );

    // Runs only when rtc-server is taken down
    this.socket.on('disconnect', () => {
      this.consumerTransport?.close();
      this.producerTransport?.close();
      this.socket.off('disconnect');
      this.socket.off('newProducers');
      this.socket.off('consumerClosed');
    });
  }

  createDevice = async (rtpCapabilities: mediasoupType.RtpCapabilities) => {
    const device = new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    this.device = device;
  };

  createProducerTransport = async () => {
    if (this.device !== undefined) {
      const transport = await mediasoupEvent(this.socket, 'createTransport', {
        forceTcp: false,
        rtpCapabilities: this.device.rtpCapabilities,
      });

      if (transport.error) throw new Error(transport.error);

      this.producerTransport = this.device.createSendTransport({
        id: transport.id,
        iceParameters: transport.iceParams,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

      if (this.producerTransport === undefined) {
        throw new Error('producer transport is undefined');
      }

      this.producerTransport.on(
        'connect',
        async ({ dtlsParameters }, callback, errorback) => {
          await mediasoupEvent(this.socket, 'connectTransport', {
            transportId: transport.id,
            dtlsParameters,
          });
          try {
            callback();
          } catch (error) {
            errorback(error);
          }
        }
      );

      this.producerTransport.on(
        'produce',
        async ({ kind, rtpParameters }, callback, errorback) => {
          try {
            if (this.producerTransport === undefined) {
              throw new Error('producer transport is undefined');
            }

            const { producerId } = await mediasoupEvent(
              this.socket,
              'produce',
              {
                producerTransportId: this.producerTransport.id,
                mediaType: kind,
                rtpParameters,
              }
            );

            callback({ id: producerId });
          } catch (error) {
            errorback(error);
          }
        }
      );

      this.producerTransport.on('connectionstatechange', async (state) => {
        if (state === 'failed') {
          if (this.producerTransport === undefined) {
            throw new Error('producer transport is undefined');
          }
          this.producerTransport.close();
        }
      });
    } else {
      throw new Error(
        "Device is undefined. There's a problem with creating device"
      );
    }
  };

  createConsumerTransport = async () => {
    const transport = await mediasoupEvent(this.socket, 'createTransport', {
      forceTcp: false,
    });

    if (transport.error) {
      throw new Error(transport.error);
    }
    if (this.device === undefined) {
      throw new Error('Device is undefined while creating consumer transport');
    }

    this.consumerTransport = this.device.createRecvTransport({
      id: transport.id,
      iceParameters: transport.iceParams,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });

    if (this.consumerTransport === undefined) {
      throw new Error('consumer transport is undefined');
    }

    this.consumerTransport.on(
      'connect',
      async ({ dtlsParameters }, callback, errorback) => {
        await mediasoupEvent(this.socket, 'connectTransport', {
          transportId: this.consumerTransport?.id,
          dtlsParameters,
        });
        try {
          callback();
        } catch (error) {
          errorback(error);
        }
      }
    );

    this.consumerTransport.on('connectionstatechange', async (state) => {
      if (state === 'failed') {
        if (this.consumerTransport === undefined) {
          throw new Error('consumer transport is undefined');
        }
        this.consumerTransport.close();
      }
    });
  };

  // ----------------------------- MAIN FUNCTIONS -----------------------------
  produce = async (deviceId: string) => {
    const mediaConstraints = {
      audio: { deviceId },
      video: false,
    };

    try {
      const userMedia = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );
      const audioTrack: MediaStreamTrack = userMedia.getAudioTracks()[0];
      if (this.producerTransport === undefined) {
        throw new Error('producer transport is undefined');
      }

      // Tell transport to send audio tracks to mediasoup router
      const producer = await this.producerTransport.produce({
        track: audioTrack,
      });
      this.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        this.producers.delete(producer.id);
      });

      producer.on('close', () => {
        this.producers.delete(producer.id);
      });

      producer.on('trackended', () => {
        this.closeProducer();
      });

      this.producerId = producer.id;
    } catch (error) {
      throw new Error(error);
    }
  };

  consume = async (producerId: string) => {
    const { consumer, audioStream } = await this.getConsumeStream(producerId);

    // Does not add user's own audio
    if (producerId !== this.producerId) {
      this.consumers.set(consumer.id, consumer);
      const audioElem = document.createElement('audio');
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
  };

  getConsumeStream = async (
    producerId: string
  ): Promise<{
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
        producerId,
      }
    );

    if (this.consumerTransport === undefined) {
      throw new Error('Consumer transport is undefined');
    }

    const consumer = await this.consumerTransport.consume({
      id: consumerId,
      producerId,
      rtpParameters,
      kind: mediaKind,
    });

    if (consumer === undefined) throw new Error('Consumer is undefined');
    const audioStream = new MediaStream();
    audioStream.addTrack(consumer.track);
    return {
      consumer,
      audioStream,
    };
  };

  closeProducer = () => {
    // If muted and is selecting a different audio device
    if (this.producerId === undefined) return;

    this.socket.emit('producerClosed', {
      producerId: this.producerId,
    });
    if (this.producers.get(this.producerId) === undefined) {
      throw new Error('Producer map is undefined');
    }
    this.producers.get(this.producerId)?.close();
    this.producers.delete(this.producerId);
    this.producerId = undefined;
  };

  removeConsumer = (consumerId: string) => {
    const consumerElem: HTMLAudioElement = document.getElementById(
      consumerId
    ) as HTMLAudioElement;
    if (consumerElem === null) throw new Error('Consumer element is null');

    // getTracks() doesn't work with MediaProvider or MediaStream so the any type is specified
    const src: any = consumerElem.srcObject;
    src.getTracks().forEach((track: MediaStreamTrack) => {
      track.stop();
    });

    consumerElem?.parentNode?.removeChild(consumerElem);
    this.consumers.delete(consumerId);
  };
}
