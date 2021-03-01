const LinkedList = require('linked-list');

export interface PlaylistMap {
  [youtubeID: string]: typeof LinkedList.Item;
}

export class Playlist {
  private list: typeof LinkedList;
  private map: PlaylistMap;

  constructor() {
    this.list = new LinkedList();
    this.map = new Map<string, typeof LinkedList.Item>();
  }

  addVideo(youtubeID: string): void {
    const node = new LinkedList.Item(youtubeID);

    this.list.append(node);
    this.map.set(youtubeID, node);
  }

  deleteVideo(youtubeID: string): void {
    const node: typeof LinkedList.Item = this.map.get(youtubeID);

    if (node) {
      node.detach();
      this.map.delete(youtubeID);
    }
  }

  getNextVideo(): typeof LinkedList.Item {
    // to be used for autoplay
    const value: typeof LinkedList.Item = this.list.head;
    const node: typeof LinkedList.Item = this.map.get(value);
    console.log('value', value); // tslint:disable-line
  }

  getPlaylistIds(): string[] {
    return [...this.map.keys()];
  }
}

export default new Playlist();
