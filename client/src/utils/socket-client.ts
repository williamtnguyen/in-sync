import { Dispatch } from 'react';
import io from 'socket.io-client';
import Video from '../components/video';
import { ClientStates, VideoStates } from './enums';
const socketServerDomain = 'http://localhost:5000';

// Establishes a WebSocket connection and resolves the socket object
export const createConnection = (
  displayName: string,
  roomId?: string,
  youtubeID?: string | false,
): Promise<SocketIOClient.Socket> => {
  return new Promise((resolve) => {
    const socket = io(socketServerDomain);

    socket.on('connect', () => {
      console.log('connect event triggered');
      const clientData = {
        roomId: roomId ? roomId : socket.id,
        clientId: socket.id,
        clientName: displayName,
        youtubeID
      };
      socket.emit('join', clientData);
      resolve(socket);
    });
  });
};

interface dispatchTypes {
  clientDispatch: Dispatch<any>,
  videoDispatch: Dispatch<any>
}

export const roomSocketEvents = (socket: SocketIOClient.Socket, dispatch: dispatchTypes) => {
  if (!socket) return;
  const { clientDispatch, videoDispatch } = dispatch;

  // Create notifications or do actions based on data passed from socket-handler
  socket.on('notifyClient', (data: any) => {      
    switch(data.notification) {

      // Sets video for the new client
      case VideoStates.CHANGE_VIDEO:
        clientDispatch({
          type: ClientStates.UPDATE_YOUTUBE_ID,
          youtubeID: data.details.youtubeID
        });
        break;

      case 'updateVideoState':
        const notificationDetails = data.details;
        videoDispatch({ 
          type: VideoStates.SEEK_VIDEO, 
          seek: true 
        }); 

        switch(notificationDetails.type) {
          case VideoStates.PLAY_VIDEO:
            console.log('PLAY_VIDEO received');
            videoDispatch({
              type: VideoStates.PLAY_VIDEO,
              currTime: notificationDetails.currTime
            });
            break;
            
          case VideoStates.PAUSE_VIDEO:
            console.log('PAUSE_VIDEO received');
            videoDispatch({
              type: VideoStates.PAUSE_VIDEO,
              timestamp: Date.now()
            });
            break;
        }
        break;

      default:
        break;
    }
  });
};
