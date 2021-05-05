import io from 'socket.io-client';
const rtcServerDomain = 'http://localhost:4000';

export const openRtcSocket = (
  roomId: string,
  // the id of session socket. allows 1:1 mapping from voice server to session server
  redisClientId: string
): Promise<SocketIOClient.Socket> => {
  return new Promise((resolve) => {
    const socket = io(rtcServerDomain, {
      path: '/rtcService',
    });

    socket.on('connect', () => {
      const clientData = {
        roomId: roomId ? roomId : socket.id,
        redisClientId,
      };

      socket.emit('join', clientData);
      resolve(socket);
    });
  });
};
