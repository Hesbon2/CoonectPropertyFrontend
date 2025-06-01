import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import chatService from '../services/chat.service';
import '../styles/ChatsView.css';

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
        return {
          id: chat._id || chat.id,
          inquiryId: inquiry._id || chat.inquiryId,
          avatar: inquiryUser.avatar || DEFAULT_AVATAR,
          userName: inquiryUser.firstName && inquiryUser.lastName ? 
            `${inquiryUser.firstName} ${inquiryUser.lastName}` : 'Anonymous User',
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
        return {
          id: msg._id || msg.id,
          sender: msg.sender?._id === chatData.participant?._id ? 'user' : 'host',
          name: sender.firstName && sender.lastName ? 
            `${sender.firstName} ${sender.lastName}` : 'Anonymous',
          avatar: sender.profilePicture || DEFAULT_AVATAR,
          content: msg.content,
          time: getTimeAgo(new Date(msg.createdAt)),
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat?.id) return;

    try {
      // Optimistic update
      const optimisticMessage = {
        id: Date.now().toString(),
        sender: 'user',
        name: 'You',
        avatar: DEFAULT_AVATAR,
        content: newMessage,
        time: 'just now',
        isOptimistic: true
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      const messageData = chatService.formatMessageData(newMessage);
      const response = await chatService.sendMessage(selectedChat.id, messageData);
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? response : msg
      ));
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
      setNewMessage(newMessage); // Restore the message text
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderChatModal = () => {
    if (!selectedChat) return null;

    return (
      <div className="chats-modal">
        <div className="chat-modal-header">
          <div className="chat-header-left">
          <div className="chat-user-info">
            <img 
                src={selectedChat.avatar || DEFAULT_AVATAR} 
              alt={selectedChat.userName} 
              className="chat-avatar"
            />
            <div className="chat-user-details">
              <h3 className="chat-user-name">{selectedChat.userName}</h3>
              <div className="chat-user-meta">
                <span>{selectedChat.userType}</span>
                <span>•</span>
                <span>{selectedChat.time}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="property-preview">
          <div className="property-preview-title">{selectedChat.propertyTitle}</div>
          <div className="property-preview-location">{selectedChat.location}</div>
          <div className="property-info">
            <span className="property-date">{selectedChat.date}</span>
            <span className="property-price">Ksh {selectedChat.price}/night</span>
          </div>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={msg.id || `msg-${index}`} className={`message ${msg.sender}`}>
              <img 
                src={msg.avatar || DEFAULT_AVATAR} 
                alt={msg.name} 
                className="message-avatar" 
              />
              <div className="message-content-wrapper">
                <div className="message-sender">{msg.name}</div>
                <div className="message-bubble">
                  {msg.content}
                  {msg.link && (
                    <div>
                      <a href={msg.link} target="_blank" rel="noopener noreferrer">
                        {msg.link}
                      </a>
                    </div>
                  )}
                </div>
                <div className="message-time">{msg.time}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <button className="chat-input-button">
              <svg viewBox="0 0 32 32" width="32" height="32" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M17.5 5.5C17.5 5.10218 17.342 4.72064 17.0607 4.43934C16.7794 4.15804 16.3978 4 16 4C15.6022 4 15.2206 4.15804 14.9393 4.43934C14.658 4.72064 14.5 5.10218 14.5 5.5V14.5H5.5C5.10218 14.5 4.72064 14.658 4.43934 14.9393C4.15804 15.2206 4 15.6022 4 16C4 16.3978 4.15804 16.7794 4.43934 17.0607C4.72064 17.342 5.10218 17.5 5.5 17.5H14.5V26.5C14.5 26.8978 14.658 27.2794 14.9393 27.5607C15.2206 27.842 15.6022 28 16 28C16.3978 28 16.7794 27.842 17.0607 27.5607C17.342 27.2794 17.5 26.8978 17.5 26.5V17.5H26.5C26.8978 17.5 27.2794 17.342 27.5607 17.0607C27.842 16.7794 28 16.3978 28 16C28 15.6022 27.842 15.2206 27.5607 14.9393C27.2794 14.658 26.8978 14.5 26.5 14.5H17.5V5.5Z" fill="#666666"/>
              </svg>
            </button>
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="chat-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <button 
            className="chat-send-button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <svg viewBox="0 0 32 32" width="32" height="32" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M4.53611 8.89722C4.18945 5.78522 7.39345 3.49989 10.2241 4.84122L26.1494 12.3852C29.2001 13.8292 29.2001 18.1706 26.1494 19.6146L10.2241 27.1599C7.39345 28.5012 4.19078 26.2159 4.53611 23.1039L5.17611 17.3332H16.0001C16.3537 17.3332 16.6929 17.1927 16.9429 16.9427C17.193 16.6926 17.3334 16.3535 17.3334 15.9999C17.3334 15.6463 17.193 15.3071 16.9429 15.0571C16.6929 14.807 16.3537 14.6666 16.0001 14.6666H5.17745L4.53611 8.89722Z" fill="#0066CC"/>
            </svg>
          </button>
        </div>
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
          {initialLoad ? (
            // Show skeletons on initial load
            Array(4).fill(0).map((_, index) => (
              <SkeletonChat key={`skeleton-${index}`} />
            ))
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {selectedChat && renderChatModal()}
    </div>
  );
};

export default ChatsView; 