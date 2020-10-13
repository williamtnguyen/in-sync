import io from 'socket.io-client';

const socketServerDomain = 'http://localhost:5000';

// Establishes a WebSocket connection and resolves the socket object
export const createConnection = (
  displayName: string,
  roomId?: string
): Promise<SocketIOClient.Socket> => {
  return new Promise((resolve) => {
    const socket = io(socketServerDomain);

    socket.on('connect', () => {
      console.log('connect event triggered');
      const clientData = {
        roomId: roomId ? roomId : socket.id,
        clientId: socket.id,
        clientName: displayName,
      };
      console.log(clientData);
      socket.emit('join', clientData);
      resolve(socket);
    });
  });
};

export const roomSocketEvents = (socket: SocketIOClient.Socket) => {};
