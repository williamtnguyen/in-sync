import { RedisClient } from 'redis';
import { promisify } from 'util';

const adapterPubClient = new RedisClient({
  host:
    process.env.NODE_ENV === 'production'
      ? 'redisSocketIoAdapter'
      : 'localhost',
  port: 6379,
});
const adapterSubClient = adapterPubClient.duplicate();

// roomId -> strinigified json blob of room state
const roomStateClient = new RedisClient({
  host: process.env.NODE_ENV === 'production' ? 'redisRoomState' : 'localhost',
  port: 6380,
});
const getRoomState = promisify(roomStateClient.get).bind(roomStateClient);

// clientId -> roomId
const clientRoomIdClient = new RedisClient({
  host:
    process.env.NODE_ENV === 'production' ? 'redisClientRoomId' : 'localhost',
  port: 6381,
});
const getClientRoomId = promisify(clientRoomIdClient.get).bind(
  clientRoomIdClient
);

// socketId/clientId -> roomId
const waitingRoomIdClient = new RedisClient({
  host:
    process.env.NODE_ENV === 'production' ? 'redisWaitingRoomId' : 'localhost',
  port: 6382,
});
const getWaitingClientRoomId = promisify(waitingRoomIdClient.get).bind(
  waitingRoomIdClient
);

export default {
  adapterPubClient,
  adapterSubClient,
  roomStateClient,
  getRoomState,
  clientRoomIdClient,
  getClientRoomId,
  waitingRoomIdClient,
  getWaitingClientRoomId,
};
