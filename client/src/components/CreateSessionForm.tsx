import React from 'react';
import { Form, Input, Button } from 'antd';

const CreateSessionForm = ({
  startSession,
}: {
  startSession: ({ displayName }: { displayName: string }) => void;
}) => {
  return (
    <Form layout="vertical" onFinish={startSession}>
      <Form.Item label="Display Name" name="displayName">
        <Input placeholder="Please enter your display name for new session" />
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
