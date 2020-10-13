import React, { useState, useEffect, useContext } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { createConnection } from '../utils/socket-client';
import { SocketContext } from '../App';

type LocationState = {
  hostId: string;
  displayName: string;
};

type MatchParams = {
  id: string;
};

type RoomProps = RouteComponentProps<MatchParams, {}, LocationState>;

interface Client {
  id: string;
  name: string;
}

const Room = ({ location, match }: RoomProps & any) => {
  const [clients, setClients] = useState([location.state.displayName]);
  const { hostSocket } = useContext(SocketContext);

  // Connects a client if they are not host and subscribes to the room's broadcasts
  const connectClient = async () => {
    const { hostId, displayName } = location.state;

    if (!hostId) {
      const { id } = match.params;
      const newSocket = await createConnection(displayName, id);
      updateClientList(newSocket);
    } else {
      updateClientList(hostSocket);
    }
  };

  const updateClientList = (socket: SocketIOClient.Socket) => {
    socket.on('updateClientList', (newClientList: Client[]) => {
      // console.log(newClientList);
      setClients(newClientList);
    });
  };

  useEffect(() => {
    connectClient();
  }, []);

  return (
    <div
      className="container"
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="text-center">
        {' '}
        <h1 className="mb-4">hey, {location.state.displayName}</h1>
        <h5 className="mb-4">Currently connected clients:</h5>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">clientID</th>
              <th scope="col">First</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client: Client) => (
              <tr key={client.id}>
                <td>{client.id}</td>
                <td>{client.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default withRouter(Room);
