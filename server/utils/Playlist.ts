var LinkedList = require('linked-list')
 
export interface PlaylistMap{
    [youtubeID: string] : typeof LinkedList.Item;
}


export class Playlist{
    private list: typeof LinkedList;
  //  private playlistMap: PlaylistMap;
    private map: Map<string, typeof LinkedList.Item>;

    constructor() {
        this.list = new LinkedList();
       // this.playlistMap = {};
        this.map = new Map<string, typeof LinkedList.Item>();
    }

    addVideo(youtubeID: string): void {
        var node = new LinkedList.Item(youtubeID);
        
        this.list.append(node);
        this.map.set(youtubeID, node);
        //this.playlistMap[youtubeID] = node; 
        this.getNextVideo();
        console.log('Adding youtube Id to playlist map', youtubeID);
    }

    deleteVideo(youtubeID: string): void{
       // this.playlistMap[youtubeID].
       // delete this.playlistMap[youtubeID]; 
       var node = this.map.get(youtubeID);
       
       node.detach();
       this.map.delete(youtubeID);

    }

    getNextVideo(): typeof LinkedList.Item {
        var value =  this.list.head as string;
        var node = this.map.get(value);
        console.log('value', value);
    }
}

export default new Playlist();