import React, { useState, useEffect, useContext } from 'react';
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
import { MediasoupPeer } from '../utils/MediasoupPeer';

import { Row, Col, Modal, Form, Input, Button } from 'antd';
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

  const [enterDisplayName, setEnterDisplayName] = useState(false);
  const [ isMuted, setIsMuted ] = useState(false);

  const [socket, setSocket] = useState(location.socket ? location.socket : {});
  const [mediasoupPeer, setMediasoupPeer] = useState<MediasoupPeer>();

  const { clientDispatch, clientData } = useContext(ClientContext);
  const { videoDispatch } = useContext(VideoContext);
  const dispatches = {
    clientDispatch,
    videoDispatch,
  };
  const remoteAudiosDiv = document.getElementById('remoteAudios');

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
        roomId
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

  const handleFormSubmit = (displayNameInput: string) => {
    setClientDisplayName(displayNameInput);
    setEnterDisplayName(false);
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

  const startMediasoup = async (connectingSocket: SocketIOClient.Socket) => {
    console.log('creating mediasoup peer');
    let peer = new MediasoupPeer(connectingSocket, remoteAudiosDiv);
    setMediasoupPeer(peer);
    await peer.init();
    let audioSelectElem = document.getElementById('audioSelect') as HTMLSelectElement;
    await peer.produce('audioType', audioSelectElem?.value);
    console.log('finished creating mediasoup peer');
  }


  return (
    <div className={`${roomStyles.root} container`}>
      {enterDisplayName ? (
        <Modal
          title="Enter a display name to join the session"
          visible
          closable={false}
          centered
          footer={null}
        >
          <Form
            layout="vertical"
            onFinish={(fieldValues) =>
              handleFormSubmit(fieldValues.displayNameInput)
            }
          >
            <Form.Item name="displayNameInput">
              <Input placeholder="Enter a display name..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" shape="round" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      ) : (
        <Row gutter={16} className={roomStyles.main__content}>
          <div id="remoteAudios"></div>
          audio: <select id="audioSelect" style={{marginBottom: "25px", marginRight: "25px"}}></select>
          <button onClick={mutePeer}>{isMuted ? 'Unmute' : 'Mute'}</button>
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
