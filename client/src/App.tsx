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

  const socketContext = {
    hostSocket: socket,
    updateHostSocketBuffer: setSocket,
  };

  return (
    <Router>
      <SocketContext.Provider value={socketContext}>
        <Route exact path="/room/:id" component={Room} />
        <Route exact path="/" component={Landing} />
      </SocketContext.Provider>
    </Router>
  );
};

export default App;
