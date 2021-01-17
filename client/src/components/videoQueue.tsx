import React, {useState,FormEvent,ChangeEvent,useContext} from 'react';
import { extractVideoID } from '../utils/helpers';
import { ClientContext } from '../contexts/clientContext';



type props = {
    socket: SocketIOClient.Socket 
  };

const VideoQueue = ({socket}: props) => {
    const [youtubeLink, setYoutubeLink] = useState('');
    const [imageURL, setImageURL] = useState('');
    const { clientData } = useContext(ClientContext);
    
    function addImage() { 
        (document.getElementById("bigpic") as HTMLImageElement).src = imageURL;
        console.log('addImage');
    }
    
    function clearInput(){
        (document.getElementById("form") as HTMLInputElement).value = " ";
    }

    const onAddVideo = async (event: FormEvent, youtubeURL: string) => {
        event.preventDefault();
        
        const youtubeID = extractVideoID(youtubeURL);
        console.log('Adding Video', {youtubeID});
       
        var imgURL = "http://img.youtube.com/vi/" + youtubeID + "/0.jpg";
        setImageURL(imgURL);

        addImage();
        clearInput();
        console.log('URL',imageURL);
        
    };
    
    const onHandleChange = (event: ChangeEvent) => {
        const element = event.target as HTMLInputElement;
        setYoutubeLink(element.value);
        console.log('Add Video Change');

        const youtubeID = extractVideoID(element.value);

        var imgURL = "http://img.youtube.com/vi/" + youtubeID + "/0.jpg";
        setImageURL(imgURL);
        addImage();
        
    }

    return (
        <div style={{
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '350px',
            width: '500px',
            marginTop: '5px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            boxShadow: '3px 3px 5px #eee',
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <strong>Playlist</strong>
            <div id = 'div'style={{
                height: '1px',
                backgroundColor: '#eee',
                margin: '12px 0',
            }}>
            </div>
            <table>
                <tr>
                    <td id="imgCell">
                        <img id="bigpic" src="https://maps.gstatic.com/mapfiles/markers2/dd-via-transparent.png" alt="" width="200" height="160"></img>
                    </td>
                 </tr>
            </table>
            <form onSubmit= {(event) => onAddVideo(event, youtubeLink)}> 
                <input
                    type="text"
                    id = "form"
                    className="form-control mb-3"
                    placeholder='Youtube Link'
                    value = {youtubeLink}
                    onChange={onHandleChange}
                    required
                />
                <button type='submit'className='btn btn-primary'>
                    Add
                </button>
            </form>
        </div>
    );
};

export default VideoQueue;