import React, { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import EmojiPicker from './EmojiPicker';
import '../styles/ChatInput.css';
import '../styles/EmojiPicker.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const mediaMenuRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const mediaButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && 
          emojiPickerRef.current && 
          !emojiPickerRef.current.contains(event.target) &&
          !emojiButtonRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }

      if (showMediaMenu && 
          mediaMenuRef.current && 
          !mediaMenuRef.current.contains(event.target) &&
          !mediaButtonRef.current.contains(event.target)) {
        setShowMediaMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showMediaMenu]);

  useEffect(() => {
    // Cleanup preview URLs when component unmounts
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    
    try {
      if (selectedFiles.length > 0) {
        // Handle image files
        for (const file of selectedFiles) {
          const messageData = {
            type: 'image',
            content: file.name,
            file: file
          };
          await onSendMessage(messageData);
        }
        setSelectedFiles([]);
        setPreviewUrls([]);
      }

      if (message.trim()) {
        // Handle text message
        onSendMessage({
          type: 'text',
          content: message.trim()
        });
        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // You might want to show an error notification here
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height based on scrollHeight
    const newHeight = Math.min(textarea.scrollHeight, 130); // Max height of 130px
    textarea.style.height = `${newHeight}px`;
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        console.warn(`Invalid file type: ${file.type}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File too large: ${file.name}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Create preview URLs
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }

    setShowMediaMenu(false);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newMessage = message.substring(0, start) + emoji.native + message.substring(end);
    
    setMessage(newMessage);
    
    // Set cursor position after emoji
    requestAnimationFrame(() => {
      input.focus();
      const newCursorPos = start + emoji.native.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  return (
    <div className="chat-input-container">
      <button 
        ref={emojiButtonRef}
        className={`emoji-button ${showEmojiPicker ? 'active' : ''}`}
        onClick={() => {
          setShowMediaMenu(false);
          setShowEmojiPicker(!showEmojiPicker);
        }}
        title="Add emoji"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 12 8 12zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" fill="currentColor"/>
        </svg>
      </button>

      <div className="chat-input-wrapper">
        <textarea 
          ref={inputRef}
          placeholder="Type your message..." 
          className="chat-input"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          rows={1}
        />
      </div>

      <button 
        ref={mediaButtonRef}
        className="attachment-button"
        onClick={() => {
          setShowEmojiPicker(false);
          setShowMediaMenu(!showMediaMenu);
        }}
        title="Add attachment"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
      </button>

      <button 
        className={`send-button ${message.trim() || selectedFiles.length > 0 ? 'active' : ''}`}
        onClick={handleSendMessage}
        disabled={!message.trim() && selectedFiles.length === 0}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
        </svg>
      </button>

      {/* Preview Area */}
      {previewUrls.length > 0 && (
        <div className="preview-area">
          {previewUrls.map((url, index) => (
            <div key={index} className="preview-item">
              <img src={url} alt={`Preview ${index + 1}`} />
              <button 
                className="remove-preview" 
                onClick={() => removeFile(index)}
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {showMediaMenu && (
        <div ref={mediaMenuRef} className="media-menu">
          <div className="media-menu-options">
            <button 
              className="media-option"
              onClick={() => {
                fileInputRef.current.click();
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
              </svg>
              <span>Photo</span>
            </button>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        multiple
      />

      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="emoji-picker-container">
          <EmojiPicker 
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInput; 