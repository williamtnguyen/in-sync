import React, { useState, useContext, ChangeEvent, FormEvent } from 'react';
import { createConnection } from '../utils/socket-client';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { SocketContext } from '../App';
import { extractVideoID } from '../utils/helpers';

const Landing = (props: RouteComponentProps & any) => {
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const { updateHostSocketBuffer } = useContext(SocketContext);

  const startSession = async (event: FormEvent, displayName: string, youtubeURL: string) => {
    event.preventDefault();
    const youtubeID = extractVideoID(youtubeURL);
    const newSocket = await createConnection(displayName, undefined, youtubeID);

    updateHostSocketBuffer(newSocket);

    props.history.push({
      pathname: `/room/${newSocket.id}`,
      state: { hostId: newSocket.id, displayName, youtubeID },
      socket: newSocket
    });
  };

  const joinSession = (roomId: string, displayName: string) => {
    props.history.push({
      pathname: `/room/${roomId}`,
      state: { displayName },
    });
  };

  const handleInputChange = (event: ChangeEvent) => {
    const element = event.target as HTMLInputElement;

    switch (element.id) {
      case 'createDisplayName':
        setCreateDisplayName(element.value);
        break;
      case 'setYoutubeLink':
        setYoutubeLink(element.value);
        break;
      case 'joinRoomId':
        setJoinRoomId(element.value);
        break;
      default:
        setJoinDisplayName(element.value);
        break;
    }
  };

  return (
    <div
      className="container"
      style={{
        height: '100vh',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div>
        <h1>Create a room, or join one</h1>
        <hr className="mb-5"></hr>
        <div className="card mb-5">
          <div className="card-body">
            <form onSubmit={(event) => startSession(event, createDisplayName, youtubeLink)}>
              <h3 className="mb-3">Create a new room</h3>
              <div className="form-group">
                <label htmlFor="createDisplayName">Display Name</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  id="createDisplayName"
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="setYoutubeLink">Youtube Link</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  id="setYoutubeLink"
                  onChange={handleInputChange}
                  required
                />
                <button type="submit" className="btn btn-warning">
                  Start session
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <form onSubmit={() => joinSession(joinRoomId, joinDisplayName)}>
              <h3 className="mb-3">Join an existing room</h3>
              <div className="form-group">
                <label htmlFor="joinRoomId">Room ID</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  id="joinRoomId"
                  onChange={handleInputChange}
                />
                <label htmlFor="joinDisplayName">Display Name</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  id="joinDisplayName"
                  onChange={handleInputChange}
                />
                <button type="submit" className="btn btn-warning">
                  Join session
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(Landing);
