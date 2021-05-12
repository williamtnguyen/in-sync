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
  closeRoom(roomId: string): void {
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
        playlist: [],
        roomType,
        hostId: roomId,
        waitingClients: {}, // socketId -> name
      };
      roomStateClient.SET(roomId, JSON.stringify(roomDetails));
    }
  }

  async getRoomClients(roomId: string): Promise<Client[]> {
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
    const clientRoomId: string | null = await getClientRoomId(clientId);
    if (clientRoomId) {
      return clientRoomId;
    }
    throw new Error('This client ID does not exist');
  }

  async getClient(clientId: string): Promise<Client> {
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
    const isWaiting: string | null = await getWaitingClientRoomId(clientId);
    return isWaiting ? true : false;
  }

  mapClientIdToRoomId(socketId: string, roomId: string): void {
    waitingRoomIdClient.SET(socketId, roomId);
  }

  async removeFromWaiting(socketId: string): Promise<void> {
    const waitingClientRoomId: string | null = await getWaitingClientRoomId(
      socketId
    );
    if (!waitingClientRoomId) {
      throw new Error('This client is not in a waiting list');
    }
    const roomExists: string | null = await getRoomState(waitingClientRoomId);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    delete roomSnapshot.waitingClients[socketId];
    roomStateClient.SET(waitingClientRoomId, JSON.stringify(roomSnapshot));
    waitingRoomIdClient.DEL(socketId);
  }

  async getWaitingClientRoomId(socketId: string): Promise<string> {
    const waitingClientRoomId: string | null = await getWaitingClientRoomId(
      socketId
    );
    if (!waitingClientRoomId) {
      throw new Error('This client is not in a waiting list');
    }
    return waitingClientRoomId;
  }

  async updateMute(id: string, roomId: string): Promise<Client[]> {
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
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    return JSON.parse(roomExists);
  }

  async setVideoLink(roomID: string, newYoutubeID: string): Promise<void> {
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    roomSnapshot.youtubeID = newYoutubeID;
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async addVideo(roomID: string, youtubeID: string): Promise<void> {
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    playlistMutator.addVideoToTail(youtubeID);
    roomSnapshot.playlist = playlistMutator.getPlaylistIds();
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async deleteVideo(roomID: string, videoIndex: number): Promise<void> {
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    playlistMutator.deleteVideoAtIndex(videoIndex);
    roomSnapshot.playlist = playlistMutator.getPlaylistIds();
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async changeVideo(roomID: string, videoIndex: number): Promise<string> {
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
    const roomExists: string | null = await getRoomState(roomID);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    const playlistMutator = new Playlist(roomSnapshot.playlist);
    playlistMutator.moveVideoToIndex(oldIndex, newIndex);
    roomSnapshot.playlist = playlistMutator.getPlaylistIds();
    roomStateClient.SET(roomID, JSON.stringify(roomSnapshot));
  }

  async getPlaylistVideoIds(roomId: string): Promise<string[]> {
    const roomExists: string | null = await getRoomState(roomId);
    if (!roomExists) throw new Error('Room with this ID does not exist');
    const roomSnapshot: Room = JSON.parse(roomExists);
    return roomSnapshot.playlist;
  }
}

export default new Rooms();
