import React, { Dispatch, createContext, useReducer } from 'react';
import { clientReducer } from '../reducers/clientReducer';

interface IinitialState {
  youtubeID: string;
  clientList: [];
  messages: [];
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
    messages: [],
  };

  const [clientData, clientDispatch] = useReducer(clientReducer, initialState);

  return (
    <ClientContext.Provider value={{ clientData, clientDispatch }}>
      {props.children}
    </ClientContext.Provider>
  );
};
