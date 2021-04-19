import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import participantStyles from '../styles/components/room-participants.module.scss';

interface Client {
  id: string;
  name: string;
}

const RoomParticipants = ({ clients }: { clients: Client[] }) => {
  return (
    <div className={participantStyles.root}>
      <h3>Participants ({clients.length})</h3>

      <div className={participantStyles.participants__container}>
        {clients.map((client: Client) => (
          <div
            key={client.id}
            className={participantStyles.participant__avatar}
          >
            <Avatar size="default" icon={<UserOutlined />} />
            <p>{client.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomParticipants;
