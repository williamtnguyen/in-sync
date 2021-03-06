import React, { useState, useEffect, useContext } from 'react';
import { RouteComponentProps, withRouter, useHistory } from 'react-router-dom';
import {
  openSessionSocket,
  subscribeToRoomEvents,
} from '../utils/session-socket-client';
import { openRtcSocket } from '../utils/rtc-socket-client';
import { SocketContext } from '../App';
import Video from '../components/Video';
import { ClientContext } from '../contexts/clientContext';
import { VideoContext } from '../contexts/videoContext';
import { ClientStates } from '../utils/enums';
import Chat from '../components/chat/Chat';
import Playlist from '../components/Playlist';
import RoomParticipants from '../components/RoomParticipants';
import { MediasoupPeer } from '../utils/MediasoupPeer';

import {
  Row,
  Col,
  Modal,
  Form,
  Input,
  Button,
  Select,
  Alert,
  Space,
  notification,
  Spin,
} from 'antd';
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
  isMuted: boolean;
}

interface AudioDevice {
  deviceId: string;
  deviceName: string;
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
      ? [{ id: clientId, name: clientDisplayName, isMuted: false }]
      : []
  );
  const [waitingClients, setWaitingClients] = useState<{
    [socketId: string]: string;
  }>({});

  const [enterDisplayName, setEnterDisplayName] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectNewAudio, setSelectNewAudio] = useState(false);
  const [canEnter, setCanEnter] = useState(clientId ? true : false);

  const [sessionSocket, setSessionSocket] = useState(
    location.socket ? location.socket : {}
  );
  const [mediasoupPeer, setMediasoupPeer] = useState<MediasoupPeer>();
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<{
    deviceId: string;
  }>({
    deviceId: '',
  });

  const { clientDispatch, clientData } = useContext(ClientContext);
  const { videoDispatch } = useContext(VideoContext);
  const dispatches = {
    clientDispatch,
    videoDispatch,
  };
  const history = useHistory();
  const remoteAudiosDiv = document.getElementById('remoteAudios');

  useEffect(() => {
    connectClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDisplayName]);

  const connectClient = async () => {
    // Room host with socket from Landing page
    if (location.socket) {
      clientDispatch({
        type: ClientStates.UPDATE_YOUTUBE_ID,
        youtubeID: roomYoutubeId,
      });
      setCanEnter(true);
      attachHostNotifs(location.socket);
      setSessionSocket(location.socket);
      subscribeToHostEvents(location.socket);
      subscribeToClientListUpdates(location.socket);
      subscribeToRoomEvents(location.socket, dispatches);
      await startAudioCall(location.socket.id);
    }
    // Joining client from landing, inputted displayName, or Room client
    // that already made connection and refreshed
    else if (
      (!clientId && clientDisplayName) ||
      (clientId && clientDisplayName)
    ) {
      const { roomId } = match.params;
      const socketConnection = await openSessionSocket(
        clientDisplayName,
        '',
        canEnter,
        roomId
      );
      setSessionSocket(socketConnection);

      if (canEnter) {
        await enterRoom(socketConnection);
      } else {
        socketConnection.on('accept', async () => {
          rejoinSocket(roomId, socketConnection);
          setCanEnter(true);
          await enterRoom(socketConnection);
        });
        socketConnection.on('decline', () => {
          socketConnection.disconnect();
          history.push('/');
        });

        const admitClient = async () => {
          rejoinSocket(roomId, socketConnection);
          await enterRoom(socketConnection);
        };
        socketConnection.emit(
          'getRoomType',
          {
            clientName: clientDisplayName,
            roomId,
          },
          admitClient
        );
      }
    }
    // Joining client from direct URL, prompt for displayName
    else if (!clientId && !clientDisplayName) {
      setEnterDisplayName(true);
    }
  };

  const subscribeToClientListUpdates = (
    connectingSocket: SocketIOClient.Socket
  ) => {
    connectingSocket.on('updateClientList', (newClientList: Client[]) => {
      setClients(newClientList);
    });
  };

  const subscribeToPlaylistUpdates = (
    connectingSocket: SocketIOClient.Socket
  ) => {
    connectingSocket.on('updatePlaylist', (newPlaylist: string[]) => {
      clientDispatch({
        type: ClientStates.DELETE_VIDEO,
        playlist: newPlaylist,
      });
    });
  };

  const subscribeToHostEvents = (connectingSocket: SocketIOClient.Socket) => {
    connectingSocket.on('newHost', (hostName: string, hostId: string) => {
      notification.open({
        message: 'New Host',
        description: `${
          connectingSocket.id !== hostId ? `${hostName} is` : 'You are'
        } now the host`,
        duration: 8,
      });

      if (connectingSocket.id === hostId) {
        attachHostNotifs(connectingSocket);
      }
    });
  };

  const attachHostNotifs = (connectingSocket: SocketIOClient.Socket) => {
    connectingSocket.on(
      'waitingClient',
      ({
        waitingClients,
      }: {
        waitingClients: { [socketId: string]: string };
      }) => {
        setWaitingClients(waitingClients);
      }
    );

    connectingSocket.on(
      'updateWaitingClients',
      ({
        waitingClientList,
        clientIdLeft,
      }: {
        waitingClientList: { [socketId: string]: string };
        clientIdLeft: string;
      }) => {
        setWaitingClients(waitingClientList);
        if (clientIdLeft.length > 0) notification.close(clientIdLeft);
      }
    );
  };

  const rejoinSocket = (
    roomId: string,
    connectingSocket: SocketIOClient.Socket
  ) => {
    setCanEnter(true);
    const clientData = {
      roomId,
      clientId: connectingSocket.id,
      clientName: clientDisplayName,
      roomType: '',
      canJoin: true,
    };

    connectingSocket.emit('join', clientData);
  };

  const enterRoom = async (connectingSocket: SocketIOClient.Socket) => {
    setClientId(connectingSocket.id);
    subscribeToHostEvents(connectingSocket);
    subscribeToClientListUpdates(connectingSocket);
    subscribeToPlaylistUpdates(connectingSocket);
    subscribeToRoomEvents(connectingSocket, dispatches);
    await startAudioCall(connectingSocket.id);
  };

  const startAudioCall = async (redisClientId: string) => {
    const { roomId } = match.params;
    const rtcSocket = await openRtcSocket(roomId, redisClientId);
    const deviceId = await setMediaDevices();
    await startMediasoup(rtcSocket, deviceId);
  };

  const setMediaDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const newAudioDevices: AudioDevice[] = [];
    devices.forEach((device) => {
      if (device.kind === 'audioinput') {
        newAudioDevices.push({
          deviceId: device.deviceId,
          deviceName: device.label,
        });
      }
    });
    setAudioDevices(newAudioDevices);
    setSelectedAudioDevice({
      deviceId: newAudioDevices[0].deviceId,
    });
    return newAudioDevices[0].deviceId;
  };

  const startMediasoup = async (
    rtcSocket: SocketIOClient.Socket,
    audioDeviceId: string
  ) => {
    const peer = new MediasoupPeer(rtcSocket, remoteAudiosDiv);
    setMediasoupPeer(peer);
    await peer.init();
    await peer.produce(audioDeviceId);
  };

  const handleAudioSelect = async (device: any) => {
    setSelectedAudioDevice({
      deviceId: device,
    });

    if (mediasoupPeer === undefined) {
      throw new Error('mediasoup peer is undefined');
    }
    mediasoupPeer.closeProducer();
    if (!isMuted) await mediasoupPeer?.produce(device);
  };

  const handleMute = async () => {
    if (mediasoupPeer === undefined) {
      throw new Error('mediasoup peer is undefined');
    }
    if (!isMuted) {
      mediasoupPeer.closeProducer();
      setIsMuted(true);
    } else {
      if (!selectedAudioDevice.deviceId) {
        throw new Error('Device id is undefined');
      }
      await mediasoupPeer.produce(selectedAudioDevice.deviceId);
      setIsMuted(false);
    }

    const newClients = clients;
    for (const client of newClients) {
      if (sessionSocket.id === client.id) client.isMuted = !client.isMuted;
    }
    setClients(newClients);
    sessionSocket.emit('mute', { id: sessionSocket.id });
  };

  const handleFormSubmit = (displayNameInput: string) => {
    setClientDisplayName(displayNameInput);
    setEnterDisplayName(false);
  };

  const handleSelectAudioModal = () => {
    setSelectNewAudio(!selectNewAudio);
  };

  const handleNotification = (socketId: string, status: string) => {
    const newWaitingClients = waitingClients;
    delete newWaitingClients[socketId];
    setWaitingClients(newWaitingClients);
    sessionSocket.emit('waitingResponse', { socketId, status });
    notification.close(socketId);
  };

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
      ) : !canEnter ? (
        <div className={roomStyles.waiting}>
          <h1>Please wait while the host lets you in</h1>
          <Spin size="large" />
        </div>
      ) : (
        <div>
          <div id="remoteAudios" />
          {selectNewAudio && selectedAudioDevice.deviceId && (
            <Modal
              title="Select a new input device"
              onCancel={handleSelectAudioModal}
              visible={selectNewAudio}
              footer={null}
              centered
            >
              <div className={roomStyles.audio__modal}>
                <Select
                  defaultValue={audioDevices[0].deviceName}
                  onChange={handleAudioSelect}
                >
                  {audioDevices.map((audioDevice) => (
                    <Option
                      key={audioDevice.deviceName}
                      value={audioDevice.deviceId}
                    >
                      {audioDevice.deviceName}
                    </Option>
                  ))}
                </Select>
              </div>
            </Modal>
          )}
          {Object.keys(waitingClients).map((socketId) =>
            notification.open({
              key: socketId,
              message: 'Waiting Room Notification',
              description: (
                <Alert
                  message=""
                  description={`${waitingClients[socketId]} wants to join the room`}
                  action={
                    <Space direction="vertical">
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleNotification(socketId, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        danger
                        type="ghost"
                        onClick={() => handleNotification(socketId, 'decline')}
                      >
                        Decline
                      </Button>
                    </Space>
                  }
                />
              ),
              placement: 'topRight',
              duration: 0,
              closeIcon: <div />,
            })
          )}

          <Row gutter={16} className={roomStyles.main__content}>
            <Col sm={16} className={roomStyles.left__col}>
              <RoomParticipants
                clients={clients}
                isMuted={isMuted}
                handleMute={handleMute}
                handleSelectAudioModal={handleSelectAudioModal}
              />
              <Video youtubeID={clientData.youtubeID} socket={sessionSocket} />
              <Playlist socket={sessionSocket} />
            </Col>
            <Col sm={8} className={roomStyles.chat__col}>
              <Chat socket={sessionSocket} />
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default withRouter(Room);
