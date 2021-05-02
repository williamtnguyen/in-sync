import React, { useContext } from 'react';
import { openSessionSocket } from '../utils/session-socket-client';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { SocketContext } from '../App';
import CreateSessionForm from '../components/CreateSessionForm';
import JoinSessionForm from '../components/JoinSessionForm';

import { Divider, Tabs } from 'antd';
import { VideoCameraAddOutlined } from '@ant-design/icons';
import landingStyles from '../styles/pages/landing.module.scss';
const { TabPane } = Tabs;

const Landing = (props: RouteComponentProps & any) => {
  const { setClientId, setClientDisplayName } = useContext(SocketContext);

  const startSession = async ({
    displayName,
    roomType,
  }: {
    displayName: string;
    roomType: string;
  }) => {
    const newSocket = await openSessionSocket(displayName, roomType, true);

    setClientId(newSocket.id);
    setClientDisplayName(displayName);

    props.history.push({
      pathname: `/room/${newSocket.id}`,
      socket: newSocket, // Send socket object as a prop to prevent redundant connection creation
    });
  };

  const joinSession = ({
    roomId,
    displayName,
  }: {
    roomId: string;
    displayName: string;
  }) => {
    setClientDisplayName(displayName);

    props.history.push({
      pathname: `/room/${roomId}`,
    });
  };

  return (
    <div className={landingStyles.root}>
      <div className={landingStyles.content}>
        <h1>
          <VideoCameraAddOutlined /> in-sync
        </h1>
        <Divider />
        <Tabs defaultActiveKey="Create">
          <TabPane tab="Create a session" key="Create">
            <CreateSessionForm startSession={startSession} />
          </TabPane>
          <TabPane tab="Join a session" key="Join">
            <JoinSessionForm joinSession={joinSession} />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default withRouter(Landing);
