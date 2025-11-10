import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import websocketService from '../services/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }

    // Verify token and get user data
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Connect to websocket when user is authenticated
    if (user) {
      websocketService.connect();
      websocketService.joinRoom(user._id);
    } else {
      websocketService.disconnect();
    }

    return () => {
      if (user) {
        websocketService.leaveRoom(user._id);
      }
    };
  }, [user]);

  const fetchUser = async () => {
    try {
      console.log('👤 Fetching user profile...');
      const response = await authAPI.getMe();
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      console.log('✅ User profile loaded');
    } catch (error) {
      console.error('❌ Failed to fetch user:', error);

      // Don't logout on network/timeout errors, only on auth errors
      if (!error.isTimeout && !error.isNetworkError) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, skipApiCall = false, providedData = null) => {
    try {
      // If data is provided (from email verification), use it directly
      if (skipApiCall && providedData) {
        const { user, token } = providedData;
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true, user };
      }

      console.log('🔐 Attempting login for:', email);
      const response = await authAPI.login({ email, password });

      // Check if verification is required
      if (response.requiresVerification) {
        console.warn('📧 Email verification required');
        return {
          success: false,
          error: response.message || 'Please verify your email',
          requiresVerification: true,
          email: response.email || email
        };
      }

      const { user, token } = response.data;

      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Login successful for user:', user.email);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Login failed:', error);

      // Check if error response indicates verification is needed
      if (error.requiresVerification) {
        return {
          success: false,
          error: error.message || 'Please verify your email',
          requiresVerification: true,
          email: error.email
        };
      }

      // Provide specific error messages for different error types
      let errorMessage = error.message || 'Login failed. Please try again.';

      if (error.isTimeout) {
        errorMessage = 'Server is taking too long to respond. Please wait a moment and try again.';
      } else if (error.isNetworkError) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration for:', userData.email);
      const response = await authAPI.register(userData);

      // Check if verification is required (new flow)
      if (response.data && response.data.requiresVerification) {
        console.log('📧 Email verification required for new user');
        return {
          success: true,
          data: response.data,
          requiresVerification: true
        };
      }

      // Old flow - direct login (backwards compatible)
      const { user, token } = response.data;

      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Registration successful for user:', user.email);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Registration failed:', error);

      let errorMessage = error.message || 'Registration failed. Please try again.';

      if (error.isTimeout) {
        errorMessage = 'Server is taking too long to respond. Please wait a moment and try again.';
      } else if (error.isNetworkError) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    websocketService.disconnect();
  };

  const updateUser = async (userData) => {
    try {
      const response = await authAPI.updateProfile(userData);
      const updatedUser = response.data.user;

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
