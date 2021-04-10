import React, {
  useState,
  useEffect,
  useContext,
  ChangeEvent,
  FormEvent,
} from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { createConnection, roomSocketEvents } from '../utils/socket-client';
import { SocketContext } from '../App';
import Video from '../components/Video';
import { ClientContext } from '../contexts/clientContext';
import { VideoContext } from '../contexts/videoContext';
import { ClientStates } from '../utils/enums';
import Chat from '../components/chat/Chat';
import Playlist from '../components/Playlist';
import RoomParticipants from '../components/RoomParticipants';

import { Row, Col } from 'antd';
import roomStyles from '../styles/pages/room.module.scss';

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
  }, [clientDisplayName]);

  const connectClient = async () => {
    // Room host with socket from Landing page
    if (location.socket) {
      // TODO: remove this
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
        roomId
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
        roomId
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
    <div className={`${roomStyles.root} container`}>
      {/* TODO: make this a modal */}
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
        <Row gutter={16} className={roomStyles.main__content}>
          <Col sm={16} className={roomStyles.left__col}>
            <RoomParticipants clients={clients} />
            <Video youtubeID={clientData.youtubeID} socket={socket} />
            <Playlist socket={socket} />
          </Col>
          <Col sm={8}>
            <Chat socket={socket} />
          </Col>
        </Row>
      )}
    </div>
  );
};

export default withRouter(Room);
