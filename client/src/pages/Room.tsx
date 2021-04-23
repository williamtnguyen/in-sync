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

import { Row, Col, Modal, Form, Input, Button, Select } from 'antd';
import roomStyles from '../styles/pages/room.module.scss';
const { Option } = Select;

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

interface AudioDevices {
  deviceId: string,
  deviceName: string
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
  const [isMuted, setIsMuted] = useState(false);

  const [socket, setSocket] = useState(location.socket ? location.socket : {});
  const [mediasoupPeer, setMediasoupPeer] = useState<MediasoupPeer>();
  const [audioDevices, setAudioDevices] = useState<AudioDevices[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<{deviceId: string}>({
    deviceId: '', 
    // deviceName: ''
  });

  const { clientDispatch, clientData } = useContext(ClientContext);
  const { videoDispatch } = useContext(VideoContext);
  const dispatches = {
    clientDispatch,
    videoDispatch,
  };
  const remoteAudiosDiv = document.getElementById('remoteAudios');

  useEffect(() => {
    connectClient();
    setMediaDevices();
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
      await startAudioCall(location.socket);
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
      await startAudioCall(socketConnection);
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
      await startAudioCall(socketConnection);
    }
    // Joining client from direct URL, prompt for displayName
    else if (!clientId && !clientDisplayName) {
      setEnterDisplayName(true);
    }
  };

  // Subscribes to updateClientList broadcasts from WebSocketServer
  const updateClientList = (connectingSocket: SocketIOClient.Socket) => {
    connectingSocket.on('updateClientList', (newClientList: Client[]) => {
      console.log('client list: ', newClientList);
      
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

  const startAudioCall = async (socket: SocketIOClient.Socket) => {
    await setMediaDevices();
    await startMediasoup(socket);
  }

  const setMediaDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    let newAudioDevices: AudioDevices[] = [];    
    devices.forEach(device => {
      newAudioDevices.push({
        deviceId: device.deviceId,
        deviceName: device.label
      });
    });
    // console.log('new audio devices: ', newAudioDevices);
    
    setAudioDevices(newAudioDevices);
    // setSelectedAudioDevice(newAudioDevices[0]);
    setSelectedAudioDevice({ deviceId: newAudioDevices[0].deviceId });
  }

  const startMediasoup = async (connectingSocket: SocketIOClient.Socket) => {
    // console.log('creating mediasoup peer');
    // if (selectedAudioDevice.deviceId === '') throw new Error('No audio device id');
    let peer = new MediasoupPeer(connectingSocket, remoteAudiosDiv);
    setMediasoupPeer(peer);
    await peer.init();
    await peer.produce('audioType', selectedAudioDevice.deviceId);
    // console.log('finished creating mediasoup peer');
  }

  // const handleAudioSelect = (device: any) => {   
  //   console.log('selected device: ', device);
     
  //   // setSelectedAudioDevice({
  //   //   deviceId: device
  //   // });
  //   // if (mediasoupPeer !== undefined)
  //   //   await mediasoupPeer.produce('audioType', device);
  // }

  const mutePeer = async () => {
    if (mediasoupPeer !== undefined) {
      mediasoupPeer.closeProducer();
      setMediasoupPeer(undefined);
      setIsMuted(true);
    } 
    else {
      await startAudioCall(socket);
      setIsMuted(false);
    }
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
        <div>
            {/* {console.log('selected audio device: ', selectedAudioDevice)} */}
            <div id="remoteAudios"></div>
            {/* {selectedAudioDevice && selectedAudioDevice.deviceId.length > 0 && (
              <div style={{'marginTop': '4em'}}>
                <p style={{'display':'inline'}}>audio: </p> */}
                {/* wrap select in a form and onsubmit */}
                {/* <Select 
                  defaultValue={audioDevices[0].deviceName}
                  onChange={handleAudioSelect}
                  labelInValue
                >{
                  audioDevices.map((audioDevice, index) => (
                    <Option key={index} value={audioDevice.deviceId}>{audioDevice.deviceName}</Option>  
                  ))
                }</Select>
                <button onClick={mutePeer}>{isMuted ? 'Unmute' : 'Mute'}</button>
                </div>
              )} */}
              <button onClick={mutePeer}>{isMuted ? 'Unmute' : 'Mute'}</button>

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
        </div>
      )}
    </div>
  );
};

export default withRouter(Room);
