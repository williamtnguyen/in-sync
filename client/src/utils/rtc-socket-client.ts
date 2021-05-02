import io from 'socket.io-client';
const rtcServerDomain = 'http://localhost:4000';

export const openRtcSocket = (
  roomId: string,
  redisClientId: string // the id of session socket. allows 1:1 mapping from voice server to session server
): Promise<SocketIOClient.Socket> => {
  return new Promise((resolve) => {
    const socket = io(rtcServerDomain);

    socket.on('connect', () => {
      const clientData = {
        roomId: roomId ? roomId : socket.id,
        clientId: redisClientId,
      };

      socket.emit('join', clientData);
      resolve(socket);
    });
  });
};
