import React from 'react';
import { Form, Input, Button, FormInstance } from 'antd';
import { PlusOutlined, StepForwardOutlined } from '@ant-design/icons';

import headerStyles from '../styles/components/playlist-header.module.scss';

const PlaylistHeader = ({
  playlistSize,
  formObject,
  onAddVideo,
  onNextVideo,
}: {
  playlistSize: number;
  formObject: FormInstance;
  onAddVideo: (youtubeURL: string) => void;
  onNextVideo: () => void;
}) => {
  return (
    <div className={headerStyles.root}>
      <h3>Video Queue ({playlistSize})</h3>
      <Form
        form={formObject}
        layout="inline"
        size="small"
        onFinish={(fieldValues) => onAddVideo(fieldValues.youtubeLink)}
      >
        <Form.Item name="youtubeLink" className={headerStyles.youtube__input}>
          <Input placeholder="Enter a YouTube link..." />
        </Form.Item>
        <Form.Item>
          <Button id="add" shape="round" htmlType="submit">
            <PlusOutlined />
            Add
          </Button>
        </Form.Item>
      </Form>
      <Button id="next" shape="round" size="small" onClick={onNextVideo}>
        <StepForwardOutlined />
        Next
      </Button>
    </div>
  );
};

export default PlaylistHeader;
