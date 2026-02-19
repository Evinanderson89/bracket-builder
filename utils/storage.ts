import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Player, Cohort, Bracket, Game, Payout, AuthUser, PlayerRequest } from './types';
import { cloudEnabled } from './supabaseClient';

// ─── AsyncStorage keys ──────────────────────────────────────────────────────

export const CACHE_KEYS = {
  USERS: 'bracket_users',
  COHORTS: 'bracket_cohorts',
  BRACKETS: 'bracket_brackets',
  GAMES: 'bracket_games',
  PAYOUTS: 'bracket_payouts',
  PLAYER_REQUESTS: 'bracket_player_requests',
  DELETE_PASSWORD: 'bracket_delete_password',
  AUTH_USER: 'bracket_auth_user',
  USER_MODE: 'bracket_user_mode',
} as const;

// ─── Local-only operations (auth, mode) ─────────────────────────────────────

export const getAuthUser = async (): Promise<AuthUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.AUTH_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const saveAuthUser = async (user: AuthUser): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.AUTH_USER, JSON.stringify(user));
  } catch (e) {
    console.error('saveAuthUser failed:', e);
  }
};

export const clearAuthUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.AUTH_USER);
  } catch { /* ignore */ }
};

export const getUserMode = async (): Promise<string> => {
  try {
    return (await AsyncStorage.getItem(CACHE_KEYS.USER_MODE)) ?? 'admin';
  } catch {
    return 'admin';
  }
};

export const saveUserMode = async (mode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.USER_MODE, mode);
  } catch (e) {
    console.error('saveUserMode failed:', e);
  }
};

// ─── Delete password (local-only, simple string) ────────────────────────────

export const getDeletePassword = async (): Promise<string> => {
  try {
    return (await AsyncStorage.getItem(CACHE_KEYS.DELETE_PASSWORD)) ?? '';
  } catch {
    return '';
  }
};

export const saveDeletePassword = async (pw: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.DELETE_PASSWORD, pw);
  } catch (e) {
    console.error('saveDeletePassword failed:', e);
  }
};

// ─── AsyncStorage cache helpers (used by AppContext for offline fallback) ────

export async function loadCachedJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveCacheJSON<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Cache write failed [${key}]:`, e);
  }
}

export const isCloudStorageEnabled = () => cloudEnabled;
