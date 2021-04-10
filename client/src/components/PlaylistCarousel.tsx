import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type {
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot,
} from 'react-beautiful-dnd';
import { Button, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import carouselStyles from '../styles/components/playlist-carousel.module.scss';

const PlaylistCarousel = ({
  socket,
  playlist,
  renderTitle,
  renderImgURL,
  onDeleteVideo,
}: {
  socket: SocketIOClient.Socket;
  playlist: string[];
  renderTitle: (youtubeID: string) => string;
  renderImgURL: (youtubeID: string) => string;
  onDeleteVideo: (youtubeID: string) => void;
}) => {
  const onDragEnd = (emission: DropResult) => {
    if (!emission.destination) return;

    const { source, destination } = emission;
    console.log(source, destination);
  };

  return (
    <DragDropContext onDragEnd={(emission: DropResult) => onDragEnd(emission)}>
      {/* https://github.com/microsoft/TypeScript/issues/27552#issuecomment-427928685 */}
      {/*
        // @ts-ignore */}
      <Droppable droppableId="playlistCarousel" direction="horizontal">
        {/* Droppable gives us provided props and current state in a callback function */}
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={carouselStyles.carousel__slider}
          >
            {playlist.map((youtubeId: string, index: number) => (
              // @ts-ignore
              <Draggable key={youtubeId} draggableId={youtubeId} index={index}>
                {/* Draggable gives us provided props and current state in a callback function */}
                {(
                  provided: DraggableProvided,
                  snapshot: DraggableStateSnapshot
                ) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={carouselStyles.playlist__item}
                  >
                    <Tooltip
                      placement="topLeft"
                      title={renderTitle(youtubeId)}
                      color="black"
                    >
                      <div>
                        <img
                          src={renderImgURL(youtubeId)}
                          alt="video thumbnail"
                        />
                        <Button
                          shape="circle"
                          className={carouselStyles.delete__btn}
                          onClick={() => onDeleteVideo(youtubeId)}
                        >
                          <CloseOutlined
                            className={carouselStyles.close__icon}
                          />
                        </Button>
                      </div>
                    </Tooltip>
                  </div>
                )}
              </Draggable>
            ))}
            {/* React element that is used to increase available space in a Droppable during a drag when needed */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default PlaylistCarousel;
