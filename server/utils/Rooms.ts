export interface Client {
  id: string;
  name: string;
}

export interface ClientMap {
  [clientId: string]: string;
}

export interface RoomMap {
  [roomId: string]: Client[];
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

  addRoom(roomId: string): void {
    if (!this.roomMap[roomId]) {
      this.roomMap[roomId] = [];
    }
  }

  getRoomClients(roomId: string): Client[] {
    if (this.roomMap[roomId]) {
      return this.roomMap[roomId];
    }
    throw new Error('Room with this ID does not exist');
  }

  addClient(roomId: string, clientId: string, clientName: string): void {
    if (this.roomMap[roomId]) {
      const newClient: Client = { id: clientId, name: clientName };
      this.roomMap[roomId].push(newClient);
      this.clientMap[clientId] = roomId;
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
}

export default new Rooms();
