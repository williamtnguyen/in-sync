import React, { Dispatch, createContext, useReducer } from 'react';
import { clientReducer } from '../reducers/clientReducer';

interface IinitialState {
  youtubeID: string;
  clientList: [];
  messages: [];
  playlist: [];
}

interface IclientContext {
  clientData: IinitialState;
  clientDispatch: Dispatch<any>;
}

export const ClientContext = createContext<IclientContext>(
  {} as IclientContext
);

export const ClientContextProvider = (props: any) => {
  var playlist: string[] = [];
  const initialState = {
    youtubeID: '',
    clientList: [],
    messages: [],
    playlist: playlist,
  };

  const [clientData, clientDispatch] = useReducer(clientReducer, initialState);

  return (
    <ClientContext.Provider value={{ clientData, clientDispatch }}>
      {props.children}
    </ClientContext.Provider>
  );
};
