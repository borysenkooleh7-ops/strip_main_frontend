import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Track request start time for slow backend warnings
let requestStartTime = null;
let slowRequestWarningShown = false;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
  timeout: 90000, // 90 second timeout (to handle Render.com cold starts)
});

// Request interceptor - add auth token and track timing
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Track request start time
    config.metadata = { startTime: new Date() };
    requestStartTime = Date.now();
    slowRequestWarningShown = false;

    // Show warning after 5 seconds if request is still pending
    setTimeout(() => {
      if (requestStartTime && !slowRequestWarningShown) {
        console.warn('⏳ Backend is waking up from sleep (Render.com cold start). This may take 30-60 seconds...');
        toast.info('Server is waking up, please wait...', {
          autoClose: false,
          toastId: 'slow-request'
        });
        slowRequestWarningShown = true;
      }
    }, 5000);

    console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Setup Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors with detailed logging
api.interceptors.response.use(
  (response) => {
    // Clear slow request warning
    requestStartTime = null;
    toast.dismiss('slow-request');

    // Log response time
    const duration = new Date() - response.config.metadata.startTime;
    console.log(`✅ API Response: ${response.config.method.toUpperCase()} ${response.config.url} (${duration}ms)`);

    return response.data;
  },
  async (error) => {
    // Clear slow request warning
    requestStartTime = null;
    toast.dismiss('slow-request');

    // Detailed error logging
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ REQUEST TIMEOUT:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
        message: 'The backend took too long to respond. This usually means the Render.com server is cold starting.'
      });

      // Check if we should retry
      const shouldRetry = !error.config.__retryCount;
      if (shouldRetry) {
        error.config.__retryCount = 1;
        console.log('🔄 Retrying request...');
        toast.info('Request timed out. Retrying...', { autoClose: 3000 });

        // Retry the request
        return api.request(error.config);
      }

      return Promise.reject({
        message: 'Connection timeout. The server is taking too long to respond. Please try again.',
        isTimeout: true
      });
    }

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('🌐 NETWORK ERROR:', {
        url: error.config?.url,
        message: 'Cannot reach the backend server. Check if backend is running.',
        apiUrl: API_URL
      });
      return Promise.reject({
        message: 'Cannot connect to server. Please check your internet connection or try again later.',
        isNetworkError: true
      });
    }

    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message || 'An error occurred';

      console.error(`❌ HTTP ${status} ERROR:`, {
        url: error.config?.url,
        method: error.config?.method,
        status: status,
        message: message,
        data: error.response.data
      });

      // If 401, logout user
      if (status === 401) {
        console.warn('🚪 Unauthorized - Logging out user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      return Promise.reject({ message, ...error.response.data });
    }

    // Unknown error
    console.error('❓ UNKNOWN ERROR:', error);
    const message = error.message || 'An unexpected error occurred';
    return Promise.reject({ message });
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
};

// Payment API
export const paymentAPI = {
  // Stripe endpoints (legacy)
  getConversionRate: (amount) => api.get('/payments/conversion-rate', { params: { amount } }),
  createPaymentIntent: (data) => api.post('/payments/create-intent', data),

  // Transak endpoints (on-ramp)
  createTransakOrder: (data) => api.post('/payments/transak/create-order', data),
  updateTransakOrderStatus: (orderId, data) => api.patch(`/payments/transak/order/${orderId}`, data),
  getTransakOrder: (orderId) => api.get(`/payments/transak/order/${orderId}`),
};

// Transaction API
export const transactionAPI = {
  getTransactions: (params) => api.get('/transactions', { params }),
  getTransaction: (id) => api.get(`/transactions/${id}`),
  getStatistics: () => api.get('/transactions/statistics'),
};

export default api;
