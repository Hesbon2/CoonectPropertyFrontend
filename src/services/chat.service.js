import api from './api.config';

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
    const response = await api.post(`/chats/${chatId}/messages`, messageData);
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
  formatMessageData(content, type = 'text', images = []) {
    return {
      content,
      messageType: type,
      images,
    };
  }
}

export default new ChatService(); 