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
import { MediasoupPeer } from './MediasoupPeer';

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
  const [mediasoupPeer, setMediasoupPeer] = useState<MediasoupPeer>();

  const [enterDisplayName, setEnterDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');

  const [socket, setSocket] = useState(location.socket ? location.socket : {});

  const { clientDispatch, clientData } = useContext(ClientContext);
  const { videoDispatch } = useContext(VideoContext);
  const dispatches = {
    clientDispatch,
    videoDispatch,
  };
  const [ isMuted, setIsMuted ] = useState(false);
  const remoteAudiosDiv = document.getElementById('remoteAudios');

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
      console.log('Start mediadevice');      
      await setMediaDevices();
      console.log('Start mediasoup');      
      await startMediasoup(location.socket);
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
      console.log('Start mediadevice');      
      await setMediaDevices();
      console.log('Start mediasoup');      
      await startMediasoup(socketConnection);
    }
    // Joining clients: inputted displayName
    else if (!clientId && clientDisplayName) {
      console.log('display name was inputted');
      
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
      console.log('Start mediadevice');      
      await setMediaDevices();
      console.log('Start mediasoup');
      await startMediasoup(socketConnection);
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

  const setMediaDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach(device => {
      let selectedAudioElem = null;
      if ('audioinput' === device.kind) {
        selectedAudioElem = document.getElementById('audioSelect') as HTMLSelectElement;
      }
      if(!selectedAudioElem) 
        return;
  
      let option = document.createElement('option') as HTMLOptionElement;
      option.value = device.deviceId;
      option.innerText = device.label;
      selectedAudioElem.appendChild(option);
    });
  }

  const startMediasoup = async (connectingSocket: SocketIOClient.Socket) => {
    console.log('creating mediasoup peer');
    let peer = new MediasoupPeer(connectingSocket, remoteAudiosDiv);
    setMediasoupPeer(peer);
    await peer.init();
    let audioSelectElem = document.getElementById('audioSelect') as HTMLSelectElement;
    await peer.produce('audioType', audioSelectElem?.value);
    console.log('finished creating mediasoup peer');
  }

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

  const mutePeer = async () => {
    console.log('mediasoup peer: ', mediasoupPeer);
    if (mediasoupPeer === undefined) throw new Error('mediasoup peer is undefined');
    if (!isMuted) {
      mediasoupPeer.closeProducer();
      setIsMuted(true);
    } 
    else {
      await setMediaDevices();
      await startMediasoup(socket);
      setIsMuted(false);
    }
  }

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
          <div id="remoteAudios"></div>
          audio: <select id="audioSelect" style={{marginBottom: "25px", marginRight: "25px"}}></select>
          <button onClick={mutePeer}>{isMuted ? 'Unmute' : 'Mute'}</button>
          
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
