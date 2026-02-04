import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { joinUserRoom } from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await authAPI.getMe();
          setUser(response.data.user);
          joinUserRoom(response.data.user.id);
        }
      } catch (err) {
        console.error('[DevHire] Auth check failed:', err);
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const register = async (email, password, full_name, user_type) => {
    try {
      setError(null);
      const response = await authAPI.register(email, password, full_name, user_type);
      localStorage.setItem('authToken', response.data.token);
      setUser(response.data.user);
      joinUserRoom(response.data.user.id);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      localStorage.setItem('authToken', response.data.token);
      setUser(response.data.user);
      joinUserRoom(response.data.user.id);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
