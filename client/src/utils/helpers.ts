export const extractVideoID = (youtubeLink: string) => {
  const expression = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const linkMatches = youtubeLink.match(expression);
  return (linkMatches && linkMatches[7].length === 11) ? linkMatches[7] : false;
}