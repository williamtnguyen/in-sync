export const createClientNotifier = (
  notification: string,
  details: object
): object => {
  return {
    notification,
    details
  };
};

export const createUserMessage = (
  client: string,
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
