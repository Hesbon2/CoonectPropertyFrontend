import io from 'socket.io-client';
import { EventEmitter } from 'events';
import authService from './auth.service';

class SocketService extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.baseURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    // Bind event handlers to maintain 'this' context
    this.handleInquiryCreated = this.handleInquiryCreated.bind(this);
    this.handleInquiryUpdated = this.handleInquiryUpdated.bind(this);
    this.handleInquiryDeleted = this.handleInquiryDeleted.bind(this);
    this.handleEngagementUpdated = this.handleEngagementUpdated.bind(this);
    this.handleBookmarkUpdated = this.handleBookmarkUpdated.bind(this);
    this.handleLikeUpdated = this.handleLikeUpdated.bind(this);
    this.handleUserStatusChanged = this.handleUserStatusChanged.bind(this);
    this.handleUserTyping = this.handleUserTyping.bind(this);
  }

  connect() {
    if (!this.socket) {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      this.socket = io(this.baseURL, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
        withCredentials: true
      });

      this.setupEventListeners();
    }
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.emit('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.emit('disconnect');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('connect_error', error);
      if (error.message === 'Authentication error') {
        // Handle authentication error (e.g., redirect to login)
        authService.logout();
        window.location.href = '/login';
      } else {
        // Try to reconnect with polling if websocket fails
        if (this.socket.io.opts.transports.includes('websocket')) {
          console.log('Falling back to polling transport');
          this.socket.io.opts.transports = ['polling'];
          this.socket.connect();
        }
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Add ping/pong for connection health check
    this.socket.on('ping', () => {
      console.log('Received ping from server');
      this.socket.emit('pong');
    });

    // Property listing updates
    this.socket.on('inquiry_created', this.handleInquiryCreated);
    this.socket.on('inquiry_updated', this.handleInquiryUpdated);
    this.socket.on('inquiry_deleted', this.handleInquiryDeleted);

    // Engagement updates
    this.socket.on('engagement_updated', this.handleEngagementUpdated);
    this.socket.on('bookmark_updated', this.handleBookmarkUpdated);
    this.socket.on('like_updated', this.handleLikeUpdated);

    // User status updates
    this.socket.on('user_status_changed', this.handleUserStatusChanged);

    // Typing indicators
    this.socket.on('user_typing', this.handleUserTyping);
  }

  // Event handlers with debug logging
  handleInquiryCreated(inquiry) {
    console.log('Socket: Received inquiry_created event', inquiry);
    if (inquiry && inquiry.user) {
      console.log('Socket: Inquiry created with user data:', inquiry.user);
    }
    this.emit('inquiry_created', inquiry);
  }

  handleInquiryUpdated(inquiry) {
    console.log('Socket: Received inquiry_updated event', inquiry);
    if (inquiry && inquiry.user) {
      console.log('Socket: Inquiry updated with user data:', inquiry.user);
    }
    this.emit('inquiry_updated', inquiry);
  }

  handleInquiryDeleted(inquiryId) {
    console.log('Socket: Received inquiry_deleted event', inquiryId);
    this.emit('inquiry_deleted', inquiryId);
  }

  handleEngagementUpdated(data) {
    console.log('Socket: Received engagement_updated event', data);
    this.emit('engagement_updated', data);
  }

  handleBookmarkUpdated(data) {
    console.log('Socket: Received bookmark_updated event', data);
    this.emit('bookmark_updated', data);
  }

  handleLikeUpdated(data) {
    console.log('Socket: Received like_updated event', data);
    this.emit('like_updated', data);
  }

  handleUserStatusChanged(data) {
    console.log('Socket: Received user_status_changed event', data);
    this.emit('user_status_changed', data);
  }

  handleUserTyping(data) {
    console.log('Socket: Received user_typing event', data);
    this.emit('user_typing', data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Chat events
  joinChat(chatId) {
    if (this.socket && chatId) {
      this.socket.emit('join_chat', { chatId });
    }
  }

  leaveChat(chatId) {
    if (this.socket && chatId) {
      this.socket.emit('leave_chat', { chatId });
    }
  }

  sendMessage(chatId, message) {
    if (this.socket && chatId) {
      this.socket.emit('send_message', { chatId, ...message });
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  updateMessage(chatId, messageId, update) {
    if (this.socket && chatId && messageId) {
      this.socket.emit('update_message', { chatId, messageId, ...update });
    }
  }

  deleteMessage(chatId, messageId) {
    if (this.socket && chatId && messageId) {
      this.socket.emit('delete_message', { chatId, messageId });
    }
  }

  onMessageUpdated(callback) {
    if (this.socket) {
      this.socket.on('message_updated', callback);
    }
  }

  onMessageDeleted(callback) {
    if (this.socket) {
      this.socket.on('message_deleted', callback);
    }
  }

  // Reaction events
  addReaction(chatId, messageId, emoji) {
    if (this.socket && chatId && messageId) {
      this.socket.emit('add_reaction', { chatId, messageId, emoji });
    }
  }

  removeReaction(chatId, messageId, emoji) {
    if (this.socket && chatId && messageId) {
      this.socket.emit('remove_reaction', { chatId, messageId, emoji });
    }
  }

  onReactionUpdated(callback) {
    if (this.socket) {
      this.socket.on('reaction_updated', callback);
    }
  }

  // Typing indicators
  sendTyping(chatId, isTyping) {
    if (this.socket && chatId) {
      this.socket.emit('typing', { chatId, isTyping });
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  // Message status
  markMessageRead(chatId, messageId) {
    if (this.socket && chatId && messageId) {
      this.socket.emit('mark_read', { chatId, messageId });
    }
  }

  onMessageRead(callback) {
    if (this.socket) {
      this.socket.on('message_read', callback);
    }
  }

  // Online status
  onUserStatusChanged(callback) {
    if (this.socket) {
      this.socket.on('user_status_changed', callback);
    }
  }

  // Cleanup
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    super.removeAllListeners();
  }

  // Check connection status
  isConnected() {
    return this.socket?.connected || false;
  }

  // Reconnect manually
  reconnect() {
    this.disconnect();
    return this.connect();
  }

  // Add methods to emit events with debug logging
  emitInquiryCreated(inquiry) {
    if (this.socket) {
      console.log('Socket: Emitting inquiry_created event', inquiry);
      this.socket.emit('inquiry_created', inquiry);
      this.socket.emit('stats_updated');
    }
  }

  emitInquiryUpdated(inquiry) {
    if (this.socket) {
      console.log('Socket: Emitting inquiry_updated event', inquiry);
      this.socket.emit('inquiry_updated', inquiry);
      this.socket.emit('stats_updated');
    }
  }

  emitInquiryDeleted(inquiryId) {
    if (this.socket) {
      console.log('Socket: Emitting inquiry_deleted event', inquiryId);
      this.socket.emit('inquiry_deleted', inquiryId);
      this.socket.emit('stats_updated');
    }
  }

  emitEngagementUpdate(data) {
    if (this.socket) {
      console.log('Socket: Emitting engagement_update event', data);
      this.socket.emit('engagement_update', data);
    }
  }

  emitBookmarkUpdate(data) {
    if (this.socket) {
      console.log('Socket: Emitting bookmark_update event', data);
      this.socket.emit('bookmark_update', data);
    }
  }

  emitLikeUpdate(data) {
    if (this.socket) {
      console.log('Socket: Emitting like_update event', data);
      this.socket.emit('like_update', data);
    }
  }

  emitChatCreated(chat) {
    if (this.socket) {
      this.socket.emit('chat_created', chat);
      this.socket.emit('stats_updated');
    }
  }
}

export default new SocketService(); 