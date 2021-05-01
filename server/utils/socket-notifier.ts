export const createClientNotifier = (
  notification: string,
  details: object
): object => {
  return {
    notification,
    details,
  };
};

export const createUserMessage = (
  client: string | null,
  clientId: string,
  message: string
): object => {
  return {
    notification: 'clientMessage',
    client,
    clientId,
    message,
  };
};

export const createPlaylistItem = (playlist: string[]): object => {
  return {
    notification: 'addToPlaylist',
    playlist,
  };
};

export const deletePlaylistItem = (playlist: string[]): object => {
  return {
    notification: 'deletePlaylistItem',
    playlist,
  };
};

export const movePlaylistItem = (playlist: string[]): object => {
  return {
    notification: 'movePlaylistItem',
    playlist,
  };
};
