export const extractVideoId = (youtubeLink: string): string => {
  const expression = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const linkMatches = youtubeLink.match(expression);
  return linkMatches && linkMatches[7].length === 11 ? linkMatches[7] : '';
};

export const validVideoURL = (url: string) => {
  const p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  const matches = url.match(p);
  if (matches) {
    return matches[1];
  }
  return false;
};

export const mediasoupEvent = async (socket: SocketIOClient.Socket, event: string, data = {}): Promise<any> => {
  return new Promise((resolve) => {
    socket.emit(event, data, resolve);
  });
} 
