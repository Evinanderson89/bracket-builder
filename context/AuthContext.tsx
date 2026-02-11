import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthUser, saveAuthUser, clearAuthUser, getUserMode, saveUserMode } from '../utils/storage';
import type { AuthUser } from '../utils/types';

interface AuthContextValue {
  user: AuthUser | null;
  mode: 'admin' | 'user';
  loading: boolean;
  signIn: (email?: string, name?: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  switchToAdmin: () => Promise<void>;
  switchToUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<'admin' | 'user'>('admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedUser, savedMode] = await Promise.all([getAuthUser(), getUserMode()]);
        if (savedUser) setUser(savedUser);
        setMode((savedMode as 'admin' | 'user') || 'admin');
      } catch (e) {
        console.error('Auth load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email?: string, name?: string): Promise<AuthUser> => {
    const authUser: AuthUser = {
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
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    await clearAuthUser();
    setMode('admin');
    await saveUserMode('admin');
  }, []);

  const switchToAdmin = useCallback(async () => {
    setMode('admin');
    await saveUserMode('admin');
  }, []);

  const switchToUser = useCallback(async () => {
    setMode('user');
    await saveUserMode('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, mode, loading, signIn, signOut, switchToAdmin, switchToUser }}>
      {children}
    </AuthContext.Provider>
  );
}
