import React, {
    useState,
    useContext,
    FormEvent,
} from 'react';
import Messages from './messages';
import Participants from './chatParticipants';
import { ClientContext } from '../../contexts/clientContext'

interface props {
    socket: SocketIOClient.Socket
}

function Chat(props: props) {
    const { socket } = props;
    const { clientData } = useContext(ClientContext);
    const [message, setMessage] = useState('');

    const onSend = (evt: FormEvent) => {
        console.log('onSend triggered'); // visible
        evt.preventDefault();
        socket.emit('newMessage', message);
        console.log(clientData); // visible
        console.log('message sent', message); // visible
        setMessage('');
    };

    const onMessageChange = (evt: FormEvent<HTMLInputElement>) => {
        console.log('on message change triggered'); // visible
        setMessage(evt.currentTarget.value);
    }

    return (
        <div style={{
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '456px',
            marginTop: '5px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            boxShadow: '3px 3px 5px #eee',
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <Participants users={clientData.clientList} />
            <Messages messages={clientData.messages} />
            <form action=""
                onSubmit={onSend}
                style={{
                    display: 'flex',
                    flexDirection: 'row'
                }}>
                <input
                    type="text"
                    placeholder='Send message'
                    value={message}
                    onChange={onMessageChange}
                    required
                />
                <button type='submit' style={{
                    minWidth: '0',
                    padding: '0 20px',
                    backgroundColor: 'palegreen'
                }}>Send</button>
            </form>
        </div>
    );
}

export default Chat;