import React, {useState, FormEvent, ChangeEvent, useContext, createRef, useEffect} from 'react';
import { extractVideoID } from '../utils/helpers';
import { ClientContext } from '../contexts/clientContext';
import { ClientStates } from '../utils/enums';
import { render } from '@testing-library/react';

type props = {
    socket: SocketIOClient.Socket
  };

interface Playlist {
    client: string,
    clientID: string,
    youtubeID: string,
    imgURL: string
}  



const VideoQueue = (props: props) => {
    const { socket } = props;
    const [youtubeLink, setYoutubeLink] = useState('');
    const [imageURL, setImageURL] = useState('');
    const { clientDispatch, clientData } = useContext(ClientContext);
    const container = createRef<HTMLDivElement>();
    const test = createRef<HTMLDivElement>();

    function clearInput() {
        (document.getElementById('input') as HTMLInputElement).value = " ";
    }

    const scrollDown = () => {
        container.current?.scrollIntoView();
    };

    const onAddVideo = async (event: FormEvent, youtubeURL: string) => {
        event.preventDefault();

        const youtubeID = extractVideoID(youtubeURL);
        console.log('Adding Video', {youtubeID});

        let imgURL = 'http://img.youtube.com/vi/' + youtubeID + '/0.jpg';
        setImageURL(imgURL);
        socket.emit('updatePlaylist', imgURL, youtubeID);
        
        
        clearInput();
    };

    const onHandleChange = (event: ChangeEvent) => {
        const element = event.target as HTMLInputElement;
        setYoutubeLink(element.value);
        console.log('Add Video Change');

        const youtubeID = extractVideoID(element.value);

        let imgURL = 'http://img.youtube.com/vi/' + youtubeID + '/0.jpg';
        setImageURL(imgURL);

    };

    function render(youtubeID: string ){
        var url = 'http://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=' + youtubeID + '&format=json';
        var xhReq = new XMLHttpRequest();
        xhReq.onreadystatechange = function() {
            if (this.readyState === this.DONE) {
                console.log(this.status) // do something; the request has completed
            }
        }
        xhReq.open("GET", url, false);
        xhReq.send(null);
        var jsonObject = JSON.parse(xhReq.responseText);

        return jsonObject.title;
    }

    useEffect(scrollDown, [props]);

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
        }}>
            <strong>Playlist</strong>
            <div ref = {container} 
                id = "div"
                style={{
                height: '1px',
                backgroundColor: '#eee',
                margin: '12px 0',
            }}>
            </div>
            <table className="table">
                <thead>
                    <tbody>
                        {clientData.playlist.map((item: Playlist) => (
                            <tr key={item.imgURL}>
                                <td>
                                    <img src= {item.imgURL} alt="" height='120' width = '160'/>
                                </td>
                                <td>
                                   {render(item.youtubeID)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </thead>
            </table>
            <form onSubmit= {(event) => onAddVideo(event, youtubeLink)} 
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

export default VideoQueue;