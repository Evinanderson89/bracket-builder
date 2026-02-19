import { supabase } from '../supabaseClient';
import type { PlayerRequest } from '../types';
import { playerRequestToRow, playerRequestFromRow } from './mappers';
import type { PlayerRequestRow } from './mappers';

export async function fetchAllPlayerRequests(): Promise<PlayerRequest[] | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('player_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('fetchAllPlayerRequests failed:', error.message);
    return undefined;
  }

  return (data as PlayerRequestRow[]).map(playerRequestFromRow);
}

export async function insertPlayerRequest(request: PlayerRequest): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('player_requests')
    .insert(playerRequestToRow(request));

  if (error) {
    console.error('insertPlayerRequest failed:', error.message);
  }
}

export async function updatePlayerRequest(
  id: string,
  updates: Partial<PlayerRequest>,
): Promise<void> {
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.resolvedAt !== undefined) row.resolved_at = updates.resolvedAt;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from('player_requests')
    .update(row)
    .eq('id', id);

  if (error) {
    console.error('updatePlayerRequest failed:', error.message);
  }
}
