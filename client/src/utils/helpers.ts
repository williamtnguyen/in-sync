export const extractVideoID = (youtubeLink: string) => {
  const expression = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const linkMatches = youtubeLink.match(expression);
  return linkMatches && linkMatches[7].length === 11 ? linkMatches[7] : false;
};

export const validVideoURL= (url: string) => {
  var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    var matches = url.match(p);
    if(matches){
        return matches[1];
    }
    return false;
}