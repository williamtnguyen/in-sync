import { VideoStates } from '../utils/enums';

export const videoReducer = (state: any, action: any) => {
  switch (action.type) {
    case VideoStates.SEEK_VIDEO:
      return {
        ...state, 
        seek: action.seek
      };
        
    case VideoStates.PLAY_VIDEO:
      return {
        ...state,
        playTime: Math.round(action.currTime)
      };
      
    case VideoStates.PAUSE_VIDEO:
      return {
        ...state,
        pauseTime: action.timestamp
      };
      
    case VideoStates.CHANGE_VIDEO: 
      return {
        ...state,
        changeVideo: action.changeVideo
      };
      
    case VideoStates.RESET_PAUSE_PLAY:
      return {
        ...state,
        playTime: null,
        pauseTime: null
      };
      
    default:
      break;
  }
}