import { supabase } from '../supabaseClient';
import type { Player, Cohort, Bracket, Game, Payout, PlayerRequest } from '../types';
import { playerToRow } from './mappers';
import { cohortToRow } from './mappers';
import { bracketToRow } from './mappers';
import { gameToRow } from './mappers';
import { payoutToRow } from './mappers';
import { playerRequestToRow } from './mappers';

/**
 * One-time migration from the old `app_state` key-value table to the new
 * relational tables. Safe to re-run — uses ON CONFLICT DO NOTHING.
 *
 * Returns true if migration ran, false if skipped (no supabase or no old data).
 */
export async function migrateFromKvToRelational(): Promise<boolean> {
  if (!supabase) return false;
  const sb = supabase;

  // Check if old app_state table exists and has data
  const { data: appStateCheck, error: checkError } = await sb
    .from('app_state')
    .select('key')
    .limit(1);

  if (checkError || !appStateCheck?.length) {
    return false;
  }

  console.log('[migrate] Starting migration from app_state to relational tables...');

  // Read all old data
  const readOld = async <T>(key: string): Promise<T[]> => {
    const { data, error } = await sb
      .from('app_state')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data?.value) return [];
    return data.value as T[];
  };

  const oldPlayers = await readOld<Player>('bracket_users');
  const oldCohorts = await readOld<Cohort>('bracket_cohorts');
  const oldBrackets = await readOld<Bracket>('bracket_brackets');
  const oldGames = await readOld<Game>('bracket_games');
  const oldPayouts = await readOld<Payout>('bracket_payouts');
  const oldRequests = await readOld<PlayerRequest>('bracket_player_requests');

  // 1. Players first (no FKs to other tables)
  if (oldPlayers.length) {
    const rows = oldPlayers.map(playerToRow);
    for (const row of rows) {
      const { error } = await sb
        .from('players')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[migrate] player insert failed:', row.id, error.message);
    }
    console.log(`[migrate] Migrated ${rows.length} players`);
  }

  // 2. Cohorts (self-referencing FK via score_source_cohort_id)
  if (oldCohorts.length) {
    // First pass: insert without score_source_cohort_id to avoid FK issues
    for (const c of oldCohorts) {
      const row = cohortToRow(c);
      const firstPass = { ...row, score_source_cohort_id: null };
      const { error } = await sb
        .from('cohorts')
        .upsert(firstPass, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[migrate] cohort insert failed:', row.id, error.message);
    }
    // Second pass: set score_source_cohort_id where needed
    for (const c of oldCohorts) {
      if (c.scoreSourceCohortId) {
        const { error } = await sb
          .from('cohorts')
          .update({ score_source_cohort_id: c.scoreSourceCohortId })
          .eq('id', c.id);
        if (error) console.error('[migrate] cohort FK update failed:', c.id, error.message);
      }
    }
    console.log(`[migrate] Migrated ${oldCohorts.length} cohorts`);
  }

  // 3. Brackets (FK to cohorts)
  if (oldBrackets.length) {
    const rows = oldBrackets.map(bracketToRow);
    for (const row of rows) {
      const { error } = await sb
        .from('brackets')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[migrate] bracket insert failed:', row.id, error.message);
    }
    console.log(`[migrate] Migrated ${rows.length} brackets`);
  }

  // 4. Games (FK to cohorts + players)
  if (oldGames.length) {
    const rows = oldGames.map(gameToRow);
    for (const row of rows) {
      const { error } = await sb
        .from('games')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[migrate] game insert failed:', row.id, error.message);
    }
    console.log(`[migrate] Migrated ${rows.length} games`);
  }

  // 5. Payouts (FK to cohorts + brackets)
  if (oldPayouts.length) {
    const rows = oldPayouts.map(payoutToRow);
    for (const row of rows) {
      const { error } = await sb
        .from('payouts')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[migrate] payout insert failed:', row.id, error.message);
    }
    console.log(`[migrate] Migrated ${rows.length} payouts`);
  }

  // 6. Player requests (no FKs)
  if (oldRequests.length) {
    const rows = oldRequests.map(playerRequestToRow);
    for (const row of rows) {
      const { error } = await sb
        .from('player_requests')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.error('[migrate] player_request insert failed:', row.id, error.message);
    }
    console.log(`[migrate] Migrated ${rows.length} player requests`);
  }

  console.log('[migrate] Migration complete.');
  return true;
}
