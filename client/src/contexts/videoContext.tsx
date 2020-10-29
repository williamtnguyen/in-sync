import React, { createContext, Dispatch, useReducer } from 'react';
import { videoReducer } from '../reducers/videoReducer';

interface IinitialState {
  playTime: any,
  pauseTime: any,
  changeVideo: boolean
}

interface IvideoContext {
  videoData: IinitialState,
  videoDispatch: Dispatch<any>
}


export const VideoContext = createContext<IvideoContext>({} as IvideoContext);

export const VideoContextProvider = (props: any) => {
  // Maybe a TODO: implement a transition
  const initialState = {
    playTime: null,
    pauseTime: null,
    changeVideo: false 
  } 

  const [videoData, videoDispatch] = useReducer(videoReducer, initialState);

  return (
    <VideoContext.Provider value={{ videoData, videoDispatch }}>
      {props.children}
    </VideoContext.Provider>
  );
};
