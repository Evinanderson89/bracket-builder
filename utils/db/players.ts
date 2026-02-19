import { supabase } from '../supabaseClient';
import type { Player } from '../types';
import { playerToRow, playerFromRow } from './mappers';
import type { PlayerRow } from './mappers';

export async function fetchAllPlayers(): Promise<Player[] | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchAllPlayers failed:', error.message);
    return undefined;
  }

  return (data as PlayerRow[]).map(playerFromRow);
}

export async function insertPlayer(player: Player): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('players')
    .insert(playerToRow(player));

  if (error) {
    console.error('insertPlayer failed:', error.message);
  }
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.email !== undefined) row.email = updates.email ?? null;
  if (updates.average !== undefined) row.average = updates.average;
  if (updates.handicap !== undefined) row.handicap = updates.handicap;
  if (updates.numBrackets !== undefined) row.num_brackets = updates.numBrackets;
  if (updates.aliases !== undefined) row.aliases = updates.aliases ?? [];

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from('players')
    .update(row)
    .eq('id', id);

  if (error) {
    console.error('updatePlayer failed:', error.message);
  }
}

export async function deletePlayer(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deletePlayer failed:', error.message);
  }
}
