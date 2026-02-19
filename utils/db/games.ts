import { supabase } from '../supabaseClient';
import type { Game } from '../types';
import { gameToRow, gameFromRow } from './mappers';
import type { GameRow } from './mappers';

export async function fetchAllGames(): Promise<Game[] | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchAllGames failed:', error.message);
    return undefined;
  }

  return (data as GameRow[]).map(gameFromRow);
}

export async function upsertGame(game: Game): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('games')
    .upsert(gameToRow(game), { onConflict: 'cohort_id,player_id,game_number' });

  if (error) {
    console.error('upsertGame failed:', error.message);
  }
}
