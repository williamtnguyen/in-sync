import React, {
  useState,
  FormEvent,
  ChangeEvent,
  MouseEvent,
  useContext,
  createRef,
  useEffect
} from 'react';
import { extractVideoId, validVideoURL } from '../utils/helpers';
import { ClientContext } from '../contexts/clientContext';
import { SocketContext } from '../App';

type props = {
  socket: SocketIOClient.Socket;
};

const Playlist = ({ socket }: props) => {
  const [youtubeLink, setYoutubeLink] = useState('');
  const { clientData } = useContext(ClientContext);
  const { setRoomYoutubeId } = useContext(SocketContext);
  const container = createRef<HTMLDivElement>();

  const scrollDown = () => {
    container.current?.scrollIntoView();
  };

  const onAddVideo = async (event: FormEvent, youtubeURL: string) => {
    event.preventDefault();
    if (validVideoURL(youtubeURL)) {
      const youtubeID = extractVideoId(youtubeURL);
      socket.emit('addToPlaylist', youtubeID);

      setYoutubeLink('');
    }else {
      alert('URL is not valid');
    }
  };

  const onHandleChange = (event: ChangeEvent) => {
    event.preventDefault();
    const element = event.target as HTMLInputElement;
    setYoutubeLink(element.value);
  };

  function renderTitle(youtubeID: string) {
    const url = `http://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${youtubeID}&format=json`;
    const xhReq = new XMLHttpRequest();
    xhReq.onreadystatechange = function () {
      if (this.readyState === this.DONE) {
        // alert(this.status);
      }
    };
    xhReq.open('GET', url, false);
    xhReq.send(null);
    const jsonObject = JSON.parse(xhReq.responseText);

    return jsonObject.title;
  }

  function renderImgURL(youtubeID: string) {
    const imgURL = `http://img.youtube.com/vi/${youtubeID}/0.jpg`;
    return imgURL;
  }

  function deleteVideo(youtubeID: string, index: number) {
    if (index > -1) {
      socket.emit('deletePlaylistItem', youtubeID);
    }
  }

  function onDelete(event: MouseEvent, youtubeID: string) {
    event.preventDefault();
    const element = event.target as HTMLInputElement;
    const index : number = +element.id;
    deleteVideo(youtubeID, index);
  }

  function onPlay(event: MouseEvent, youtubeID: string) {
    event.preventDefault();
    socket.emit('changeVideo', youtubeID);

    const element = event.target as HTMLInputElement;
    const index : number = +element.id;

    deleteVideo(youtubeID, index);
    setRoomYoutubeId(youtubeID);
  }

  useEffect(scrollDown, [socket]);

  return (
    <div
      style={{
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        width: '360px',
        marginTop: '5px',
        borderRadius: '5px',
        border: '1px solid #ddd',
        boxShadow: '3px 3px 5px #eee',
        padding: '10px',
        boxSizing: 'border-box'
      }}
    >
      <strong>Playlist</strong>
      <div ref = {container}
        id = "div"
        style={{
          height: '1px',
          backgroundColor: '#eee',
          margin: '12px',
          wordWrap: 'break-word'
        }}
      />
      <table className="table">
        <thead>
          <tbody>
            {clientData.playlist.map((youtubeId: string, index) => (
              <tr key={index}>
                <td>
                  <img src={renderImgURL(youtubeId)}
                    alt="" height="110" width = "150"/>
                </td>
                <div
                  style={{
                    wordWrap: 'break-word',
                    fontSize: '12px',
                  }}
                >
                  <td>
                    {renderTitle(youtubeId)}
                  </td>
                </div>
                <button
                  id = {index.toString()}
                  type="submit"
                  className="btn btn-primary"
                  onClick= {(event) => onPlay(event, youtubeId)}
                  style={{
                    marginTop: '3px',
                    fontSize: '12px',
                  }}
                >
                  Play
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id={index.toString()}
                  onClick= {(event) => onDelete(event, youtubeId)}
                  style={{
                    marginTop: '3px',
                    marginLeft: '5px',
                    fontSize: '12px',
                  }}
                >
                  Delete
                </button>
              </tr>
            ))}
          </tbody>
        </thead>
      </table>
      <form onSubmit = {(event) => onAddVideo(event, youtubeLink)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            marginBottom: '20px'
          }}
      >
        <input
          type="text"
          placeholder="Youtube Link"
          value = {youtubeLink}
          id = "input"
          onChange={onHandleChange}
          required
          style={{
            width: '100%',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            marginLeft: '10px',
          }}
        >
          Add
        </button>
      </form>
    </div>
  );
};

export default Playlist;
