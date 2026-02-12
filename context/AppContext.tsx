import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getUsers, saveUsers,
  getCohorts, saveCohorts,
  getBrackets, saveBrackets,
  getGames, saveGames,
  getPayouts, savePayouts,
  getDeletePassword, saveDeletePassword,
  getPlayerRequests, savePlayerRequests,
} from '../utils/storage';
import { createBrackets, createBracketStructure } from '../utils/bracketLogic';
import { CohortStatus, CohortType, PayoutAmounts, TournamentKind } from '../utils/types';
import type { Player, Cohort, Bracket, Game, Payout, AuthUser, PlayerRequest } from '../utils/types';

// ─── Context type ────────────────────────────────────────────────────────────

interface AppContextValue {
  users: Player[];
  cohorts: Cohort[];
  brackets: Bracket[];
  games: Game[];
  payouts: Payout[];
  playerRequests: PlayerRequest[];
  loading: boolean;

  addUser: (u: Omit<Player, 'id' | 'createdAt'>) => Promise<Player>;
  updateUser: (id: string, updates: Partial<Player>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  removeDuplicateUsers: () => Promise<number>;
  requestPlayerAccess: (authUser: AuthUser) => Promise<PlayerRequest>;
  approvePlayerRequest: (requestId: string) => Promise<void>;
  rejectPlayerRequest: (requestId: string) => Promise<void>;

  addCohort: (c: Pick<Cohort, 'name' | 'type' | 'tournamentKind' | 'totalGames' | 'bracketStartGame' | 'scoreSourceCohortId'>) => Promise<Cohort>;
  updateCohort: (id: string, updates: Partial<Cohort>) => Promise<void>;
  deleteCohort: (id: string) => Promise<void>;
  deployCohort: (id: string, selectedUsers: Player[], counts: Record<string, number>) => Promise<void>;

  updateBracket: (id: string, updates: Partial<Bracket>) => Promise<void>;
  getCohortBrackets: (cohortId: string) => Bracket[];

  saveGame: (g: Omit<Game, 'id' | 'createdAt'>) => Promise<void>;
  getPlayerGames: (cohortId: string, playerId: string) => Game[];

  getPlayerPayouts: (playerName: string, date: string | null) => Payout[];
  getOperatorPayouts: (date: string | null) => Payout[];

  deletePassword: string;
  verifyDeletePassword: (pw: string) => boolean;
  setDeletePasswordValue: (pw: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function normalizeCohort(raw: any): Cohort {
  const totalGames = Math.max(3, Math.floor(Number(raw?.totalGames) || 3));
  const maxBracketStart = Math.max(1, totalGames - 2);
  const bracketStartGame = Math.min(
    Math.max(1, Math.floor(Number(raw?.bracketStartGame) || 1)),
    maxBracketStart,
  );

  const type = raw?.type === CohortType.HANDICAP ? CohortType.HANDICAP : CohortType.SCRATCH;
  const tournamentKind = raw?.tournamentKind === TournamentKind.SERIES
    ? TournamentKind.SERIES
    : TournamentKind.BRACKETS;

  return {
    id: String(raw?.id ?? Date.now()),
    name: String(raw?.name ?? 'Tournament'),
    type,
    tournamentKind,
    totalGames,
    bracketStartGame: tournamentKind === TournamentKind.BRACKETS ? bracketStartGame : 1,
    scoreSourceCohortId: typeof raw?.scoreSourceCohortId === 'string' ? raw.scoreSourceCohortId : null,
    status: Object.values(CohortStatus).includes(raw?.status) ? raw.status : CohortStatus.NOT_DEPLOYED,
    selectedUserIds: Array.isArray(raw?.selectedUserIds) ? raw.selectedUserIds : [],
    userBracketCounts: raw?.userBracketCounts && typeof raw.userBracketCounts === 'object' ? raw.userBracketCounts : {},
    createdAt: raw?.createdAt || new Date().toISOString(),
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<Player[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [playerRequests, setPlayerRequests] = useState<PlayerRequest[]>([]);
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, c, b, g, p, pw, reqs] = await Promise.all([
          getUsers(), getCohorts(), getBrackets(), getGames(), getPayouts(), getDeletePassword(), getPlayerRequests(),
        ]);
        const normalizedCohorts = (c || []).map(normalizeCohort);
        setUsers(u);
        setCohorts(normalizedCohorts);
        setBrackets(b);
        setGames(g);
        setPayouts(p);
        setDeletePassword(pw);
        setPlayerRequests(reqs);

        if (JSON.stringify(c) !== JSON.stringify(normalizedCohorts)) {
          await saveCohorts(normalizedCohorts);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Users ───────────────────────────────────────────────────────────────

  const addUser = useCallback(async (user: Omit<Player, 'id' | 'createdAt'>): Promise<Player> => {
    const nameLower = user.name.trim().toLowerCase();
    if (users.find(u => u.name.trim().toLowerCase() === nameLower)) {
      throw new Error(`Player "${user.name}" already exists`);
    }
    const newUser: Player = { ...user, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const next = [...users, newUser];
    setUsers(next);
    await saveUsers(next);
    return newUser;
  }, [users]);

  const updateUser = useCallback(async (id: string, updates: Partial<Player>) => {
    const next = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    setUsers(next);
    await saveUsers(next);
  }, [users]);

  const deleteUser = useCallback(async (id: string) => {
    const next = users.filter(u => u.id !== id);
    setUsers(next);
    await saveUsers(next);
  }, [users]);

  const removeDuplicateUsers = useCallback(async (): Promise<number> => {
    const seen = new Set<string>();
    const unique: Player[] = [];
    let removed = 0;
    for (const u of users) {
      const key = u.name.trim().toLowerCase();
      if (seen.has(key)) { removed++; continue; }
      seen.add(key);
      unique.push(u);
    }
    if (removed > 0) { setUsers(unique); await saveUsers(unique); }
    return removed;
  }, [users]);

  const requestPlayerAccess = useCallback(async (authUser: AuthUser): Promise<PlayerRequest> => {
    if (!authUser.emailVerified) {
      throw new Error('Please verify your email with Google before requesting access.');
    }

    const emailLower = authUser.email.trim().toLowerCase();
    const nameLower = authUser.name.trim().toLowerCase();
    const existingPlayer = users.find(u =>
      (u.email && u.email.trim().toLowerCase() === emailLower) || u.name.trim().toLowerCase() === nameLower,
    );
    if (existingPlayer) {
      throw new Error('You already have a player profile.');
    }

    const existingPending = playerRequests.find(r => r.email.trim().toLowerCase() === emailLower && r.status === 'pending');
    if (existingPending) return existingPending;

    const nextReq: PlayerRequest = {
      id: `req_${Date.now()}`,
      email: authUser.email.trim(),
      name: authUser.name.trim(),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    const next = [nextReq, ...playerRequests];
    setPlayerRequests(next);
    await savePlayerRequests(next);
    return nextReq;
  }, [playerRequests, users]);

  const approvePlayerRequest = useCallback(async (requestId: string) => {
    const request = playerRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Request not found or already resolved.');
    }

    const emailLower = request.email.trim().toLowerCase();
    const nameLower = request.name.trim().toLowerCase();
    const existingPlayer = users.find(u =>
      (u.email && u.email.trim().toLowerCase() === emailLower) || u.name.trim().toLowerCase() === nameLower,
    );

    let nextUsers = users;
    if (!existingPlayer) {
      const newUser: Player = {
        id: Date.now().toString(),
        name: request.name,
        email: request.email,
        average: 200,
        handicap: 0,
        numBrackets: 1,
        createdAt: new Date().toISOString(),
      };
      nextUsers = [...users, newUser];
      setUsers(nextUsers);
      await saveUsers(nextUsers);
    }

    const now = new Date().toISOString();
    const nextRequests = playerRequests.map(r => (
      r.id === requestId ? { ...r, status: 'approved' as const, resolvedAt: now } : r
    ));
    setPlayerRequests(nextRequests);
    await savePlayerRequests(nextRequests);
  }, [playerRequests, users]);

  const rejectPlayerRequest = useCallback(async (requestId: string) => {
    const request = playerRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Request not found or already resolved.');
    }
    const now = new Date().toISOString();
    const nextRequests = playerRequests.map(r => (
      r.id === requestId ? { ...r, status: 'rejected' as const, resolvedAt: now } : r
    ));
    setPlayerRequests(nextRequests);
    await savePlayerRequests(nextRequests);
  }, [playerRequests]);

  // ─── Cohorts ─────────────────────────────────────────────────────────────

  const addCohort = useCallback(async (
    c: Pick<Cohort, 'name' | 'type' | 'tournamentKind' | 'totalGames' | 'bracketStartGame' | 'scoreSourceCohortId'>,
  ): Promise<Cohort> => {
    const totalGames = Math.max(3, Math.floor(c.totalGames || 3));
    const maxBracketStart = Math.max(1, totalGames - 2);
    const bracketStartGame = Math.min(Math.max(1, Math.floor(c.bracketStartGame || 1)), maxBracketStart);

    const cohort: Cohort = {
      id: Date.now().toString(),
      name: c.name,
      type: c.type,
      tournamentKind: c.tournamentKind,
      totalGames,
      bracketStartGame: c.tournamentKind === TournamentKind.BRACKETS ? bracketStartGame : 1,
      scoreSourceCohortId: c.scoreSourceCohortId || null,
      createdAt: new Date().toISOString(),
      status: CohortStatus.NOT_DEPLOYED,
      selectedUserIds: [],
      userBracketCounts: {},
    };
    const next = [...cohorts, cohort];
    setCohorts(next);
    await saveCohorts(next);
    return cohort;
  }, [cohorts]);

  const updateCohort = useCallback(async (id: string, updates: Partial<Cohort>) => {
    const next = cohorts.map(c => (c.id === id ? { ...c, ...updates } : c));
    setCohorts(next);
    await saveCohorts(next);
  }, [cohorts]);

  const deleteCohort = useCallback(async (id: string) => {
    const nextBrackets = brackets.filter(b => b.cohortId !== id);
    setBrackets(nextBrackets); await saveBrackets(nextBrackets);

    const nextGames = games.filter(g => g.cohortId !== id);
    setGames(nextGames); await saveGames(nextGames);

    const nextPayouts = payouts.filter(p => p.cohortId !== id);
    setPayouts(nextPayouts); await savePayouts(nextPayouts);

    const nextCohorts = cohorts.filter(c => c.id !== id);
    setCohorts(nextCohorts); await saveCohorts(nextCohorts);
  }, [brackets, games, payouts, cohorts]);

  const deployCohort = useCallback(async (
    cohortId: string,
    selectedUsers: Player[],
    counts: Record<string, number>,
  ) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) throw new Error('Tournament not found');

    if (!selectedUsers.length) throw new Error('No users selected for deployment');

    if (cohort.tournamentKind === TournamentKind.SERIES) {
      const nextCohorts = cohorts.map(c =>
        c.id === cohortId
          ? {
              ...c,
              status: CohortStatus.ACTIVE as typeof CohortStatus.ACTIVE,
              selectedUserIds: selectedUsers.map(u => u.id),
              userBracketCounts: counts,
            }
          : c,
      );
      setCohorts(nextCohorts);
      await saveCohorts(nextCohorts);
      return;
    }

    // Expand users by their bracket counts
    const expanded: (Player & { bracketInstance: number })[] = [];
    for (const user of selectedUsers) {
      const n = counts[user.id] || user.numBrackets || 1;
      for (let i = 0; i < n; i++) expanded.push({ ...user, bracketInstance: i });
    }

    if (Math.floor(expanded.length / 8) < 1) {
      throw new Error('Need at least 8 player slots to create a bracket');
    }

    const groups = createBrackets(expanded);
    const newBrackets: Bracket[] = groups.map((group, idx) => ({
      id: `${cohortId}_bracket_${idx}`,
      cohortId,
      bracketNumber: idx + 1,
      players: group,
      structure: createBracketStructure(group),
      createdAt: new Date().toISOString(),
    }));

    const nextBrackets = [...brackets, ...newBrackets];
    setBrackets(nextBrackets);
    await saveBrackets(nextBrackets);

    const nextCohorts = cohorts.map(c =>
      c.id === cohortId
        ? { ...c, status: CohortStatus.ACTIVE as typeof CohortStatus.ACTIVE, selectedUserIds: selectedUsers.map(u => u.id), userBracketCounts: counts }
        : c,
    );
    setCohorts(nextCohorts);
    await saveCohorts(nextCohorts);
  }, [brackets, cohorts]);

  // ─── Brackets ────────────────────────────────────────────────────────────

  const createPayoutsForBracket = useCallback(async (bracket: Bracket, allBrackets: Bracket[]) => {
    const cohort = cohorts.find(c => c.id === bracket.cohortId);
    if (!cohort) return;
    if (cohort.tournamentKind !== TournamentKind.BRACKETS) return;

    // Skip if payouts already exist for this bracket
    if (payouts.some(p => p.bracketId === bracket.id)) return;

    const finalRound = bracket.structure.rounds[bracket.structure.rounds.length - 1];
    const finalMatch = finalRound[0];
    const secondPlace = finalMatch.player1?.id === bracket.structure.winner?.id
      ? finalMatch.player2
      : finalMatch.player1;
    const date = new Date().toISOString().split('T')[0];

    const newPayouts: Payout[] = [
      {
        id: `${bracket.id}_first`, cohortId: bracket.cohortId, cohortName: cohort.name,
        playerId: bracket.structure.winner!.id, playerName: bracket.structure.winner!.name,
        amount: PayoutAmounts.FIRST_PLACE, position: 1, date, bracketId: bracket.id,
      },
      {
        id: `${bracket.id}_second`, cohortId: bracket.cohortId, cohortName: cohort.name,
        playerId: secondPlace?.id ?? '', playerName: secondPlace?.name ?? '',
        amount: PayoutAmounts.SECOND_PLACE, position: 2, date, bracketId: bracket.id,
      },
      {
        id: `${bracket.id}_operator`, cohortId: bracket.cohortId, cohortName: cohort.name,
        playerId: 'operator', playerName: 'Operator',
        amount: PayoutAmounts.OPERATOR_CUT, position: 0, date, bracketId: bracket.id, isOperator: true,
      },
    ];

    const nextPayouts = [...payouts, ...newPayouts];
    setPayouts(nextPayouts);
    await savePayouts(nextPayouts);

    // Check if all brackets in cohort complete → mark cohort complete
    const cohortBrackets = allBrackets.filter(b => b.cohortId === bracket.cohortId);
    if (cohortBrackets.every(b => b.structure.completed)) {
      if (cohort.status !== CohortStatus.COMPLETE) {
        const nextCohorts = cohorts.map(c =>
          c.id === bracket.cohortId ? { ...c, status: CohortStatus.COMPLETE as typeof CohortStatus.COMPLETE } : c,
        );
        setCohorts(nextCohorts);
        await saveCohorts(nextCohorts);
      }
    }
  }, [cohorts, payouts]);

  const updateBracket = useCallback(async (id: string, updates: Partial<Bracket>) => {
    const next = brackets.map(b => (b.id === id ? { ...b, ...updates } : b));
    setBrackets(next);
    await saveBrackets(next);

    const bracket = next.find(b => b.id === id);
    if (bracket?.structure.completed && bracket.structure.winner) {
      await createPayoutsForBracket(bracket, next);
    }
  }, [brackets, createPayoutsForBracket]);

  const getCohortBrackets = useCallback((cohortId: string) => {
    return brackets.filter(b => b.cohortId === cohortId);
  }, [brackets]);

  // ─── Games ───────────────────────────────────────────────────────────────

  const saveGameFn = useCallback(async (game: Omit<Game, 'id' | 'createdAt'>) => {
    const idx = games.findIndex(
      g => g.cohortId === game.cohortId && g.playerId === game.playerId && g.gameNumber === game.gameNumber,
    );
    let next: Game[];
    if (idx >= 0) {
      next = games.map((g, i) => (i === idx ? { ...g, ...game } : g));
    } else {
      next = [...games, { ...game, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    }
    setGames(next);
    await saveGames(next);
  }, [games]);

  const getPlayerGames = useCallback((cohortId: string, playerId: string) => {
    return games
      .filter(g => g.cohortId === cohortId && g.playerId === playerId)
      .sort((a, b) => a.gameNumber - b.gameNumber);
  }, [games]);

  // ─── Payouts ─────────────────────────────────────────────────────────────

  const getPlayerPayouts = useCallback((playerName: string, date: string | null) => {
    return payouts.filter(p => {
      if (p.isOperator) return false;
      if (!p.playerName.toLowerCase().includes(playerName.toLowerCase())) return false;
      if (date && p.date !== date) return false;
      return true;
    });
  }, [payouts]);

  const getOperatorPayouts = useCallback((date: string | null) => {
    return payouts.filter(p => p.isOperator && (!date || p.date === date));
  }, [payouts]);

  // ─── Delete password ────────────────────────────────────────────────────

  const verifyDeletePassword = useCallback((pw: string) => pw === deletePassword, [deletePassword]);

  const setDeletePasswordValue = useCallback(async (pw: string) => {
    setDeletePassword(pw);
    await saveDeletePassword(pw);
  }, []);

  // ─── Value ───────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    users, cohorts, brackets, games, payouts, playerRequests, loading,
    addUser, updateUser, deleteUser, removeDuplicateUsers, requestPlayerAccess, approvePlayerRequest, rejectPlayerRequest,
    addCohort, updateCohort, deleteCohort, deployCohort,
    updateBracket, getCohortBrackets,
    saveGame: saveGameFn, getPlayerGames,
    getPlayerPayouts, getOperatorPayouts,
    deletePassword, verifyDeletePassword, setDeletePasswordValue,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
