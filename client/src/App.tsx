import React, { createContext, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import Landing from './components/landing';
import Room from './components/room';

interface SocketContextProps {
  hostSocket: any;
  updateHostSocketBuffer: any;
}

export const SocketContext = createContext({} as SocketContextProps);

const App = () => {
  const [socket, setSocket] = useState({});
  const updateSocket = (socket: SocketIOClient.Socket) => {
    setSocket(socket);
  };

  const socketContext = {
    hostSocket: socket,
    updateHostSocketBuffer: updateSocket,
  };
  return (
    <SocketContext.Provider value={socketContext}>
      <Router>
        <Route exact path="/room/:id" component={Room} />
        <Route exact path="/" component={Landing} />
      </Router>
    </SocketContext.Provider>
  );
};

export default App;
