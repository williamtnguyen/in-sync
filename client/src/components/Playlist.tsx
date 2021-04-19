import React, { useContext } from 'react';
import { extractVideoId, validVideoURL } from '../utils/helpers';
import { ClientContext } from '../contexts/clientContext';
import { Form } from 'antd';
import PlaylistHeader from './PlaylistHeader';
import PlaylistCarousel from './PlaylistCarousel';

import playlistStyles from '../styles/components/playlist.module.scss';

type props = {
  socket: SocketIOClient.Socket;
};

const Playlist = ({ socket }: props) => {
  const { clientData } = useContext(ClientContext);
  const [form] = Form.useForm();

  function renderTitle(youtubeID: string) {
    const url = `http://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${youtubeID}&format=json`;
    const xhReq = new XMLHttpRequest();
    xhReq.open('GET', url, false);
    xhReq.send(null);
    const jsonObject = JSON.parse(xhReq.responseText);

    return jsonObject.title;
  }

  function renderImgURL(youtubeID: string) {
    const imgURL = `http://img.youtube.com/vi/${youtubeID}/maxresdefault.jpg`;
    return imgURL;
  }

  function onAddVideo(youtubeURL: string) {
    if (validVideoURL(youtubeURL)) {
      const youtubeID = extractVideoId(youtubeURL);
      socket.emit('addToPlaylist', youtubeID);
      form.resetFields();
    } else {
      // TODO: better error handler
      alert('URL is not valid');
    }
  }

  function onNextVideo() {
    socket.emit('changeVideo', 0);
    onDeleteVideo(0);
  }

  function onDeleteVideo(videoIndex: number) {
    socket.emit('deletePlaylistItem', videoIndex);
  }

  return (
    <div className={playlistStyles.root}>
      <PlaylistHeader
        playlistSize={clientData.playlist.length}
        formObject={form}
        onAddVideo={onAddVideo}
        onNextVideo={onNextVideo}
      />
      <PlaylistCarousel
        socket={socket}
        playlist={clientData.playlist}
        renderTitle={renderTitle}
        renderImgURL={renderImgURL}
        onDeleteVideo={onDeleteVideo}
      />
    </div>
  );
};

export default Playlist;
