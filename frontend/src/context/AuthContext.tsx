import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string; portal_type?: string; remember_me?: boolean }) => Promise<User>;
  register: (userData: any) => Promise<User>;
  registerStaff: (staffData: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hospital_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('hospital_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch (err) {
      console.error('Failed to restore session:', err);
      localStorage.removeItem('hospital_token');
      localStorage.removeItem('hospital_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { username: string; password: string; portal_type?: string; remember_me?: boolean }) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(credentials);
      localStorage.setItem('hospital_token', data.access_token);
      localStorage.setItem('hospital_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const newUser = await authApi.register(userData);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const registerStaff = async (staffData: any) => {
    setIsLoading(true);
    try {
      const newStaff = await authApi.registerStaff(staffData);
      return newStaff;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        token,
        isLoading,
        login,
        register,
        registerStaff,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
