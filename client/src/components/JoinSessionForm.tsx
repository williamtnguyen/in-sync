import React from 'react';
import { Form, Input, Button } from 'antd';

const JoinSessionForm = ({
  joinSession,
}: {
  joinSession: ({
    roomId,
    displayName,
  }: {
    roomId: string;
    displayName: string;
  }) => void;
}) => {
  return (
    <Form layout="vertical" onFinish={joinSession}>
      <Form.Item label="Room Session ID" name="roomId">
        <Input placeholder="Please enter the ID of the session to join" />
      </Form.Item>
      <Form.Item label="Display Name" name="displayName">
        <Input placeholder="Please enter your display name for new session" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" shape="round" htmlType="submit">
          Join Session
        </Button>
      </Form.Item>
    </Form>
  );
};

export default JoinSessionForm;
