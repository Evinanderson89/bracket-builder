import { supabase } from '../supabaseClient';
import type { Cohort } from '../types';
import { cohortToRow, cohortFromRow } from './mappers';
import type { CohortRow } from './mappers';

export async function fetchAllCohorts(): Promise<Cohort[] | undefined> {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('cohorts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchAllCohorts failed:', error.message);
    return undefined;
  }

  return (data as CohortRow[]).map(cohortFromRow);
}

export async function insertCohort(cohort: Cohort): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('cohorts')
    .insert(cohortToRow(cohort));

  if (error) {
    console.error('insertCohort failed:', error.message);
  }
}

export async function updateCohort(id: string, updates: Partial<Cohort>): Promise<void> {
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.tournamentKind !== undefined) row.tournament_kind = updates.tournamentKind;
  if (updates.descriptionMode !== undefined) row.description_mode = updates.descriptionMode;
  if (updates.customDescription !== undefined) row.custom_description = updates.customDescription;
  if (updates.createdByAuthUserId !== undefined) row.created_by_auth_user_id = updates.createdByAuthUserId;
  if (updates.createdByAuthUserEmail !== undefined) row.created_by_auth_user_email = updates.createdByAuthUserEmail;
  if (updates.createdByName !== undefined) row.created_by_name = updates.createdByName;
  if (updates.scoreEntryUserIds !== undefined) row.score_entry_user_ids = updates.scoreEntryUserIds;
  if (updates.centers !== undefined) row.centers = updates.centers;
  if (updates.totalGames !== undefined) row.total_games = updates.totalGames;
  if (updates.bracketStartGame !== undefined) row.bracket_start_game = updates.bracketStartGame;
  if (updates.scoreSourceCohortId !== undefined) row.score_source_cohort_id = updates.scoreSourceCohortId;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.selectedUserIds !== undefined) row.selected_user_ids = updates.selectedUserIds;
  if (updates.userBracketCounts !== undefined) row.user_bracket_counts = updates.userBracketCounts;
  if (updates.pendingEntryRequests !== undefined) row.pending_entry_requests = updates.pendingEntryRequests;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from('cohorts')
    .update(row)
    .eq('id', id);

  if (error) {
    console.error('updateCohort failed:', error.message);
  }
}

export async function deleteCohort(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('cohorts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteCohort failed:', error.message);
  }
}
