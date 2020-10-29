export const createClientNotifier = (
    notification: string, 
    details: Object
  ): Object => { 
  return {
    notification,
    details
  };
};