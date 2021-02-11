var LinkedList = require('linked-list')
 
export interface PlaylistMap{
    [youtubeID: string] : typeof LinkedList.Item;
}


export class Playlist{
    private list: typeof LinkedList;
    private map: Map<string, typeof LinkedList.Item>;

    constructor() {
        this.list = new LinkedList();
        this.map = new Map<string, typeof LinkedList.Item>();
    }

    addVideo(youtubeID: string): void {
        var node = new LinkedList.Item(youtubeID);
        
        this.list.append(node);
        this.map.set(youtubeID, node);
    }

    deleteVideo(youtubeID: string): void{
       var node: typeof LinkedList.Item = this.map.get(youtubeID);
       
       node.detach();
       this.map.delete(youtubeID);
    }

    getNextVideo(): typeof LinkedList.Item {
        //to be used for autoplay
        var value: typeof LinkedList.Item =  this.list.head;
        var node: typeof LinkedList.Item = this.map.get(value);
        console.log('value', value);
    }
}

export default new Playlist();