import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import chatService from '../services/chat.service';
import socketService from '../services/socket.service';
import '../styles/ChatsView.css';
import ChatInput from './ChatInput';
import ImageViewer from './ImageViewer';
import { getInitialsAvatar } from '../utils/avatarUtils';
import authService from '../services/auth.service';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23E1E1E1'/%3E%3Cpath d='M20 21c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm0 2c4.42 0 8 1.79 8 4v3H12v-3c0-2.21 3.58-4 8-4z' fill='%23A1A1A1'/%3E%3C/svg%3E";
const ITEMS_PER_PAGE = 10;

const ChatsView = ({ onChatSelect }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const lastChatRef = useRef();
  const loadingRef = useRef();
  const [editMessageText, setEditMessageText] = useState('');
  const [showReactions, setShowReactions] = useState(null);
  const [longPressTimeout, setLongPressTimeout] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [starredMessages, setStarredMessages] = useState([]);
  const messagesContainerRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [viewerImages, setViewerImages] = useState(null);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const lastChatCallback = useCallback(node => {
    if (loading) return;
    if (lastChatRef.current) lastChatRef.current.disconnect();

    lastChatRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) lastChatRef.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    fetchChats(true);
  }, [activeFilter]);

  useEffect(() => {
    if (!initialLoad) {
      fetchChats(false);
    }
  }, [page]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messagesContainerRef.current?.contains(event.target)) {
        const isMenuButton = event.target.closest('.message-menu-button');
        const isMenuContent = event.target.closest('.message-menu');
        const isReactionButton = event.target.closest('.reaction-option');
        const isReactionBadge = event.target.closest('.reaction-badge');
        
        if (!isMenuButton && !isMenuContent && !isReactionButton && !isReactionBadge) {
          setShowMessageMenu(null);
          setShowReactions(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Connect to socket server
    const socket = socketService.connect();

    // Set up socket event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      // Cleanup socket listeners
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      // Join the chat room when a chat is selected
      socketService.joinChat(selectedChat.id);
      return () => {
        // Leave the chat room when component unmounts or chat changes
        socketService.leaveChat(selectedChat.id);
      };
    }
  }, [selectedChat]);

  const fetchChats = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) {
        setLoading(true);
        setPage(1);
      }

      const response = await chatService.getMyChats(page, ITEMS_PER_PAGE);
      
      // Group chats by inquiry ID to ensure uniqueness
      const chatsByInquiry = response.reduce((acc, chat) => {
        const inquiryId = chat.inquiry?._id || chat.inquiryId;
        if (!acc[inquiryId]) {
          acc[inquiryId] = chat;
        }
        return acc;
      }, {});

      // Transform the unique chats
      const formattedChats = Object.values(chatsByInquiry).map(chat => {
        const inquiry = chat.inquiry || {};
        const inquiryUser = inquiry.user || {};
        const firstName = inquiryUser.firstName || '';
        const lastName = inquiryUser.lastName || '';
        
        return {
          id: chat._id || chat.id,
          inquiryId: inquiry._id || chat.inquiryId,
          avatar: inquiryUser.avatar || getInitialsAvatar(firstName, lastName),
          userName: firstName && lastName ? 
            `${firstName} ${lastName}` : 'Anonymous User',
          userType: inquiry.requesterType || 'Customer',
          propertyTitle: `${inquiry.houseType || 'Property'} - ${inquiry.unitSize || ''}`,
          location: inquiry.location || 'Location not specified',
          date: inquiry.checkInDate && inquiry.checkOutDate ? 
            `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}` : '',
          price: inquiry.budget?.toLocaleString() || '0',
          duration: inquiry.checkInDate && inquiry.checkOutDate ? 
            `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights` : '',
          time: chat.lastMessage?.createdAt ? getTimeAgo(new Date(chat.lastMessage.createdAt)) : '5h',
          participantCount: chat.participants?.length || 0,
          stats: {
            inquiries: inquiry.engagement?.inquiries?.toString() || '0',
            likes: inquiry.engagement?.likes?.toString() || '0',
            views: inquiry.engagement?.views?.toString() || '0',
            isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(inquiry.user?._id),
            isBookmarked: Array.isArray(inquiry.bookmarks) && inquiry.bookmarks.includes(inquiry.user?._id)
          }
        };
      });

      setChats(prev => isInitialFetch ? formattedChats : [...prev, ...formattedChats]);
      setHasMore(formattedChats.length === ITEMS_PER_PAGE);
      setError(null);
      setInitialLoad(false);
    } catch (err) {
      setError('Failed to load chats. Please try again.');
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      y: 31536000,
      mo: 2592000,
      w: 604800,
      d: 86400,
      h: 3600,
      m: 60,
      s: 1
    };

    for (let [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval > 1) {
        return `${interval}${unit}`;
      }
    }
    return 'just now';
  };

  const handleChatClick = async (chat) => {
    try {
    setSelectedChat(chat);
      // Create or get existing chat
      const chatData = await chatService.createOrGetChat(chat.inquiryId);
      // Transform messages to match our display format
      const formattedMessages = (chatData.messages || []).map(msg => {
        const sender = msg.sender || {};
        const firstName = sender.firstName || '';
        const lastName = sender.lastName || '';
        return {
          id: msg._id || msg.id,
          sender: msg.sender?._id === chatData.participant?._id ? 'user' : 'host',
          name: sender.firstName && sender.lastName ? 
            `${sender.firstName} ${sender.lastName}` : 'Anonymous',
          avatar: sender.profilePicture || getInitialsAvatar(firstName, lastName),
          content: msg.content,
          messageType: msg.messageType,
          images: msg.images || [],
          time: getTimeAgo(new Date(msg.createdAt)),
          createdAt: msg.createdAt,
          link: msg.link
        };
      });
      setMessages(formattedMessages);
      if (onChatSelect) {
    onChatSelect(chat);
      }
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load chat messages');
    }
  };

  const handleSendMessage = async (messageData) => {
    try {
      if (!selectedChat) {
        setError('No chat selected');
        return;
      }

      // Send message through chat service
      const response = await chatService.sendMessage(selectedChat.id, messageData);
      
      // Add the new message to the messages list
      const formattedMessage = {
        id: response._id,
        sender: 'user',
        name: authService.getCurrentUser()?.firstName + ' ' + authService.getCurrentUser()?.lastName,
        avatar: authService.getCurrentUser()?.profilePicture || getInitialsAvatar(
          authService.getCurrentUser()?.firstName,
          authService.getCurrentUser()?.lastName
        ),
        content: messageData.content,
        type: messageData.type,
        time: getTimeAgo(new Date()),
        createdAt: new Date()
      };

      setMessages(prev => [...prev, formattedMessage]);

      // Also notify through socket for real-time updates
    socketService.sendMessage(selectedChat.id, messageData);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditMessage = (id) => {
    const message = messages.find(msg => msg.id === id);
    if (message) {
      setEditMessageText(message.content);
    }
  };

  const handleSaveEdit = (id) => {
    const updatedMessages = messages.map(msg =>
      msg.id === id ? { ...msg, content: editMessageText } : msg
    );
    setMessages(updatedMessages);
    setEditMessageText('');
  };

  const handleCancelEdit = () => {
    setEditMessageText('');
  };

  const handleDeleteMessage = (id) => {
    socketService.deleteMessage(selectedChat.id, id);
  };

  const handleReaction = (messageId, emoji) => {
    const message = messages.find(msg => msg.id === messageId);
    const hasReacted = message?.reactions?.some(r => 
      r.emoji === emoji && r.users.includes(authService.getCurrentUser().id)
    );

    if (hasReacted) {
      socketService.removeReaction(selectedChat.id, messageId, emoji);
    } else {
      socketService.addReaction(selectedChat.id, messageId, emoji);
    }
  };

  const handleReply = (msg) => {
    // Close menu
    setShowMessageMenu(null);
    // Set reply content in chat input
    // This will be handled by ChatInput component
    if (onChatSelect) {
      onChatSelect({
        ...selectedChat,
        replyTo: {
          id: msg.id,
          content: msg.content,
          sender: msg.name
        }
      });
    }
  };

  const handleStarMessage = (msgId) => {
    setStarredMessages(prev => {
      const isStarred = prev.includes(msgId);
      return isStarred ? prev.filter(id => id !== msgId) : [...prev, msgId];
    });
    setShowMessageMenu(null);
  };

  const handleSetShowReactions = (id) => {
    setShowReactions(id);
  };

  const handleMessageInteraction = (e, msgId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if click is on menu or reactions
    const isMenuButton = e.target.closest('.message-menu-button');
    const isMenuContent = e.target.closest('.message-menu');
    const isReactionButton = e.target.closest('.reaction-option');
    const isReactionBadge = e.target.closest('.reaction-badge');
    
    if (!isMenuButton && !isMenuContent && !isReactionButton && !isReactionBadge) {
      // Close both menus and reactions if clicking on message body
      setShowMessageMenu(null);
      if (!isMobileView) {
        setShowReactions(showReactions === msgId ? null : msgId);
      }
    }
  };

  const handleTouchStart = (msgId) => {
    const timeout = setTimeout(() => {
      setShowReactions(msgId);
    }, 500); // 500ms long press
    
    setLongPressTimeout(timeout);
  };

  const handleTouchEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  // Socket event handlers
  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, formatMessage(message)]);
  };

  const handleMessageUpdated = (message) => {
    setMessages(prev => prev.map(msg => 
      msg.id === message._id ? formatMessage(message) : msg
    ));
  };

  const handleMessageDeleted = ({ messageId }) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleReactionUpdated = ({ messageId, reactions }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, reactions: formatReactions(reactions) } : msg
    ));
  };

  const handleUserTyping = ({ userId, isTyping }) => {
    // Update typing indicator state
    setTypingUsers(prev => {
      if (isTyping) {
        return { ...prev, [userId]: true };
      } else {
        const { [userId]: _, ...rest } = prev;
        return rest;
      }
    });
  };

  const handleMessageRead = ({ messageId, userId }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, readBy: [...msg.readBy || [], userId] } : msg
    ));
  };

  const handleUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
    // Update user status in chat list
    setChats(prev => prev.map(chat => {
      if (chat.userId === userId) {
        return { ...chat, isOnline, lastSeen };
      }
      return chat;
    }));
  };

  // Helper functions
  const formatMessage = (message) => {
    const sender = message.sender || {};
    return {
      id: message._id,
      sender: message.sender._id === authService.getCurrentUser().id ? 'user' : 'host',
      name: `${sender.firstName} ${sender.lastName}`,
      avatar: sender.avatar || getInitialsAvatar(sender.firstName, sender.lastName),
      content: message.content,
      type: message.messageType,
      images: message.images,
      fileName: message.content, // Original filename
      reactions: formatReactions(message.reactions),
      readBy: message.readBy,
      createdAt: message.createdAt,
      isEdited: message.isEdited,
      editedAt: message.editedAt
    };
  };

  const formatReactions = (reactions) => {
    if (!reactions) return [];
    
    return Object.entries(reactions).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users
    }));
  };

  // Add this helper function at the top level
  const groupMessagesByImageBatch = (messages) => {
    const groupedMessages = [];
    let currentGroup = null;

    messages.forEach((msg) => {
      if (msg.messageType !== 'image' || !msg.images || msg.images.length === 0) {
        if (currentGroup) {
          groupedMessages.push(currentGroup);
          currentGroup = null;
        }
        groupedMessages.push(msg);
        return;
      }

      // Check if this message should be part of the current group
      const shouldGroup = currentGroup && 
        msg.sender === currentGroup.sender &&
        msg.name === currentGroup.name &&
        Math.abs(new Date(msg.createdAt) - new Date(currentGroup.createdAt)) < 60000; // 1 minute threshold

      if (shouldGroup) {
        // Add images to current group
        currentGroup.images = [...currentGroup.images, ...msg.images];
      } else {
        // Start a new group
        if (currentGroup) {
          groupedMessages.push(currentGroup);
        }
        currentGroup = {
          ...msg,
          isImageGroup: true
        };
      }
    });

    // Add the last group if exists
    if (currentGroup) {
      groupedMessages.push(currentGroup);
    }

    return groupedMessages;
  };

  const handleImageClick = (images, clickedIndex) => {
    setViewerImages(images);
    setViewerInitialIndex(clickedIndex);
  };

  const closeImageViewer = () => {
    setViewerImages(null);
    setViewerInitialIndex(0);
  };

  const renderMessage = (msg, index) => {
    const renderImageGrid = (images) => {
      const imageCount = images.length;
      if (imageCount === 0) return null;

      if (imageCount === 1) {
        return (
          <div className="message-image-container">
            <img 
              src={images[0]} 
              alt="Shared image" 
              className="message-image"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(images, 0);
              }}
            />
            {msg.content && (
              <div className="image-info">
                <span className="file-name">{msg.content}</span>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className={`message-image-grid grid-${Math.min(imageCount, 4)}`}>
          {images.slice(0, 4).map((imageUrl, imgIndex) => (
            <div 
              key={imgIndex} 
              className="grid-image"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(images, imgIndex);
              }}
            >
              <img 
                src={imageUrl} 
                alt={`Shared image ${imgIndex + 1}`}
              />
              {imgIndex === 3 && imageCount > 4 && (
                <div className="image-count">+{imageCount - 4}</div>
              )}
            </div>
          ))}
        </div>
      );
    };

    return (
    <div 
      key={msg.id || `msg-${index}`} 
      className={`message ${msg.sender}`}
      onClick={(e) => handleMessageInteraction(e, msg.id)}
      onTouchStart={() => handleTouchStart(msg.id)}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className="message-container">
        <div className="message-avatar">
          <img 
            src={msg.avatar} 
            alt={`${msg.name}'s avatar`}
            className="message-avatar-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getInitialsAvatar(msg.name.split(' ')[0], msg.name.split(' ')[1]);
            }}
          />
        </div>
        <div className="message-content-wrapper">
          <div className="message-header">
            <div className="message-info">
              <span className="message-sender">{msg.name}</span>
              <span className="message-type">{msg.sender === 'host' ? 'Host' : 'Customer'}</span>
              <span className="message-time">{msg.time}</span>
            </div>
            <div className="message-actions">
              <button 
                className="message-menu-button" 
                title="More options"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id);
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                </svg>
              </button>
              {showMessageMenu === msg.id && (
                <div className="message-menu">
                  <button 
                    className="message-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReply(msg);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="currentColor"/>
                    </svg>
                    Reply
                  </button>
                  <button 
                    className={`message-menu-item ${starredMessages.includes(msg.id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStarMessage(msg.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
                    </svg>
                    {starredMessages.includes(msg.id) ? 'Unstar' : 'Star'}
                  </button>
                    {msg.messageType === 'image' && msg.images && msg.images.length > 0 && (
                      <button 
                        className="message-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(msg.images[0], '_blank');
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
                        </svg>
                        Download
                      </button>
                    )}
                  <button 
                    className="message-menu-item delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="message-bubble">
              {msg.messageType === 'image' && msg.images && msg.images.length > 0 ? (
                renderImageGrid(msg.images)
            ) : (
              <div className="message-content">
                <div className="message-text">
                  {msg.content}
                  {msg.link && (
                    <a 
                      href={msg.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="message-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {msg.link}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="message-timestamp">
            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </div>
      {msg.reactions && msg.reactions.length > 0 && (
        <div className="message-reactions">
          {msg.reactions.map((reaction, index) => (
            <button 
              key={index} 
              className="reaction-badge"
              onClick={(e) => {
                e.stopPropagation();
                handleReaction(msg.id, reaction.emoji);
              }}
            >
              {reaction.emoji}
              {reaction.count > 1 && <span className="reaction-count">{reaction.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  };

  const renderChatModal = () => {
    if (!selectedChat) return null;

    // Group messages by image batches
    const groupedMessages = groupMessagesByImageBatch(messages);

    return (
      <div className="chats-modal">
        {/* Chat Header */}
        <div className="chat-modal-header">
          <div className="chat-header-content">
          <div className="chat-user-info">
              <div className="chat-avatar">
            <img 
              src={selectedChat.avatar} 
              alt={selectedChat.userName} 
                  className="chat-avatar-image"
            />
              </div>
            <div className="chat-user-details">
                <div className="chat-user-main">
              <h3 className="chat-user-name">{selectedChat.userName}</h3>
                  <span className="user-type">{selectedChat.userType}</span>
                  <span className="time-indicator">• {selectedChat.time}</span>
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
              <button className="header-action-button">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                </svg>
              </button>
              <button className="header-close-button" onClick={() => setSelectedChat(null)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
            </div>
          </div>
        </div>

        {/* Property Preview */}
        <div className="property-preview">
          <div className="property-preview-content">
            <div className="property-main-info">
              <h2 className="property-title">{selectedChat.propertyTitle}</h2>
              <span className="duration-badge">{selectedChat.duration}</span>
            </div>
            <div className="property-location">{selectedChat.location}</div>
            <div className="property-dates">
              <span className="date-range">{selectedChat.date}</span>
              <span className="price-info">
                <span className="currency">Ksh</span>
                <span className="amount">{selectedChat.price}</span>
                <span className="rate">/night</span>
                <svg className="expand-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
        
        {/* Messages Section */}
        <div className="chat-messages" ref={messagesContainerRef}>
          {groupedMessages.map((msg, index) => renderMessage(msg, index))}
        </div>
        
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    );
  };

  const SkeletonChat = () => (
    <div className="chat-item skeleton">
      <div className="chat-avatar">
        <div className="skeleton-avatar"></div>
      </div>
      <div className="chat-content">
        <div className="skeleton-text-container">
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
        </div>
        <div className="skeleton-stats">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
      </div>
          </div>
  );

  if (error) {
    return (
      <div className="chats-container">
        <div className="error-message">
          {error}
          <button onClick={() => fetchChats(true)} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chats-container">
      <div className="chats-list-section">
        <div className="chats-header">
          <h1 className="chats-title">Chats <span>{chats.length}</span></h1>
          <div className="chats-actions">
            <button className="action-button">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>
            <button className="action-button">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-filters">
          <div className="filters-wrapper">
          <button 
            className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-button ${activeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unread')}
          >
            Unread
          </button>
          <button 
            className={`filter-button ${activeFilter === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveFilter('favorites')}
          >
            Favorites
            </button>
          </div>
          <button className="action-button filter-toggle">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </button>
        </div>

        <div className="chat-list">
          {initialLoad && (
            Array(4).fill(0).map((_, index) => (
              <SkeletonChat key={`skeleton-${index}`} />
            ))
          )}
          
          {!initialLoad && (
            <div className="chat-list-content">
              {chats.map((chat, index) => (
            <div 
              key={chat.id} 
                  ref={index === chats.length - 1 ? lastChatCallback : null}
                  className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
              onClick={() => handleChatClick(chat)}
            >
              <div className="chat-item-avatar">
                <img src={chat.avatar} alt={chat.userName} />
              </div>
              <div className="chat-item-content">
                <div className="chat-item-header">
                  <div className="chat-item-user">
                  <h4 className="property-title">{chat.propertyTitle}</h4>
                  <span className="property-duration">{chat.duration}</span>
                      </div>
                </div>
                <div className="chat-item-details">
                  <span className="property-location">{chat.location}</span>
                      <span className="chat-item-time">{chat.time}</span>
                    </div>
                  <div className="property-info">
                    <span className="property-date">{chat.date}</span>
                    <span className="property-price">Ksh {chat.price}/night</span>
                  </div>
                </div>
              </div>
              ))}
              
              {loading && !initialLoad && (
                <div ref={loadingRef} className="loading-more">
                  <SkeletonChat />
                </div>
              )}
              
              {chats.length === 0 && !loading && (
                <div className="no-chats-message">
                  No chats found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedChat && renderChatModal()}

      {viewerImages && (
        <ImageViewer
          images={viewerImages}
          initialIndex={viewerInitialIndex}
          onClose={closeImageViewer}
        />
      )}
    </div>
  );
};

export default ChatsView; 