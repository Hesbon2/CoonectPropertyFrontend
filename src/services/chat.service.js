import api from './api.config';
import { uploadImage } from '../config/cloudinary';

class ChatService {
  async createOrGetChat(inquiryId) {
    const response = await api.post('/chats', { inquiryId });
    return response.data;
  }

  async getMyChats() {
    const response = await api.get('/chats');
    return response.data;
  }

  async sendMessage(chatId, messageData) {
    let response;
    
    if (messageData.type === 'image' && messageData.file) {
      try {
        console.log('Uploading image:', {
          fileName: messageData.file.name,
          fileSize: messageData.file.size,
          fileType: messageData.file.type
        });

        // Upload image to Cloudinary
        const { url, publicId } = await uploadImage(messageData.file);
        
        console.log('Image uploaded successfully:', { url, publicId });

        // Send message with Cloudinary URL
        response = await api.post(`/chats/${chatId}/messages`, {
          content: messageData.content || messageData.file.name,
          messageType: 'image',
          images: [url],
          metadata: {
            publicId,
            fileName: messageData.file.name,
            fileSize: messageData.file.size,
            mimeType: messageData.file.type
          }
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }
    } else {
      // Handle text message
      response = await api.post(`/chats/${chatId}/messages`, {
        content: messageData.content,
        messageType: messageData.type || 'text'
      });
    }
    
    return response.data;
  }

  async markAsRead(chatId) {
    const response = await api.put(`/chats/${chatId}/read`);
    return response.data;
  }

  async archiveChat(chatId) {
    const response = await api.put(`/chats/${chatId}/archive`);
    return response.data;
  }

  // Helper method to format message data
  formatMessageData(content, type = 'text', file = null) {
    return {
      content,
      type,
      file
    };
  }
}

export default new ChatService(); 