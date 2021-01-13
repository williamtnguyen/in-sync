import React, { createContext, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import Landing from './components/Landing';
import Room from './components/Room';
import { VideoContextProvider } from './contexts/videoContext';
import { ClientContextProvider } from './contexts/clientContext';

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
      <ClientContextProvider>
        <VideoContextProvider>
          <SocketContext.Provider value={socketContext}>
            <Route exact path="/room/:id" component={Room} />
            <Route exact path="/" component={Landing} />
          </SocketContext.Provider>
        </VideoContextProvider>
      </ClientContextProvider>
    </Router>
  );
};

export default App;
