import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthUser, saveAuthUser, clearAuthUser, getUserMode, saveUserMode } from '../utils/storage';
import type { AuthUser } from '../utils/types';

interface AuthContextValue {
  user: AuthUser | null;
  mode: 'admin' | 'user';
  loading: boolean;
  signIn: (payload: {
    id: string;
    email: string;
    name: string;
    picture?: string | null;
    accessToken?: string | null;
    provider: 'google' | 'dev';
    emailVerified: boolean;
  }) => Promise<AuthUser>;
  signInDev: (email?: string, name?: string) => Promise<AuthUser>;
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
        if (savedUser) {
          setUser({
            ...savedUser,
            provider: savedUser.provider || (savedUser.isDev ? 'dev' : 'google'),
            emailVerified: typeof savedUser.emailVerified === 'boolean' ? savedUser.emailVerified : true,
          });
        }
        setMode((savedMode as 'admin' | 'user') || 'admin');
      } catch (e) {
        console.error('Auth load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (payload: {
    id: string;
    email: string;
    name: string;
    picture?: string | null;
    accessToken?: string | null;
    provider: 'google' | 'dev';
    emailVerified: boolean;
  }): Promise<AuthUser> => {
    if (!payload.emailVerified) {
      throw new Error('Please verify your email before signing in.');
    }
    const authUser: AuthUser = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      picture: payload.picture || null,
      accessToken: payload.accessToken || null,
      provider: payload.provider,
      emailVerified: payload.emailVerified,
      isDev: payload.provider === 'dev',
    };
    setUser(authUser);
    await saveAuthUser(authUser);
    setMode('user');
    await saveUserMode('user');
    return authUser;
  }, []);

  const signInDev = useCallback(async (email?: string, name?: string): Promise<AuthUser> => {
    return signIn({
      id: `dev_${Date.now()}`,
      email: email || 'user@example.com',
      name: name || 'Test User',
      provider: 'dev',
      emailVerified: true,
      picture: null,
      accessToken: null,
    });
  }, [signIn]);

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
    <AuthContext.Provider value={{ user, mode, loading, signIn, signInDev, signOut, switchToAdmin, switchToUser }}>
      {children}
    </AuthContext.Provider>
  );
}
