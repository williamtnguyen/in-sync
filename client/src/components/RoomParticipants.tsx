import React from 'react';
import { Avatar, Button } from 'antd';
import { AudioMutedOutlined, AudioOutlined, UserOutlined } from '@ant-design/icons';

import participantStyles from '../styles/components/room-participants.module.scss';

interface Client {
  id: string;
  name: string;
}

const RoomParticipants = ({ 
  clients, 
  isMuted, 
  handleMute 
}: { 
  clients: Client[],
  isMuted: boolean,
  handleMute: {(): Promise<void>}
}) => {
  return (
    <div className={participantStyles.root}>
      <h3>Participants ({clients.length})</h3>
      {isMuted ? (
        <Button shape='round' size='small' onClick={handleMute}>
          <AudioMutedOutlined className={participantStyles.participant__muted} />
          Unmute
        </Button>
      ) : (
        <Button shape='round' size='small' onClick={handleMute}>
          <AudioOutlined className={participantStyles.participant__unmuted} />
          Mute
        </Button>
      )}

      <div className={participantStyles.participants__container}>
        {clients.map((client: Client) => (
          <div
            key={client.id}
            className={participantStyles.participant__avatar}
          >
            <Avatar className={client.id} size="default" icon={<UserOutlined />} />
            <p>{client.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomParticipants;
