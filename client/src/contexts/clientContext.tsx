import React, { Dispatch, createContext, useReducer } from 'react';
import { clientReducer } from '../reducers/clientReducer';

interface Message {
  client: string;
  clientId: string;
  message: string;
}
interface IinitialState {
  youtubeID: string;
  clientList: any[];
  messages: Message[];
  playlist: string[];
}

interface IclientContext {
  clientData: IinitialState;
  clientDispatch: Dispatch<any>;
}

export const ClientContext = createContext<IclientContext>(
  {} as IclientContext
);

export const ClientContextProvider = (props: any) => {
  const initialState = {
    youtubeID: '',
    clientList: [],
    messages: [{client: null, clientId: '123', message: 'hello'}, {client: 'hello', clientId: '123', message: 'hello'}],
    playlist: [],
  };

  const [clientData, clientDispatch] = useReducer(clientReducer, initialState);

  return (
    <ClientContext.Provider value={{ clientData, clientDispatch }}>
      {props.children}
    </ClientContext.Provider>
  );
};
