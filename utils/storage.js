import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USERS: 'bracket_users',
  COHORTS: 'bracket_cohorts',
  BRACKETS: 'bracket_brackets',
  GAMES: 'bracket_games',
  PAYOUTS: 'bracket_payouts',
  DELETE_PASSWORD: 'bracket_delete_password',
};

// User operations
export const saveUsers = async (users) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

export const getUsers = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

// Cohort operations
export const saveCohorts = async (cohorts) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.COHORTS, JSON.stringify(cohorts));
  } catch (error) {
    console.error('Error saving cohorts:', error);
  }
};

export const getCohorts = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.COHORTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting cohorts:', error);
    return [];
  }
};

// Bracket operations
export const saveBrackets = async (brackets) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BRACKETS, JSON.stringify(brackets));
  } catch (error) {
    console.error('Error saving brackets:', error);
  }
};

export const getBrackets = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BRACKETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting brackets:', error);
    return [];
  }
};

// Game operations
export const saveGames = async (games) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  } catch (error) {
    console.error('Error saving games:', error);
  }
};

export const getGames = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting games:', error);
    return [];
  }
};

// Payout operations
export const savePayouts = async (payouts) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(payouts));
  } catch (error) {
    console.error('Error saving payouts:', error);
  }
};

export const getPayouts = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PAYOUTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting payouts:', error);
    return [];
  }
};

// Delete password operations
export const getDeletePassword = async () => {
  try {
    const password = await AsyncStorage.getItem(STORAGE_KEYS.DELETE_PASSWORD);
    return password || '';
  } catch (error) {
    console.error('Error getting delete password:', error);
    return '';
  }
};

export const saveDeletePassword = async (password) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DELETE_PASSWORD, password);
  } catch (error) {
    console.error('Error saving delete password:', error);
  }
};


