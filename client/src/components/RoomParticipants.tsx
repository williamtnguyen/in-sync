import React from 'react';
import { Avatar, Button, Badge } from 'antd';
import { AudioMutedOutlined, AudioOutlined, UserOutlined } from '@ant-design/icons';

import participantStyles from '../styles/components/room-participants.module.scss';

interface Client {
  id: string;
  name: string;
  isMuted: boolean;
}

const RoomParticipants = ({
  clients,
  isMuted,
  handleMute,
  handleSelectAudioModal
}: {
  clients: Client[],
  isMuted: boolean,
  handleMute: () => void,
  handleSelectAudioModal: () => void
}) => {
  return (
    <div className={participantStyles.root}>
      <h3 className={participantStyles.title}>Participants ({clients.length})</h3>
      {isMuted ? (
        <Button shape="round" size="small" onClick={handleMute}>
          <AudioMutedOutlined className={participantStyles.participant__muted} />
          Unmute
        </Button>
      ) : (
        <Button shape="round" size="small" onClick={handleMute}>
          <AudioOutlined className={participantStyles.participant__unmuted} />
          Mute
        </Button>
      )}
      <Button
        shape="round"
        size="small"
        onClick={handleSelectAudioModal}
        style={{ marginLeft: '0.5em' }}
      >
        Change audio device
      </Button>

      <div className={participantStyles.participants__container}>
        {clients.map((client: Client) => (
          <div
            key={client.id}
            className={participantStyles.participant__avatar}
          >
            {client.isMuted ? (
              <Badge count={<AudioMutedOutlined style={{ color: 'red' }}/>}>
                <Avatar className={client.id} size="default" icon={<UserOutlined />} />
              </Badge>
            ) : (
              <Avatar className={client.id} size="default" icon={<UserOutlined />} />
            )}
            <p>{client.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomParticipants;
