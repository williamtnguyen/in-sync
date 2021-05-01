import React from 'react';
import { Form, Input, Button, Radio } from 'antd';

const CreateSessionForm = ({
  startSession,
}: {
  startSession: ({ displayName, roomType }: { displayName: string, roomType: string }) => void;
}) => {
  return (
    <Form layout="vertical" onFinish={startSession}>
      <Form.Item label="Display Name" name="displayName">
        <Input placeholder="Please enter your display name for new session" />
      </Form.Item>
      <Form.Item label="Room type" name="roomType" initialValue="public">
        <Radio.Group defaultValue="public">
          <Radio value="public">Public</Radio>
          <Radio value="private">Private</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item>
        <Button type="primary" shape="round" htmlType="submit">
          Start Session
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CreateSessionForm;
