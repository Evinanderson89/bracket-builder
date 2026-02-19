import { supabase } from '../supabaseClient';
import type { Payout } from '../types';
import { payoutToRow, payoutFromRow } from './mappers';
import type { PayoutRow } from './mappers';

export async function fetchAllPayouts(): Promise<Payout[] | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchAllPayouts failed:', error.message);
    return undefined;
  }

  return (data as PayoutRow[]).map(payoutFromRow);
}

export async function insertPayouts(payouts: Payout[]): Promise<void> {
  if (!supabase || payouts.length === 0) return;

  const { error } = await supabase
    .from('payouts')
    .insert(payouts.map(payoutToRow));

  if (error) {
    console.error('insertPayouts failed:', error.message);
  }
}
