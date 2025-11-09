import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user._id) {
        this.joinRoom(user._id);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(userId) {
    if (this.socket) {
      this.socket.emit('join', userId);
    }
  }

  leaveRoom(userId) {
    if (this.socket) {
      this.socket.emit('leave', userId);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);

      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);

      // Remove from stored listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export default websocketService;
