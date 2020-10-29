import { ClientStates } from '../utils/enums';

export const clientReducer = (state: any, action: any) => { 
  switch (action.type) {
    case ClientStates.UPDATE_YOUTUBE_ID:
      return {
        ...state,
        youtubeID: action.youtubeID
      };
      
    default:
      break;
  }
};