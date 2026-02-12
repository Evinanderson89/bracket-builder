import { TournamentKind } from './types';
import type { Player, Match, BracketStructure, Bracket, Cohort } from './types';

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle (returns new array). */
export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Bracket creation ────────────────────────────────────────────────────────

interface TicketedUser extends Player {
  count: number;
}

/**
 * Distribute players into groups of 8 for brackets.
 * Each player can appear in up to `numBrackets` brackets but never twice in the same bracket.
 */
export function createBrackets(users: (Player & { bracketInstance?: number })[]): Player[][] {
  // Group by ID and count tickets
  const userMap = new Map<string, TicketedUser>();
  for (const u of users) {
    const existing = userMap.get(u.id);
    if (existing) {
      existing.count++;
    } else {
      userMap.set(u.id, { ...u, count: 1 });
    }
  }

  const uniqueUsers = Array.from(userMap.values());

  // Iteratively compute max possible full brackets
  let numBrackets = Math.floor(users.length / 8);
  for (let iter = 0; iter < 5 && numBrackets > 0; iter++) {
    let usable = 0;
    for (const u of uniqueUsers) usable += Math.min(u.count, numBrackets);
    const next = Math.floor(usable / 8);
    if (next === numBrackets) break;
    numBrackets = next;
  }
  if (numBrackets === 0) return [];

  // Sort heaviest-ticket users first for placement priority
  uniqueUsers.sort((a, b) => b.count - a.count);

  // Initialise empty brackets
  const brackets: { id: number; players: Player[] }[] = Array.from(
    { length: numBrackets },
    (_, i) => ({ id: i, players: [] }),
  );

  // Distribute users randomly across valid brackets
  for (const user of uniqueUsers) {
    const ticketsToPlace = Math.min(user.count, numBrackets);
    const valid = shuffleArray(
      brackets.filter(b => b.players.length < 8 && !b.players.some(p => p.id === user.id)),
    );
    const { count: _count, ...cleanUser } = user;
    for (let i = 0; i < Math.min(ticketsToPlace, valid.length); i++) {
      valid[i].players.push(cleanUser);
    }
  }

  // Shuffle within each bracket and return only full ones
  return brackets
    .filter(b => b.players.length === 8)
    .map(b => shuffleArray(b.players));
}

/**
 * Build 3-round single-elimination structure for 8 players.
 */
export function createBracketStructure(players: Player[]): BracketStructure {
  const shuffled = shuffleArray(players);

  // Round 1 — quarter-finals (4 matches)
  const round1: Match[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      round1.push({
        id: `r1_m${i / 2}`,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        winner: null,
        completed: false,
      });
    }
  }

  // Round 2 — semi-finals (2 matches)
  const round2: Match[] = Array.from({ length: 2 }, (_, i) => ({
    id: `r2_m${i}`,
    player1: null,
    player2: null,
    winner: null,
    completed: false,
  }));

  // Round 3 — final (1 match)
  const round3: Match[] = [
    { id: 'r3_m0', player1: null, player2: null, winner: null, completed: false },
  ];

  return { rounds: [round1, round2, round3], winner: null, completed: false };
}

// ─── Score helpers ───────────────────────────────────────────────────────────

export function calculateTotalScore(score: number, handicap: number, useHandicap: boolean): number {
  return useHandicap ? score + (handicap || 0) : score;
}

export function getBracketGameWindow(cohort: Pick<Cohort, 'totalGames' | 'bracketStartGame' | 'tournamentKind'>): {
  startGame: number;
  endGame: number;
} {
  const totalGames = Math.max(3, Math.floor(cohort.totalGames || 3));
  const maxStart = Math.max(1, totalGames - 2);
  const startGame = Math.min(Math.max(1, Math.floor(cohort.bracketStartGame || 1)), maxStart);

  if (cohort.tournamentKind === TournamentKind.SERIES) {
    return { startGame: 1, endGame: totalGames };
  }

  return { startGame, endGame: Math.min(totalGames, startGame + 2) };
}

export function getRoundGameNumber(
  cohort: Pick<Cohort, 'totalGames' | 'bracketStartGame' | 'tournamentKind'>,
  roundIndex: number,
): number {
  const { startGame } = getBracketGameWindow(cohort);
  return startGame + roundIndex;
}

// ─── Bracket advancement ─────────────────────────────────────────────────────

/**
 * Deep-clone a bracket's structure, mark the match as won, and place the winner
 * into the correct slot of the next round (or crown champion if final).
 */
export function advanceWinner(
  bracket: { structure: BracketStructure },
  roundIndex: number,
  matchIndex: number,
  winner: Player,
): { structure: BracketStructure } {
  const structure: BracketStructure = JSON.parse(JSON.stringify(bracket.structure));
  const { rounds } = structure;

  // Mark current match complete
  const match = rounds[roundIndex]?.[matchIndex];
  if (match) {
    match.completed = true;
    match.winner = winner;
  }

  // Place winner in next round or crown champion
  if (roundIndex < rounds.length - 1) {
    const nextMatchIdx = Math.floor(matchIndex / 2);
    if (!rounds[roundIndex + 1][nextMatchIdx]) {
      rounds[roundIndex + 1][nextMatchIdx] = {
        id: `r${roundIndex + 2}_m${nextMatchIdx}`,
        player1: null,
        player2: null,
        winner: null,
        completed: false,
      };
    }
    const next = rounds[roundIndex + 1][nextMatchIdx];
    if (matchIndex % 2 === 0) {
      next.player1 = winner;
    } else {
      next.player2 = winner;
    }
  } else {
    structure.winner = winner;
    structure.completed = true;
  }

  return { structure };
}

// ─── Query helpers ───────────────────────────────────────────────────────────

export function isBracketComplete(structure: BracketStructure): boolean {
  return structure.completed && structure.winner !== null;
}

/** Returns true if the player played a completed match and lost. */
export function isPlayerEliminated(structure: BracketStructure, playerId: string): boolean {
  for (const round of structure.rounds) {
    for (const match of round) {
      if (!match.completed) continue;
      const wasInMatch =
        match.player1?.id === playerId || match.player2?.id === playerId;
      if (wasInMatch && match.winner?.id !== playerId) return true;
    }
  }
  return false;
}

/** Player is still alive in at least one bracket within the cohort. */
export function isPlayerLiveInCohort(playerId: string, cohortBrackets: Bracket[]): boolean {
  const relevant = cohortBrackets.filter(b => b.players.some(p => p.id === playerId));
  if (relevant.length === 0) return true; // not placed yet → considered live
  return relevant.some(b => !isPlayerEliminated(b.structure, playerId));
}

/** Is a specific game number still relevant for this player? */
export function isScoreRelevant(
  playerId: string,
  gameNumber: number,
  brackets: Bracket[],
  startGame = 1,
  endGame = 3,
): boolean {
  if (gameNumber < startGame || gameNumber > endGame) return false;
  if (gameNumber === startGame) return true;

  const relevant = brackets.filter(b => b.players.some(p => p.id === playerId));
  if (relevant.length === 0) return false;

  return relevant.some(b => {
    const { rounds } = b.structure;
    // Check rounds before this counted game for an elimination
    for (let r = 0; r < gameNumber - startGame; r++) {
      const round = rounds[r];
      if (!round) continue;
      const match = round.find(
        m => m.player1?.id === playerId || m.player2?.id === playerId,
      );
      if (match?.completed && match.winner?.id !== playerId) return false;
    }
    return true;
  });
}
