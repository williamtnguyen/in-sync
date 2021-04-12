import { Playlist } from './Playlist';

export interface Client {
  id: string;
  name: string;
}

export interface ClientMap {
  [clientId: string]: string;
}

export interface RoomMap {
  [roomId: string]: {
    clients: Client[];
    youtubeID: string;
    playlist: Playlist;
  };
}

/**
 * Singleton class that aggregates/encapsulates all room information in WebSocketServer
 */
class Rooms {
  private roomMap: RoomMap;
  private clientMap: ClientMap; // maps any socket.id to its respective roomId

  constructor() {
    this.roomMap = {};
    this.clientMap = {};
  }

  addRoom(roomId: string, youtubeID: string): void {
    if (!this.roomMap[roomId]) {
      const roomDetails = {
        clients: [],
        youtubeID,
        playlist: new Playlist(),
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
      const newClient: Client = { id: clientId, name: clientName };
      this.roomMap[roomId].clients.push(newClient);
      this.clientMap[clientId] = roomId;
    } else {
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
}

export default new Rooms();
