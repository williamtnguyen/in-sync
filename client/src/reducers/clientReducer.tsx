import { ClientStates } from '../utils/enums';

export const clientReducer = (state: any, action: any) => {
  switch (action.type) {
    case ClientStates.UPDATE_YOUTUBE_ID:
      return {
        ...state,
        youtubeID: action.youtubeID,
      };
    case ClientStates.UPDATE_PLAYLIST:
      const { clientName, clientID, youtubeID, imgURL } = action.data;
      return {
        ...state,
        playlist: [
          ...state.playlist,
          {
            clientName,
            clientID,
            youtubeID,
            imgURL,
          },
        ],
      };

    case ClientStates.UPDATE_CHAT_MESSAGES:
      const { client, clientId, message } = action.data;
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            client,
            clientId,
            message,
          },
        ],
      };

    default:
      break;
  }
};
