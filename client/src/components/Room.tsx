import React, {
  useState,
  useEffect,
  useContext,
  ChangeEvent,
  FormEvent,
} from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { createConnection, roomSocketEvents } from '../utils/socket-client';
import { SocketContext } from '../App';
import Video from './Video';
import { ClientContext } from '../contexts/clientContext';
import { VideoContext } from '../contexts/videoContext';
import { ClientStates } from '../utils/enums';
import Chat from './chat/Chat';
import Playlist from './Playlist';

type LocationState = {
  hostId: string;
  displayName: string;
  youtubeID: string;
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
  // Global client state/mutators persisted with sessionStorage
  const {
    clientId,
    setClientId,
    clientDisplayName,
    setClientDisplayName,
    roomYoutubeId,
  } = useContext(SocketContext);

  const [clients, setClients] = useState(
    clientId && clientDisplayName
      ? [{ id: clientId, name: clientDisplayName }]
      : []
  );
  const [displayName, setDisplayName] = useState(clientDisplayName);

  const [enterDisplayName, setEnterDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');

  const [socket, setSocket] = useState(location.socket ? location.socket : {});

  const { clientDispatch, clientData } = useContext(ClientContext);
  const { videoDispatch } = useContext(VideoContext);
  const dispatches = {
    clientDispatch,
    videoDispatch,
  };

  useEffect(() => {
    connectClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDisplayName, roomYoutubeId]);

  const connectClient = async () => {
    // Room host with socket from Landing page
    if (location.socket) {
      clientDispatch({
        type: ClientStates.UPDATE_YOUTUBE_ID,
        youtubeID: roomYoutubeId,
      });
      updateClientList(location.socket);
      setSocket(location.socket);
      roomSocketEvents(location.socket, dispatches);
    }
    // Joining client or Room host that already made connection and refreshed
    else if (clientId && clientDisplayName) {
      const { roomId } = match.params;
      const socketConnection = await createConnection(
        clientDisplayName,
        roomId,
        clientId,
        undefined
      );
      setClientId(socketConnection.id);
      updateClientList(socketConnection);
      updatePlaylist(socketConnection);
      setSocket(socketConnection);
      roomSocketEvents(socketConnection, dispatches);
    }
    // Joining clients: inputted displayName
    else if (!clientId && clientDisplayName) {
      const { roomId } = match.params;
      const socketConnection = await createConnection(
        clientDisplayName,
        roomId,
        undefined,
        undefined
      );
      setClientId(socketConnection.id);
      updateClientList(socketConnection);
      updatePlaylist(socketConnection);
      setSocket(socketConnection);
      roomSocketEvents(socketConnection, dispatches);
    }
    // Joining client from direct URL, prompt for displayName
    else if (!clientId && !clientDisplayName) {
      setEnterDisplayName(true);
    }
  };

  // Subscribes to updateClientList broadcasts from WebSocketServer
  const updateClientList = (connectingSocket: SocketIOClient.Socket) => {
    connectingSocket.on('updateClientList', (newClientList: Client[]) => {
      setClients(newClientList);
    });
  };

  const updatePlaylist = (connectingSocket: SocketIOClient.Socket) => {
    connectingSocket.on('updatePlaylist', (newPlaylist: string[]) => {
      clientDispatch({
        type: ClientStates.DELETE_VIDEO,
        playlist: newPlaylist,
      });
    });
  };

  const handleInputChange = (event: ChangeEvent) => {
    const element = event.target as HTMLInputElement;
    setDisplayNameInput(element.value);
  };

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setDisplayName(displayNameInput);
    setClientDisplayName(displayNameInput);
    setEnterDisplayName(false);

  };

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
      {enterDisplayName ? (
        <div className="card mb-5">
          <div className="card-body">
            <form onSubmit={(event) => handleFormSubmit(event)}>
              <h3 className="mb-3">Enter display name to join session</h3>
              <div className="form-group">
                <label htmlFor="createDisplayName">Display Name</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  id="createDisplayName"
                  onChange={handleInputChange}
                />
                <button type="submit" className="btn btn-warning">
                  Join Session
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="row">
            <div className="col-sm-8">
              <div className="col-sm-12">
                {' '}
                <Video youtubeID={clientData.youtubeID} socket={socket} />
                <h1 className="mb-4">hey, {displayName}</h1>
                <h5 className="mb-4">Currently connected clients:</h5>
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">clientID</th>
                      <th scope="col">First</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client: Client, index) => (
                      <tr key={index}>
                        <td>{client.id}</td>
                        <td>{client.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="col-sm-12">
                <Tabs defaultActiveKey="home" transition={false} id="noanim-tab-example">
                    <Tab eventKey="home" title="Up Next"><Playlist socket={socket} /></Tab>
                    <Tab eventKey="profile" title="Chat"><Chat socket={socket} /></Tab>
                </Tabs>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="col-sm-12">
                <VideoQueue socket={socket}/>
              </div>
            </div>
          </div>
          {/* {' '}
            <Video
              youtubeID={clientData.youtubeID}
              socket={socket}
            />
            <h1 className="mb-4">hey, {displayName}</h1>
            <h5 className="mb-4">Currently connected clients:</h5>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">clientID</th>
                  <th scope="col">First</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client: Client, index) => (
                  <tr key={index}>
                    <td>{client.id}</td>
                    <td>{client.name}</td>
                  </tr>
                ))}
              </tbody>
            </table> */}
          {/* <div>
              <Chat socket={socket} />
            </div> */}
        </div >
      )}
    </div >
  );
};

export default withRouter(Room);
