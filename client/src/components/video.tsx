import React, { createRef } from 'react';
import { useEffect } from 'react';
import { useContext } from 'react';
import YouTube from 'react-youtube';
import { VideoContext } from '../contexts/videoContext';
import { VideoStates } from '../utils/enums';

type videoProps = {
  youtubeID: string, 
  socket: SocketIOClient.Socket 
}

function Video({ youtubeID, socket }: videoProps) {
  const video: any = createRef();
  const { videoData, videoDispatch } = useContext(VideoContext);

  function getVideo() {
    return video.current ? video.current.getInternalPlayer() : null;
  }

  function onPlay() {
    const video = getVideo();
    if (!video) return;
    video.seekTo(videoData.playTime || 0);
    video.playVideo();
  }

  function onPause() {
    const video = getVideo();
    if (!video) return;
    video.pauseVideo();
    if (videoData.changeVideo) {     
      videoDispatch({ type: VideoStates.SEEK_VIDEO, seek: false }); 
      videoDispatch({ type: VideoStates.CHANGE_VIDEO, changeVideo: false });
    } 
  }

  function emitState(type: VideoStates, payload = {}, delay = 0) {
    setTimeout(() => {
      if (socket && !videoData.seek) {
        socket.emit('videoStateChange', { type, payload });
      }
    }, 100 + delay);
  }

  useEffect(onPlay, [videoData.playTime]);
  useEffect(onPause, [videoData.pauseTime]);

  function onStateChange(event: any) {
    const { data } = event;
    const video = getVideo();
    if (!video) return;

    switch(data) {
      case 1:
        console.log('case 1 - Play Video');
        videoDispatch({ type: VideoStates.SEEK_VIDEO, seek: false });
        video.playVideo();
        emitState(
          VideoStates.PLAY_VIDEO, 
          { currTime: event.target.getCurrentTime() },
          150
        );
        break;

      case 2:
        console.log('case 2 - Pause Video');
        emitState(VideoStates.PAUSE_VIDEO);
        videoDispatch({ type: VideoStates.SEEK_VIDEO, seek: false });
        break;

      case 5:
        console.log('case 5 - Cue a video');
        videoDispatch({ type: VideoStates.SEEK_VIDEO, seek: false });
        break;

      default:
        break;
    }
  }

  return ( 
    <div>
      {youtubeID ? (
        <YouTube
          videoId={youtubeID}
          onStateChange={onStateChange}
          ref={video}
        />
      ) : null}
    </div>
  );
}

export default Video;
