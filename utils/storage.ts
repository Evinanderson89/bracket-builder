import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Player, Cohort, Bracket, Game, Payout, AuthUser, PlayerRequest } from './types';

const KEYS = {
  USERS: 'bracket_users',
  COHORTS: 'bracket_cohorts',
  BRACKETS: 'bracket_brackets',
  GAMES: 'bracket_games',
  PAYOUTS: 'bracket_payouts',
  DELETE_PASSWORD: 'bracket_delete_password',
  AUTH_USER: 'bracket_auth_user',
  USER_MODE: 'bracket_user_mode',
  PLAYER_REQUESTS: 'bracket_player_requests',
} as const;

const LOCAL_ONLY_KEYS = new Set<string>([KEYS.AUTH_USER, KEYS.USER_MODE]);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const cloudEnabled = !!(supabaseUrl && supabaseAnonKey);

const supabase = cloudEnabled
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function readCloudValue<T>(key: string): Promise<T | undefined> {
  if (!supabase || LOCAL_ONLY_KEYS.has(key)) return undefined;

  const { data, error } = await supabase
    .from('app_state')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Cloud read failed [${key}]:`, error.message);
    return undefined;
  }

  return data?.value as T | undefined;
}

async function writeCloudValue<T>(key: string, value: T): Promise<void> {
  if (!supabase || LOCAL_ONLY_KEYS.has(key)) return;

  const { error } = await supabase
    .from('app_state')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    console.error(`Cloud write failed [${key}]:`, error.message);
  }
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const cloud = await readCloudValue<T>(key);
    if (cloud !== undefined) {
      return cloud;
    }
  } catch {
    // fall through to local
  }

  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON<T>(key: string, data: T): Promise<void> {
  try {
    await writeCloudValue(key, data);
  } catch {
    // fall through to local cache
  }

  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Storage write failed [${key}]:`, e);
  }
}

async function loadString(key: string, fallback: string): Promise<string> {
  try {
    const cloud = await readCloudValue<string>(key);
    if (typeof cloud === 'string') {
      return cloud;
    }
  } catch {
    // fall through to local
  }

  try {
    return (await AsyncStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

async function saveString(key: string, value: string): Promise<void> {
  try {
    await writeCloudValue(key, value);
  } catch {
    // fall through to local cache
  }

  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error(`Storage write failed [${key}]:`, e);
  }
}

// ─── Domain operations ───────────────────────────────────────────────────────

export const getUsers = () => loadJSON<Player[]>(KEYS.USERS, []);
export const saveUsers = (data: Player[]) => saveJSON(KEYS.USERS, data);

export const getCohorts = () => loadJSON<Cohort[]>(KEYS.COHORTS, []);
export const saveCohorts = (data: Cohort[]) => saveJSON(KEYS.COHORTS, data);

export const getBrackets = () => loadJSON<Bracket[]>(KEYS.BRACKETS, []);
export const saveBrackets = (data: Bracket[]) => saveJSON(KEYS.BRACKETS, data);

export const getGames = () => loadJSON<Game[]>(KEYS.GAMES, []);
export const saveGames = (data: Game[]) => saveJSON(KEYS.GAMES, data);

export const getPayouts = () => loadJSON<Payout[]>(KEYS.PAYOUTS, []);
export const savePayouts = (data: Payout[]) => saveJSON(KEYS.PAYOUTS, data);

export const getDeletePassword = () => loadString(KEYS.DELETE_PASSWORD, '');
export const saveDeletePassword = (pw: string) => saveString(KEYS.DELETE_PASSWORD, pw);

export const getAuthUser = () => loadJSON<AuthUser | null>(KEYS.AUTH_USER, null);
export const saveAuthUser = (user: AuthUser) => saveJSON(KEYS.AUTH_USER, user);
export const clearAuthUser = async () => {
  try { await AsyncStorage.removeItem(KEYS.AUTH_USER); } catch { /* ignore */ }
};

export const getUserMode = () => loadString(KEYS.USER_MODE, 'admin');
export const saveUserMode = (mode: string) => saveString(KEYS.USER_MODE, mode);

export const getPlayerRequests = () => loadJSON<PlayerRequest[]>(KEYS.PLAYER_REQUESTS, []);
export const savePlayerRequests = (data: PlayerRequest[]) => saveJSON(KEYS.PLAYER_REQUESTS, data);

export const isCloudStorageEnabled = () => cloudEnabled;
