import React, {
  useState,
  useEffect,
  useContext,
  ChangeEvent,
  FormEvent,
} from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { createConnection } from '../utils/socket-client';
import { SocketContext } from '../App';
import Video from './video';
import { ClientContext } from '../contexts/clientContext';
import { VideoContext } from '../contexts/videoContext';
import { ClientStates, VideoStates } from '../utils/enums';
import { roomSocketEvents } from '../utils/socket-client';
import Chat from './chat/chat'

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
  const [clients, setClients] = useState(
    location.state ? [location.state.displayName] : []
  );
  const [enterDisplayName, setEnterDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayName, setDisplayName] = useState(
    location.state ? location.state.displayName : ''
  );
  const { hostSocket } = useContext(SocketContext);
  const [socket, setSocket] = useState(hostSocket);
  const { clientDispatch, clientData } = useContext(ClientContext);
  const { videoDispatch } = useContext(VideoContext);
  const dispatches = {
    clientDispatch,
    videoDispatch
  };

  // Creates a socket connection to server if client is not room host
  const connectClient = async () => {

    if (location.state) {
      const { hostId, youtubeID } = location.state;

      // No hostId was sent as prop, therefore new client. Create connection
      if (!hostId) {
        const { id } = match.params;
        const newSocket = await createConnection(displayName, id);
        updateClientList(newSocket);
        setSocket(newSocket);
        roomSocketEvents(newSocket, dispatches);

      }
      // hostId was sent as prop, just subscibe to updateClientList broadcasts
      else {
        clientDispatch({ type: ClientStates.UPDATE_YOUTUBE_ID, youtubeID });
        updateClientList(hostSocket);
        setSocket(location.socket);
        roomSocketEvents(socket, dispatches);
      }
    }
    // Entered room from direct link rather than redirect from landing page. Prompt for displayName
    else {
      setEnterDisplayName(true);
    }
  };

  // Subscribes to updateClientList broadcasts from WebSocketServer
  const updateClientList = (socket: SocketIOClient.Socket) => {
    socket.on('updateClientList', (newClientList: Client[]) => {
      setClients(newClientList);
    });
  };

  const handleInputChange = (event: ChangeEvent) => {
    const element = event.target as HTMLInputElement;
    setDisplayNameInput(element.value);
  };

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const { id } = match.params;
    const newSocket = await createConnection(displayNameInput, id);
    setDisplayName(displayNameInput);
    updateClientList(newSocket);
    setSocket(newSocket);
    roomSocketEvents(newSocket, dispatches);
    setEnterDisplayName(false);
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
                  </table>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="col-sm-12">
                  <Chat socket={socket} />
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
          </div>
        )}
    </div>
  );
};

export default withRouter(Room);
