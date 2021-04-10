const LinkedList = require('linked-list');

export interface PlaylistMap {
  [youtubeID: string]: typeof LinkedList.Item;
}

/**
 * Playlist class implemented with Doubly-Linked-List and HashMap
 * for O(1) node insertion/deletion/mutation
 */
export class Playlist {
  private list: typeof LinkedList;
  private map: PlaylistMap;

  constructor() {
    this.list = new LinkedList();
    this.map = new Map<string, typeof LinkedList.Item>(); // maps array position to node pointer
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

  // O(n) transformation: figure out if we can do this faster
  getPlaylistIds(): string[] {
    return [...this.map.keys()];
  }
}

export default new Playlist();
