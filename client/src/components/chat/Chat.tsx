import React, { useContext } from 'react';
import Messages from './messages';
import { ClientContext } from '../../contexts/clientContext';

import { Form, Input, Button } from 'antd';
import chatStyles from '../../styles/components/chat.module.scss';

interface ChatProps {
  socket: SocketIOClient.Socket;
}

const Chat = (props: ChatProps) => {
  const { socket } = props;
  const { clientData } = useContext(ClientContext);
  const [form] = Form.useForm();

  const onSend = (fieldValues: any) => {
    socket.emit('newMessage', fieldValues.message);
    form.resetFields();
  };

  return (
    <div className={chatStyles.root}>
      <h3>Activity Log / Session Chat</h3>
      <Messages messages={clientData.messages} />

      <Form form={form} layout="inline" onFinish={onSend}>
        <Form.Item name="message" className={chatStyles.message__input}>
          <Input placeholder="Send a message..." autoComplete="off" />
        </Form.Item>
        <Form.Item className={chatStyles.send__btn}>
          <Button type="primary" shape="round" htmlType="submit">
            Send
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Chat;
