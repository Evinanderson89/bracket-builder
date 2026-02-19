import { supabase } from '../supabaseClient';
import type { Bracket } from '../types';
import { bracketToRow, bracketFromRow } from './mappers';
import type { BracketRow } from './mappers';

export async function fetchAllBrackets(): Promise<Bracket[] | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('brackets')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchAllBrackets failed:', error.message);
    return undefined;
  }

  return (data as BracketRow[]).map(bracketFromRow);
}

export async function insertBrackets(brackets: Bracket[]): Promise<void> {
  if (!supabase || brackets.length === 0) return;

  const { error } = await supabase
    .from('brackets')
    .insert(brackets.map(bracketToRow));

  if (error) {
    console.error('insertBrackets failed:', error.message);
  }
}

export async function updateBracket(id: string, updates: Partial<Bracket>): Promise<void> {
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (updates.bracketNumber !== undefined) row.bracket_number = updates.bracketNumber;
  if (updates.players !== undefined) row.players = updates.players;
  if (updates.structure !== undefined) row.structure = updates.structure;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from('brackets')
    .update(row)
    .eq('id', id);

  if (error) {
    console.error('updateBracket failed:', error.message);
  }
}
