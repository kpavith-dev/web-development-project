import { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('parking_user'));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  const saveSession = ({ token, user: authenticatedUser }) => {
    localStorage.setItem('parking_token', token);
    localStorage.setItem('parking_user', JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  };

  const updateUser = (updatedUser) => {
    setUser((currentUser) => {
      const nextUser = updatedUser ? { ...currentUser, ...updatedUser } : currentUser;
      localStorage.setItem('parking_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    saveSession(data.data);
    return data;
  };

  const register = async (details) => {
    const { data } = await api.post('/auth/register', details);
    saveSession(data.data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // local logout still succeeds
    }
    localStorage.removeItem('parking_token');
    localStorage.removeItem('parking_user');
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, register, logout, updateUser }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
