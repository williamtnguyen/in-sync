import { Dispatch } from 'react';
import io from 'socket.io-client';
import { ClientStates, VideoStates } from './enums';
const sessionServerDomain = 'http://localhost:5000';

// Establishes a WebSocket connection and resolves the socket object
export const openSessionSocket = (
  displayName: string,
  roomType: string,
  canJoin: boolean,
  roomId?: string
): Promise<SocketIOClient.Socket> => {
  return new Promise((resolve) => {
    const socket = io(sessionServerDomain, {
      path: '/sessionService',
    });

    socket.on('connect', () => {
      const clientData = {
        roomId: roomId ? roomId : socket.id,
        clientId: socket.id,
        clientName: displayName,
        roomType,
        canJoin,
      };

      socket.emit('join', clientData);
      resolve(socket);
    });
  });
};

interface DispatchTypes {
  clientDispatch: Dispatch<any>;
  videoDispatch: Dispatch<any>;
}

export const subscribeToRoomEvents = (
  socket: SocketIOClient.Socket,
  dispatch: DispatchTypes
) => {
  if (!socket) return;
  const { clientDispatch, videoDispatch } = dispatch;

  // Create notifications or do actions based on data passed from socket-handler
  socket.on('notifyClient', (data: any) => {
    switch (data.notification) {
      // Sets video for the new client
      case VideoStates.CHANGE_VIDEO:
        clientDispatch({
          type: ClientStates.UPDATE_YOUTUBE_ID,
          youtubeID: data.details.youtubeID,
        });
        break;

      case 'updateVideoState':
        const notificationDetails = data.details;
        videoDispatch({
          type: VideoStates.SEEK_VIDEO,
          seek: true,
        });

        switch (notificationDetails.type) {
          case VideoStates.PLAY_VIDEO:
            videoDispatch({
              type: VideoStates.PLAY_VIDEO,
              currTime: notificationDetails.currTime,
            });
            break;

          case VideoStates.PAUSE_VIDEO:
            videoDispatch({
              type: VideoStates.PAUSE_VIDEO,
              timestamp: Date.now(),
            });
            break;
        }
        break;

      case 'clientMessage':
        clientDispatch({
          type: ClientStates.UPDATE_CHAT_MESSAGES,
          data,
        });
        break;

      case 'addToPlaylist':
        clientDispatch({
          type: ClientStates.UPDATE_PLAYLIST,
          playlist: data.playlist,
        });
        break;

      case 'deletePlaylistItem':
        clientDispatch({
          type: ClientStates.DELETE_VIDEO,
          playlist: data.playlist,
        });
        break;

      case 'changeVideo':
        clientDispatch({
          type: ClientStates.CHANGE_VIDEO,
          data,
        });
        break;

      case 'movePlaylistItem':
        clientDispatch({
          type: ClientStates.MOVE_VIDEO,
          playlist: data.playlist,
        });
        break;

      default:
        break;
    }
  });
};
