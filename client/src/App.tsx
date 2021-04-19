import React, { createContext, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import Landing from './pages/Landing';
import Room from './pages/Room';
import { VideoContextProvider } from './contexts/videoContext';
import { ClientContextProvider } from './contexts/clientContext';

interface SocketContextProps {
  clientId: string;
  setClientId: (clientId: string) => void;
  clientDisplayName: string;
  setClientDisplayName: (displayName: string) => void;
  roomYoutubeId: string; // used by hosts only
  setRoomYoutubeId: (youtubeId: string) => void; // used by hosts only
}

export const SocketContext = createContext({} as SocketContextProps);

const App = () => {
  const [clientId, setClientId] = useState(
    sessionStorage.clientId ? sessionStorage.clientId : ''
  );
  const setClientIdWrapper = (id: string) => {
    setClientId(id);
    sessionStorage.setItem('clientId', id);
  };
  const [clientDisplayName, setClientDisplayName] = useState(
    sessionStorage.clientDisplayName ? sessionStorage.clientDisplayName : ''
  );
  const setClientDisplayNameWrapper = (displayName: string) => {
    setClientDisplayName(displayName);
    sessionStorage.setItem('clientDisplayName', displayName);
  };
  const [roomYoutubeId, setRoomYoutubeId] = useState(
    sessionStorage.roomYoutubeId ? sessionStorage.roomYoutubeId : ''
  );
  const setRoomYoutubIdWrapper = (youtubeId: string) => {
    setRoomYoutubeId(youtubeId);
    sessionStorage.setItem('roomYoutubeId', youtubeId);
  };

  const socketContext = {
    clientId,
    setClientId: setClientIdWrapper,
    clientDisplayName,
    setClientDisplayName: setClientDisplayNameWrapper,
    roomYoutubeId,
    setRoomYoutubeId: setRoomYoutubIdWrapper,
  };

  return (
    <Router>
      <ClientContextProvider>
        <VideoContextProvider>
          <SocketContext.Provider value={socketContext}>
            <Route exact path="/room/:roomId" component={Room} />
            <Route exact path="/" component={Landing} />
          </SocketContext.Provider>
        </VideoContextProvider>
      </ClientContextProvider>
    </Router>
  );
};

export default App;
