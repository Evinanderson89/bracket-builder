// ─── Enums & Constants ───────────────────────────────────────────────────────

export const CohortStatus = {
  NOT_DEPLOYED: 'not deployed',
  ACTIVE: 'active',
  COMPLETE: 'complete',
} as const;

export type CohortStatusValue = (typeof CohortStatus)[keyof typeof CohortStatus];

export const CohortType = {
  SCRATCH: 'Scratch',
  HANDICAP: 'Handicap',
} as const;

export type CohortTypeValue = (typeof CohortType)[keyof typeof CohortType];

export const PayoutAmounts = {
  FIRST_PLACE: 25,
  SECOND_PLACE: 10,
  OPERATOR_CUT: 5,
  ENTRY_FEE: 5,
} as const;

// ─── Data Models ─────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  average: number;
  handicap: number;
  numBrackets: number;
  email?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  player1: Player | null;
  player2: Player | null;
  winner: Player | null;
  completed: boolean;
}

export interface BracketStructure {
  rounds: Match[][];
  winner: Player | null;
  completed: boolean;
}

export interface Bracket {
  id: string;
  cohortId: string;
  bracketNumber: number;
  players: Player[];
  structure: BracketStructure;
  createdAt: string;
}

export interface Cohort {
  id: string;
  name: string;
  type: CohortTypeValue;
  status: CohortStatusValue;
  selectedUserIds: string[];
  userBracketCounts: Record<string, number>;
  createdAt: string;
}

export interface Game {
  id: string;
  cohortId: string;
  playerId: string;
  gameNumber: number;
  score: number;
  createdAt: string;
}

export interface Payout {
  id: string;
  cohortId: string;
  cohortName: string;
  playerId: string;
  playerName: string;
  amount: number;
  position: number; // 1 = first, 2 = second, 0 = operator
  date: string;
  bracketId: string;
  isOperator?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  accessToken: string | null;
  provider: 'google' | 'dev';
  emailVerified: boolean;
  isDev: boolean;
}

export interface PlayerRequest {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
}
