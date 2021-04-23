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
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<{
    deviceId: string | undefined
  }>({
    deviceId: undefined
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDisplayName]);

  useEffect(() => {
    console.log('selected audio device changed: ', selectedAudioDevice);
    
    if (selectedAudioDevice.deviceId !== undefined) 
      startMediasoup(socket, selectedAudioDevice.deviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioDevice]);
  
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
  }

  const setMediaDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    let newAudioDevices: AudioDevices[] = [];    
    devices.forEach(device => {
      if (device.kind === 'audioinput') {
        newAudioDevices.push({
          deviceId: device.deviceId,
          deviceName: device.label
        });
      }
    });
    setAudioDevices(newAudioDevices);
    setSelectedAudioDevice({ 
      deviceId: newAudioDevices[0].deviceId
    });
    // return newAudioDevices[0].deviceId;
  }

  const startMediasoup = async (socket: SocketIOClient.Socket, audioDeviceId: string) => {
    // console.log('creating mediasoup peer');
    let peer = new MediasoupPeer(socket, remoteAudiosDiv);
    await setMediasoupPeer(peer);
    await peer.init();
    console.log(audioDeviceId);
    await peer.produce(audioDeviceId);
    // console.log('finished creating mediasoup peer');
  }

  const handleAudioSelect = async (device: any) => {
    console.log('selected device: ', device);
     
    setSelectedAudioDevice({
      deviceId: device
    });

    if (mediasoupPeer === undefined) throw new Error('mediasoup peer is undefined');
    mediasoupPeer.closeProducer();
    await mediasoupPeer?.produce(device);
  }

  const handleMute = async () => {
    if (mediasoupPeer === undefined) throw new Error('mediasoup peer is undefined');
    if (isMuted === false) {
      mediasoupPeer.closeProducer();
      setIsMuted(true);
    }
    else {
      // await startAudioCall(socket);
      if (selectedAudioDevice.deviceId === undefined) throw new Error('Device id is undefined');
      await mediasoupPeer.produce(selectedAudioDevice.deviceId);
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
            {selectedAudioDevice.deviceId && selectedAudioDevice.deviceId.length > 0 && (
              <div style={{'marginTop': '4em'}}>
                <p style={{'display':'inline'}}>audio: </p>
                {/* <Form style={{'display':'inline'}}>
                  <Form.Item> */}
                    {/* {console.log(audioDevices)} */}
                    <Select 
                      defaultValue={audioDevices[0].deviceName}
                      onChange={handleAudioSelect}
                    >{
                      audioDevices.map((audioDevice) => (
                        <Option key={audioDevice.deviceName} value={audioDevice.deviceId}>{audioDevice.deviceName}</Option>  
                      ))
                    }</Select>
                  {/* </Form.Item>
                </Form> */}
              </div>
            )}

          <Row gutter={16} className={roomStyles.main__content}>
            <Col sm={16} className={roomStyles.left__col}>
              <RoomParticipants 
                clients={clients} 
                isMuted={isMuted}
                handleMute={handleMute} 
              />
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
