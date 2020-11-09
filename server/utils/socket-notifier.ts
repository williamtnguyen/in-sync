export const createClientNotifier = (
  notification: string,
  details: Object
): Object => {
  return {
    notification,
    details
  };
};

export const createUserMessage = (
  client: string,
  clientId: string,
  message: string
): Object => {
  return {
    type: 'clientMessage',
    client,
    clientId,
    message,
  };
};