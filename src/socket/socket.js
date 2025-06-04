const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const User = require('../models/user.model');

class SocketServer {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.userSockets = new Map(); // userId -> socket
    this.chatRooms = new Map(); // chatId -> Set of userIds

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        
        // Update user's online status
        await User.findByIdAndUpdate(decoded.id, { isOnline: true });
        
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.userId}`);
      this.userSockets.set(socket.userId, socket);

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.userId}`);
        this.userSockets.delete(socket.userId);
        
        // Update user's online status and last seen
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Remove user from all chat rooms
        for (const [chatId, users] of this.chatRooms.entries()) {
          if (users.has(socket.userId)) {
            users.delete(socket.userId);
            if (users.size === 0) {
              this.chatRooms.delete(chatId);
            }
          }
        }
      });

      // Join chat room
      socket.on('join_chat', async ({ chatId }) => {
        try {
          const chat = await Chat.findById(chatId);
          if (!chat) throw new Error('Chat not found');

          socket.join(chatId);
          if (!this.chatRooms.has(chatId)) {
            this.chatRooms.set(chatId, new Set());
          }
          this.chatRooms.get(chatId).add(socket.userId);

          // Mark messages as read
          await Message.updateMany(
            { 
              chat: chatId,
              sender: { $ne: socket.userId },
              readBy: { $ne: socket.userId }
            },
            { $addToSet: { readBy: socket.userId } }
          );
        } catch (error) {
          console.error('Error joining chat:', error);
        }
      });

      // Leave chat room
      socket.on('leave_chat', ({ chatId }) => {
        socket.leave(chatId);
        const chatUsers = this.chatRooms.get(chatId);
        if (chatUsers) {
          chatUsers.delete(socket.userId);
        }
      });

      // Send message
      socket.on('send_message', async ({ chatId, content, type = 'text' }) => {
        try {
          const message = await Message.create({
            chat: chatId,
            sender: socket.userId,
            content,
            type,
            readBy: [socket.userId]
          });

          await message.populate('sender', 'firstName lastName avatar');
          
          this.io.to(chatId).emit('new_message', message);
          
          // Update chat's last message
          await Chat.findByIdAndUpdate(chatId, {
            lastMessage: message._id
          });
        } catch (error) {
          console.error('Error sending message:', error);
        }
      });

      // Update message
      socket.on('update_message', async ({ chatId, messageId, content }) => {
        try {
          const message = await Message.findOneAndUpdate(
            { _id: messageId, sender: socket.userId },
            { 
              content,
              isEdited: true,
              editedAt: Date.now()
            },
            { new: true }
          ).populate('sender', 'firstName lastName avatar');

          if (message) {
            this.io.to(chatId).emit('message_updated', message);
          }
        } catch (error) {
          console.error('Error updating message:', error);
        }
      });

      // Delete message
      socket.on('delete_message', async ({ chatId, messageId }) => {
        try {
          const message = await Message.findOneAndDelete({
            _id: messageId,
            sender: socket.userId
          });

          if (message) {
            this.io.to(chatId).emit('message_deleted', { messageId });
          }
        } catch (error) {
          console.error('Error deleting message:', error);
        }
      });

      // Handle reactions
      socket.on('add_reaction', async ({ chatId, messageId, emoji }) => {
        try {
          const message = await Message.findByIdAndUpdate(
            messageId,
            {
              $addToSet: {
                [`reactions.${emoji}`]: socket.userId
              }
            },
            { new: true }
          );

          if (message) {
            this.io.to(chatId).emit('reaction_updated', {
              messageId,
              reactions: message.reactions
            });
          }
        } catch (error) {
          console.error('Error adding reaction:', error);
        }
      });

      socket.on('remove_reaction', async ({ chatId, messageId, emoji }) => {
        try {
          const message = await Message.findByIdAndUpdate(
            messageId,
            {
              $pull: {
                [`reactions.${emoji}`]: socket.userId
              }
            },
            { new: true }
          );

          if (message) {
            this.io.to(chatId).emit('reaction_updated', {
              messageId,
              reactions: message.reactions
            });
          }
        } catch (error) {
          console.error('Error removing reaction:', error);
        }
      });

      // Typing indicator
      socket.on('typing', ({ chatId, isTyping }) => {
        socket.to(chatId).emit('user_typing', {
          userId: socket.userId,
          isTyping
        });
      });

      // Mark message as read
      socket.on('mark_read', async ({ chatId, messageId }) => {
        try {
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: socket.userId }
          });

          this.io.to(chatId).emit('message_read', {
            messageId,
            userId: socket.userId
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });
    });
  }

  // Utility methods
  getUserSocket(userId) {
    return this.userSockets.get(userId);
  }

  getChatUsers(chatId) {
    return this.chatRooms.get(chatId) || new Set();
  }
}

module.exports = SocketServer; 