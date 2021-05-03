import { Playlist } from './Playlist';

export interface ClientMap {
  [clientId: string]: string;
}

export interface Client {
  id: string;
  name: string;
  isMuted: boolean;
}

export interface Room {
  clients: Client[];
  youtubeID: string;
  playlist: Playlist;
  roomType: string;
  hostId: string;
  waitingClients: { [socketId: string]: string };
}

export interface RoomMap {
  [roomId: string]: Room;
}

/**
 * Singleton class that aggregates/encapsulates all room information in WebSocketServer
 */
class Rooms {
  private roomMap: RoomMap;
  private clientMap: ClientMap; // maps any socket.id to its respective roomId
  // used in disconnect to find if a user is in a waiting room of a room
  private waitingList: { [socketId: string]: string };

  constructor() {
    this.roomMap = {};
    this.clientMap = {};
    this.waitingList = {}; // socketid -> roomId
  }

  closeRoom(roomId: string) {
    delete this.roomMap[roomId];
  }

  addRoom(roomId: string, youtubeID: string, roomType: string) {
    if (!this.roomMap[roomId]) {
      const roomDetails = {
        clients: [],
        youtubeID,
        playlist: new Playlist(),
        roomType,
        hostId: roomId,
        waitingClients: {}, // socketId -> name
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
      const newClient: Client = {
        id: clientId,
        name: clientName,
        isMuted: false,
      };
      this.roomMap[roomId].clients.push(newClient);
      this.clientMap[clientId] = roomId;
      const room = this.getRoom(roomId);
      if (room.hostId.length === 0) room.hostId = clientId;
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

  isInWaitingList(clientId: string): boolean {
    if (this.waitingList[clientId] === undefined) return false;
    return true;
  }

  addToWaitingList(socketId: string, roomId: string): void {
    this.waitingList[socketId] = roomId;
  }

  removeFromWaiting(socketId: string): void {
    const roomId = this.waitingList[socketId];
    const room = this.getRoom(roomId);
    delete this.waitingList[socketId];
    delete room.waitingClients[socketId];
  }

  getWaitingClientRoomId(socketId: string): string {
    return this.waitingList[socketId];
  }

  updateMute(id: string, roomId: string): Client[] {
    const clients = this.getRoomClients(roomId);
    for (const client of clients) {
      if (client.id === id) client.isMuted = !client.isMuted;
    }
    return clients;
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
