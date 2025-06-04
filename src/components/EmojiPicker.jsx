import React, { useEffect } from 'react';
import data from '@emoji-mart/data/sets/14/apple.json';
import { init } from 'emoji-mart';
import Picker from '@emoji-mart/react';

const EmojiPicker = ({ onEmojiSelect, onClose }) => {
  useEffect(() => {
    init({ data });
  }, []);

  return (
    <Picker
      data={data}
      onEmojiSelect={(emoji) => {
        onEmojiSelect(emoji);
        onClose();
      }}
      theme="light"
      set="apple"
      showPreview={false}
      showSkinTones={true}
      emojiSize={20}
      emojiButtonSize={28}
      maxFrequentRows={4}
      navPosition="bottom"
      perLine={8}
      searchPosition="sticky"
      previewPosition="none"
      skinTonePosition="search"
      categories={[
        'frequent',
        'people',
        'nature',
        'foods',
        'activity',
        'places',
        'objects',
        'symbols',
        'flags'
      ]}
    />
  );
};

export default EmojiPicker; 