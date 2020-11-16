import React, {
    useEffect,
    createRef,
} from 'react';

interface propsMessages {
    messages: [],
}

interface propsMessage {
    children: string,
    user: string,
    key: string,
}

interface message {
    client: string,
    clientId: string,
    message: string
}

function Messages(props: propsMessages) {
    let messageEnd = createRef<HTMLDivElement>();
    let messagesContainer = createRef<HTMLDivElement>();
    const { messages } = props;

    const scrollDown = () => {
        if (!messagesContainer.current || !messageEnd.current) return;

        const {
            clientHeight,
            scrollTop,
            scrollHeight,
        } = messagesContainer.current;

        const totalMessages = messagesContainer.current.children.length;
        const newMessage = messagesContainer.current.children[totalMessages - 2];
        const lastMessage = totalMessages > 2 ? messagesContainer.current.children[totalMessages - 3] : null;

        if (!newMessage || !lastMessage) return;

        const newMessageHeight = newMessage.clientHeight;
        const lastMessageHeight = lastMessage.clientHeight;

        if (clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight - 15) {
            messageEnd.current.scrollIntoView();
        }
    };

    useEffect(scrollDown, [messages]);

    return (
        <div ref={messagesContainer}
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1',
                padding: '5px',
                boxSizing: 'border-box',
                overflowY: 'auto'
            }}>
            { console.log(messages)}
            {messages.map((message: message) => (
                <Message user={message.client} key={message.clientId}>
                    {message.message}
                </Message>
            ))}
            <div className='temp' ref={messageEnd}></div>
        </div>
    );

}

const Message = (props: propsMessage) => {
    return props.user !== null ? (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                fontSize: '1.2em',
                marginBottom: '10px',
                boxSizing: 'border-box'
                // if admin, text-align: center, color: grey
            }}>
            <div style={{
                fontWeight: 'normal',
                fontSize: '0.85em',
                marginBottom: '3px',
                marginLeft: '8px'
            }}>
                {props.user}:
            </div>
            <div style={{
                padding: '0px 10px',
                fontWeight: 'normal',
                fontSize: '0.9em',
                backgroundColor: 'transparent', // or #eee if admin
                width: 'auto', // or 80% if admin
                borderRadius: '15px'
            }}>
                {props.children}
            </div>
        </div>
    ) : (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '0.9em',
                    marginBottom: '10px',
                    boxSizing: 'border-box'
                    // if admin, text-align: center, color: grey
                }}>
                <div style={{
                    padding: '8px 10px',
                    fontWeight: 'normal',
                    fontSize: '0.9em',
                    backgroundColor: 'transparent', // or #eee if admin
                    width: 'auto', // or 80% if admin
                    borderRadius: '15px'
                }}>
                    {props.children}
                </div>
            </div>
        );
};


export default Messages;