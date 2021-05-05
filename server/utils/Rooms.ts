import { Playlist } from './Playlist';
import redisClients from './redis-clients';
const {
  roomStateClient,
  getRoomState,
  clientRoomIdClient,
  getClientRoomId,
  waitingRoomIdClient,
  getWaitingClientRoomId,
} = redisClients;

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
  // playlist: Playlist;
  playlist: string[];
  roomType: string;
  hostId: string;
  waitingClients: { [socketId: string]: string };
}

export interface RoomMap {
  [roomId: string]: Room;
}

/**
 * Singleton class that interfaces Redis state read/written to by all machines
 */
class Rooms {
  // private roomMap: RoomMap;
  // private clientMap: ClientMap; // maps any socket.id to its respective roomId
  // // used in disconnect to find if a user is in a waiting room of a room
  // private waitingList: { [socketId: string]: string };

  // constructor() {
  //   this.roomMap = {};
  //   this.clientMap = {};
  //   this.waitingList = {}; // socketid -> roomId
  // }

  closeRoom(roomId: string): void {
    // delete this.roomMap[roomId];
    roomStateClient.DEL(roomId);
  }

  async addRoom(
    roomId: string,
    youtubeID: string,
    roomType: string
  ): Promise<void> {
    const roomExists: string | null = await getRoomState(roomId);
    if (!roomExists) {
      const roomDetails: Room = {
        clients: [],
        youtubeID,
        // playlist: new Playlist(),
        playlist: [],
        roomType,
        hostId: roomId,
        waitingClients: {}, // socketId -> name
      };
      // this.roomMap[roomId] = roomDetails;
      roomStateClient.SET(roomId, JSON.stringify(roomDetails));
    }
  }

  async getRoomClients(roomId: string): Promise<Client[]> {
    // if (this.roomMap[roomId]) {
    //   return this.roomMap[roomId].clients;
    // }
    // throw new Error('Room with this ID does not exist');
    const roomSnapshot: string | null = await getRoomState(roomId);
    if (roomSnapshot) {
      return JSON.parse(roomSnapshot).clients;
    }
    throw new Error('Room with this ID does not exist');
  }

  async addClient(
    roomId: string,
    clientId: string,
    clientName: string
  ): Promise<void> {
    // if (this.clientMap[clientId]) {
    //   return;
    // }
    // if (this.roomMap[roomId]) {
    //   const newClient: Client = {
    //     id: clientId,
    //     name: clientName,
    //     isMuted: false,
    //   };
    //   this.roomMap[roomId].clients.push(newClient);
    //   this.clientMap[clientId] = roomId;
    //   const room = this.getRoom(roomId);
    //   if (room.hostId.length === 0) room.hostId = clientId;
    // } else {
    //   throw new Error('Room with this ID does not exist');
    // }
    const clientExists: string | null = await getClientRoomId(clientId);
    const roomExists: string | null = await getRoomState(roomId);
    if (clientExists) {
      return;
    }
    if (roomExists) {
      const newClient: Client = {
        id: clientId,
        name: clientName,
        isMuted: false,
      };
      const roomSnapshot: Room = JSON.parse(roomExists);
      roomSnapshot.clients.push(newClient);
      if (!roomSnapshot.hostId) {
        roomSnapshot.hostId = clientId;
      }

      roomStateClient.SET(roomId, JSON.stringify(roomSnapshot));
      clientRoomIdClient.SET(clientId, roomId);
    } else {
      throw new Error('Room with this ID does not exist');
    }
  }

  async removeClient(
    roomId: string,
    clientId: string
  ): Promise<Client[] | void> {
    // if (!this.clientMap[clientId]) {
    //   return;
    // }
    // if (this.roomMap[roomId]) {
    //   const clientList: Client[] = this.getRoomClients(roomId);
    //   for (let i = 0; i < clientList.length; i += 1) {
    //     const client = clientList[i];
    //     if (client.id === clientId) {
    //       clientList.splice(i, 1);
    //       return clientList;
    //     }
    //   }
    // } else {
    //   throw new Error('Room with this ID does not exist');
    // }
    const clientExists: string | null = await getClientRoomId(clientId);
    const roomExists: string | null = await getRoomState(roomId);
    if (!clientExists) {
      return;
    }
    if (roomExists) {
      const roomSnapshot: Room = JSON.parse(roomExists);
      for (let i = 0; i < roomSnapshot.clients.length; i += 1) {
        const client: Client = roomSnapshot.clients[i];
        if (client.id === clientId) {
          roomSnapshot.clients.splice(i, 1);
          roomStateClient.SET(roomId, JSON.stringify(roomSnapshot));
        }
      }
      return roomSnapshot.clients;
    } else {
      throw new Error('Room with this ID does not exist');
    }
  }

  async getClientRoomId(clientId: string): Promise<string> {
    // if (this.clientMap[clientId]) {
    //   return this.clientMap[clientId];
    // }
    // throw new Error('This client ID does not exist');
    const clientRoomId: string | null = await getClientRoomId(clientId);
    if (clientRoomId) {
      return clientRoomId;
    }
    throw new Error('This client ID does not exist');
  }

  async getClient(clientId: string): Promise<Client> {
    // const roomId: string = this.getClientRoomId(clientId);
    // const clientList: Client[] = this.getRoomClients(roomId);
    // const lookup: Client | undefined = clientList.find(
    //   (client: Client) => client.id === clientId
    // );

    // if (!lookup) {
    //   throw new Error('No clients with this ID exist in any rooms');
    // } else {
    //   return lookup;
    // }
    const clientRoomId: string | null = await getClientRoomId(clientId);
    if (!clientRoomId) throw new Error('Client with this ID does not exist');
    const roomSnapshot: string | null = await getRoomState(clientRoomId);
    if (!roomSnapshot) throw new Error('Room with this ID does not exist');

    const lookup: Client | undefined = JSON.parse(roomSnapshot).clients.find(
      (client: Client) => client.id === clientId
    );
    if (!lookup) {
      throw new Error(
        'clientRoomIdClient has this client ID, but it does not exist in room!'
      );
    } else {
      return lookup;
    }
  }

  async isInWaitingList(clientId: string): Promise<boolean> {
    // if (this.waitingList[clientId] === undefined) return false;
    // return true;
    const isWaiting: string | null = await getWaitingClientRoomId(clientId);
    return isWaiting ? true : false;
  }

  mapClientIdToRoomId(socketId: string, roomId: string): void {
    // this.waitingList[socketId] = roomId;
    waitingRoomIdClient.SET(socketId, roomId);
  }

  async removeFromWaiting(socketId: string): Promise<void> {
    // const roomId = this.waitingList[socketId];
    // const room = this.getRoom(roomId);
    // delete this.waitingList[socketId];
    // delete room.waitingClients[socketId];
    const waitingClientRoomId: string | null = await getWaitingClientRoomId(
      socketId
    );
    if (!waitingClientRoomId)
      throw new Error('This client is not in a waiting list');
    const roomExists: string | null = await getRoomState(waitingClientRoomId);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    delete roomSnapshot.waitingClients[socketId];
    roomStateClient.SET(waitingClientRoomId, JSON.stringify(roomSnapshot));
    waitingRoomIdClient.DEL(socketId);
  }

  async getWaitingClientRoomId(socketId: string): Promise<string> {
    // return this.waitingList[socketId];
    const waitingClientRoomId: string | null = await getWaitingClientRoomId(
      socketId
    );
    if (!waitingClientRoomId) {
      throw new Error('This client is not in a waiting list');
    }
    return waitingClientRoomId;
  }

  async updateMute(id: string, roomId: string): Promise<Client[]> {
    // const clients = this.getRoomClients(roomId);
    // for (const client of clients) {
    //   if (client.id === id) client.isMuted = !client.isMuted;
    // }
    // return clients;
    const roomExists: string | null = await getRoomState(roomId);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    for (const client of roomSnapshot.clients) {
      if (client.id === id) client.isMuted = !client.isMuted;
    }
    roomStateClient.SET(roomId, JSON.stringify(roomSnapshot));
    return roomSnapshot.clients;
  }

  async getRoom(roomID: string): Promise<Room> {
    // return this.roomMap[roomID];
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    return JSON.parse(roomExists);
  }

  async setVideoLink(roomID: string, newYoutubeID: string): Promise<void> {
    // if (this.roomMap[roomID]) {
    //   this.roomMap[roomID].youtubeID = newYoutubeID;
    // }
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    roomSnapshot.youtubeID = newYoutubeID;
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async addVideo(roomID: string, youtubeID: string): Promise<void> {
    // if (this.roomMap[roomID]) {
    //   this.roomMap[roomID].playlist.addVideoToTail(youtubeID);
    // }
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    playlistMutator.addVideoToTail(youtubeID);
    roomSnapshot.playlist = playlistMutator.getPlaylistIds();
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async deleteVideo(roomID: string, videoIndex: number): Promise<void> {
    // if (this.roomMap[roomID]) {
    //   this.roomMap[roomID].playlist.deleteVideoAtIndex(videoIndex);
    // }
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    playlistMutator.deleteVideoAtIndex(videoIndex);
    roomSnapshot.playlist = playlistMutator.getPlaylistIds();
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async changeVideo(roomID: string, videoIndex: number): Promise<string> {
    // if (this.roomMap[roomID]) {
    //   const youtubeID = this.roomMap[roomID].playlist.getYoutubeIDAtIndex(
    //     videoIndex
    //   );
    //   this.setVideoLink(roomID, youtubeID);

    //   return youtubeID;
    // } else {
    //   throw new Error('Room with this ID does not exist');
    // }
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    const youtubeId = playlistMutator.getYoutubeIDAtIndex(videoIndex);
    roomSnapshot.youtubeID = youtubeId;
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
    return youtubeId;
  }

  async moveVideo(
    roomID: string,
    oldIndex: number,
    newIndex: number
  ): Promise<void> {
    // this.roomMap[roomID].playlist.moveVideoToIndex(oldIndex, newIndex);
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    playlistMutator.moveVideoToIndex(oldIndex, newIndex);
    roomSnapshot.playlist = playlistMutator.getPlaylistIds();
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async getPlaylistVideoIds(roomId: string): Promise<string[]> {
    // return this.roomMap[roomId].playlist.getPlaylistIds();
    const roomExists: string | null = await getRoomState(roomId);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    return roomSnapshot.playlist;
  }
}

export default new Rooms();
