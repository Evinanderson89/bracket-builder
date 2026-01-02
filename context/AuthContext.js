import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthUser, saveAuthUser, clearAuthUser, getUserMode, saveUserMode } from '../utils/storage';

// Note: For production, you'll need to set up Google OAuth credentials
// For now, using a simplified dev mode that doesn't require OAuth setup

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
  const [mode, setMode] = useState('admin'); // 'admin' or 'user'
  const [loading, setLoading] = useState(true);

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const [savedUser, savedMode] = await Promise.all([
        getAuthUser(),
        getUserMode(),
      ]);
      if (savedUser) {
        setUser(savedUser);
      }
      setMode(savedMode || 'admin');
    } catch (error) {
      console.error('Error loading auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    // For now, redirect to dev sign-in
    // In production, implement full OAuth flow here
    throw new Error('Full OAuth not yet implemented. Use dev sign-in for testing.');
  };

  // Simplified sign-in for development (without OAuth setup)
  const signInWithGoogleDev = async (email, name) => {
    try {
      const authUser = {
        id: `dev_${Date.now()}`,
        email: email || 'user@example.com',
        name: name || 'Test User',
        picture: null,
        accessToken: null,
        isDev: true,
      };
      
      setUser(authUser);
      await saveAuthUser(authUser);
      setMode('user');
      await saveUserMode('user');
      return authUser;
    } catch (error) {
      console.error('Dev sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      await clearAuthUser();
      setMode('admin');
      await saveUserMode('admin');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const switchToAdmin = async () => {
    setMode('admin');
    await saveUserMode('admin');
  };

  const switchToUser = async () => {
    // Allow switching to user mode even without a user (they can sign in)
    setMode('user');
    await saveUserMode('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        mode,
        loading,
        signInWithGoogle: signInWithGoogleDev, // Use dev mode by default
        signInWithGoogleDev,
        signOut,
        switchToAdmin,
        switchToUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

