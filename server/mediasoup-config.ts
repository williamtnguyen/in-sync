const os = require('os');

module.exports = {
  listenIp: '0.0.0.0',
  listenPort: 3000,
  sslCrt: './ssl-snakeoil.pem',
  sslKey: './ssl-snakeoil.key',
  mediasoup: {
    // Worker settings
    numWorkers : Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
    },
    // Router settings
    router: {
      codecs:
        [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
          }
        ]
    },
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',      
          announcedIp:'127.0.0.1' // replace by public IP address
        }
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    }
  }
};
