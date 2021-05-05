const LinkedList = require('linked-list');

class VideoNode extends LinkedList.Item {
  public youtubeID: string;

  constructor(youtubeID: string) {
    super();
    this.youtubeID = youtubeID;
  }
}

interface PlaylistMap {
  [videoIndex: number]: VideoNode;
}

/**
 * Playlist class implemented with Doubly-Linked-List and HashMap
 */
export class Playlist {
  private list: typeof LinkedList;
  private map: PlaylistMap; // maps array position to node pointer

  // costly initialization but the most seamless refactor
  constructor(playlistSnapshot: string[]) {
    this.map = {};
    this.list = new LinkedList();

    playlistSnapshot.forEach((youtubeId: string, index: number) => {
      const node = new VideoNode(youtubeId);
      this.list.append(node);
      this.map[index] = node;
    });
  }

  getYoutubeIDAtIndex(videoIndex: number): string {
    const node: VideoNode = this.map[videoIndex];
    return node.youtubeID;
  }

  addVideoToTail(youtubeID: string): void {
    const node = new VideoNode(youtubeID);

    this.list.append(node);
    this.map[this.list.size - 1] = node;
  }

  // O(n) operation because map reassignment
  deleteVideoAtIndex(videoIndex: number): void {
    const node: VideoNode = this.map[videoIndex];
    if (node) {
      const priorLength = this.list.size;
      node.detach();
      delete this.map[videoIndex];

      for (let i = videoIndex + 1; i < priorLength; i += 1) {
        this.map[i - 1] = this.map[i];
      }
      if (priorLength > 1) {
        delete this.map[priorLength - 1];
      }
    } else {
      throw new Error('Node at index was not found');
    }
  }

  // O(n) operation because map reassignment
  moveVideoToIndex(oldIndex: number, newIndex: number): void {
    // Remove node from oldIndex
    const movedNode: VideoNode = this.map[oldIndex];
    movedNode.detach();

    // Insert node at newIndex
    const neighbor: VideoNode = this.map[newIndex];
    if (oldIndex < newIndex) {
      neighbor.append(movedNode);
    } else {
      neighbor.prepend(movedNode);
    }
    this.list.toArray().map((node: VideoNode, index: number) => {
      this.map[index] = node;
    });
  }

  // O(n) transformation: figure out if we can do this faster
  getPlaylistIds(): string[] {
    const nodeArray = this.list.toArray();
    return nodeArray.map((node: VideoNode) => node.youtubeID);
  }
}

export default Playlist;
