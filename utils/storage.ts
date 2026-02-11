import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Player, Cohort, Bracket, Game, Payout, AuthUser } from './types';

const KEYS = {
  USERS: 'bracket_users',
  COHORTS: 'bracket_cohorts',
  BRACKETS: 'bracket_brackets',
  GAMES: 'bracket_games',
  PAYOUTS: 'bracket_payouts',
  DELETE_PASSWORD: 'bracket_delete_password',
  AUTH_USER: 'bracket_auth_user',
  USER_MODE: 'bracket_user_mode',
} as const;

// ─── Generic helpers ─────────────────────────────────────────────────────────

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Storage write failed [${key}]:`, e);
  }
}

async function loadString(key: string, fallback: string): Promise<string> {
  try {
    return (await AsyncStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

async function saveString(key: string, value: string): Promise<void> {
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
