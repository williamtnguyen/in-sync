import React, { useState, useContext, FormEvent } from 'react';
import Messages from './messages';
import { ClientContext } from '../../contexts/clientContext';

interface ChatProps {
  socket: SocketIOClient.Socket;
}

const Chat = (props: ChatProps) => {
  const { socket } = props;
  const { clientData } = useContext(ClientContext);
  const [message, setMessage] = useState('');

  const onSend = (evt: FormEvent) => {
    evt.preventDefault();
    socket.emit('newMessage', message);
    setMessage('');
  };

  const onMessageChange = (evt: FormEvent<HTMLInputElement>) => {
    setMessage(evt.currentTarget.value);
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        marginTop: '5px',
        borderRadius: '5px',
        border: '1px solid #ddd',
        boxShadow: '3px 3px 5px #eee',
        padding: '10px',
        boxSizing: 'border-box',
      }}
    >
      {/* Commented out, clientList doesn't work rn
                and we already display the participant list 
                below the video 
            */}
      {/* <Participants users={clientData.clientList} /> */}
      <strong>Chatroom</strong>
      <div
        style={{
          height: '1px',
          backgroundColor: '#eee',
          margin: '12px 0',
        }}
      />
      <Messages messages={clientData.messages} />
      <form
        action=""
        onSubmit={onSend}
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <input
          type="text"
          placeholder="Send message"
          value={message}
          onChange={onMessageChange}
          required
          style={{
            width: '100%',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            marginLeft: '10px',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
