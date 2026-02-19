import type { Player, Cohort, Bracket, Game, Payout, PlayerRequest } from '../types';

// ─── Row types (snake_case, matching Supabase columns) ─────────────────────

export interface PlayerRow {
  id: string;
  name: string;
  email: string | null;
  average: number;
  handicap: number;
  num_brackets: number;
  aliases: string[];
  created_at: string;
}

export interface CohortRow {
  id: string;
  name: string;
  type: string;
  tournament_kind: string;
  description_mode: string;
  custom_description: string;
  created_by_auth_user_id: string | null;
  created_by_auth_user_email: string | null;
  created_by_name: string | null;
  score_entry_user_ids: string[];
  centers: unknown[];
  total_games: number;
  bracket_start_game: number;
  score_source_cohort_id: string | null;
  status: string;
  selected_user_ids: string[];
  user_bracket_counts: Record<string, number>;
  pending_entry_requests: unknown[];
  created_at: string;
}

export interface BracketRow {
  id: string;
  cohort_id: string;
  bracket_number: number;
  players: unknown[];
  structure: unknown;
  created_at: string;
}

export interface GameRow {
  id: string;
  cohort_id: string;
  player_id: string;
  game_number: number;
  score: number;
  created_at: string;
}

export interface PayoutRow {
  id: string;
  cohort_id: string;
  cohort_name: string;
  player_id: string;
  player_name: string;
  amount: number;
  position: number;
  date: string;
  bracket_id: string;
  is_operator: boolean | null;
  created_at: string;
}

export interface PlayerRequestRow {
  id: string;
  email: string;
  name: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
}

// ─── Player mappers ─────────────────────────────────────────────────────────

export function playerToRow(p: Player): PlayerRow {
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? null,
    average: p.average,
    handicap: p.handicap,
    num_brackets: p.numBrackets,
    aliases: p.aliases ?? [],
    created_at: p.createdAt,
  };
}

export function playerFromRow(r: PlayerRow): Player {
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    average: r.average,
    handicap: r.handicap,
    numBrackets: r.num_brackets,
    aliases: r.aliases?.length ? r.aliases : undefined,
    createdAt: r.created_at,
  };
}

// ─── Cohort mappers ─────────────────────────────────────────────────────────

export function cohortToRow(c: Cohort): CohortRow {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    tournament_kind: c.tournamentKind,
    description_mode: c.descriptionMode,
    custom_description: c.customDescription,
    created_by_auth_user_id: c.createdByAuthUserId,
    created_by_auth_user_email: c.createdByAuthUserEmail,
    created_by_name: c.createdByName,
    score_entry_user_ids: c.scoreEntryUserIds,
    centers: c.centers,
    total_games: c.totalGames,
    bracket_start_game: c.bracketStartGame,
    score_source_cohort_id: c.scoreSourceCohortId,
    status: c.status,
    selected_user_ids: c.selectedUserIds,
    user_bracket_counts: c.userBracketCounts,
    pending_entry_requests: c.pendingEntryRequests,
    created_at: c.createdAt,
  };
}

export function cohortFromRow(r: CohortRow): Cohort {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Cohort['type'],
    tournamentKind: r.tournament_kind as Cohort['tournamentKind'],
    descriptionMode: r.description_mode as Cohort['descriptionMode'],
    customDescription: r.custom_description,
    createdByAuthUserId: r.created_by_auth_user_id,
    createdByAuthUserEmail: r.created_by_auth_user_email,
    createdByName: r.created_by_name,
    scoreEntryUserIds: r.score_entry_user_ids ?? [],
    centers: (r.centers ?? []) as Cohort['centers'],
    totalGames: r.total_games,
    bracketStartGame: r.bracket_start_game,
    scoreSourceCohortId: r.score_source_cohort_id,
    status: r.status as Cohort['status'],
    selectedUserIds: r.selected_user_ids ?? [],
    userBracketCounts: (r.user_bracket_counts ?? {}) as Record<string, number>,
    pendingEntryRequests: (r.pending_entry_requests ?? []) as Cohort['pendingEntryRequests'],
    createdAt: r.created_at,
  };
}

// ─── Bracket mappers ────────────────────────────────────────────────────────

export function bracketToRow(b: Bracket): BracketRow {
  return {
    id: b.id,
    cohort_id: b.cohortId,
    bracket_number: b.bracketNumber,
    players: b.players,
    structure: b.structure,
    created_at: b.createdAt,
  };
}

export function bracketFromRow(r: BracketRow): Bracket {
  return {
    id: r.id,
    cohortId: r.cohort_id,
    bracketNumber: r.bracket_number,
    players: r.players as Bracket['players'],
    structure: r.structure as Bracket['structure'],
    createdAt: r.created_at,
  };
}

// ─── Game mappers ───────────────────────────────────────────────────────────

export function gameToRow(g: Game): GameRow {
  return {
    id: g.id,
    cohort_id: g.cohortId,
    player_id: g.playerId,
    game_number: g.gameNumber,
    score: g.score,
    created_at: g.createdAt,
  };
}

export function gameFromRow(r: GameRow): Game {
  return {
    id: r.id,
    cohortId: r.cohort_id,
    playerId: r.player_id,
    gameNumber: r.game_number,
    score: r.score,
    createdAt: r.created_at,
  };
}

// ─── Payout mappers ─────────────────────────────────────────────────────────

export function payoutToRow(p: Payout): PayoutRow {
  return {
    id: p.id,
    cohort_id: p.cohortId,
    cohort_name: p.cohortName,
    player_id: p.playerId,
    player_name: p.playerName,
    amount: p.amount,
    position: p.position,
    date: p.date,
    bracket_id: p.bracketId,
    is_operator: p.isOperator ?? null,
    created_at: new Date().toISOString(),
  };
}

export function payoutFromRow(r: PayoutRow): Payout {
  return {
    id: r.id,
    cohortId: r.cohort_id,
    cohortName: r.cohort_name,
    playerId: r.player_id,
    playerName: r.player_name,
    amount: r.amount,
    position: r.position,
    date: r.date,
    bracketId: r.bracket_id,
    isOperator: r.is_operator ?? undefined,
  };
}

// ─── PlayerRequest mappers ──────────────────────────────────────────────────

export function playerRequestToRow(pr: PlayerRequest): PlayerRequestRow {
  return {
    id: pr.id,
    email: pr.email,
    name: pr.name,
    status: pr.status,
    requested_at: pr.requestedAt,
    resolved_at: pr.resolvedAt ?? null,
  };
}

export function playerRequestFromRow(r: PlayerRequestRow): PlayerRequest {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    status: r.status as PlayerRequest['status'],
    requestedAt: r.requested_at,
    resolvedAt: r.resolved_at ?? undefined,
  };
}
