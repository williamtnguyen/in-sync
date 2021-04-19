import React from 'react';

interface ParticipantsProps {
  users: [];
}

interface Client {
  id: string;
  name: string;
}

const Participants = (props: ParticipantsProps) => {
  return (
    <React.Fragment>
      <div>
        <strong>Participants</strong>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: '6px',
        }}
      >
        {props.users.map((client: Client) => (
          <div
            key={client.id}
            style={{
              boxSizing: 'border-box',
              padding: '3px 20px',
              border: '1.5px solid orange',
              textAlign: 'center',
              fontWeight: 'normal',
              marginRight: '5px',
              borderRadius: '10px',
              fontSize: '0.7em',
            }}
          >
            {client.name}
          </div>
        ))}
      </div>
      <div
        style={{
          height: '1px',
          backgroundColor: '#eee',
          margin: '12px 0',
        }}
      />
    </React.Fragment>
  );
};

export default Participants;
