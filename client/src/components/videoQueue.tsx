import React, {
    useState,
    FormEvent,
    ChangeEvent,
} from 'react';
import { extractVideoID } from '../utils/helpers';
type props = {
    //youtubeID: string, 
    socket: SocketIOClient.Socket 
  }

function VideoQueue(props: props) {
    const { socket } = props;
    const [youtubeLink, setYoutubeLink] = useState('');
    let _socket = null;

    const onAddVideo = async (event: FormEvent, youtubeURL: string) => {
        event.preventDefault();
        
        const youtubeID = extractVideoID(youtubeURL);
        console.log('Adding Video', {youtubeID});

    };

    const onHandleChange = (event: ChangeEvent) => {
        const element = event.target as HTMLInputElement;
        setYoutubeLink(element.value);
        console.log('Add Video Change');
    }

    return (
        <div style={{
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '100px',
            marginTop: '5px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            boxShadow: '3px 3px 5px #eee',
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <strong>Playlist</strong>
            <div style={{
                height: '1px',
                backgroundColor: '#eee',
                margin: '12px 0',
            }}>
            </div>
            <form onSubmit= {(event) => onAddVideo(event, youtubeLink)}>
                <input
                    type="text"
                    className="form-control mb-3"
                    placeholder='Youtube Link'
                    id = 'setYoutubeLink'
                    onChange={onHandleChange}
                    required
                />
                <button type='submit'className='btn btn-primary'>
                    Add
                </button>
            </form>
        </div>
    );
}

export default VideoQueue;