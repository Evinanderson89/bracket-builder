import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getDeletePassword, saveDeletePassword,
  loadCachedJSON, saveCacheJSON, CACHE_KEYS,
} from '../utils/storage';
import * as db from '../utils/db';
import { createBrackets, createBracketStructure } from '../utils/bracketLogic';
import { CohortStatus, CohortType, PayoutAmounts, TournamentDescriptionMode, TournamentKind } from '../utils/types';
import type { Player, Cohort, Bracket, Game, Payout, AuthUser, PlayerRequest, PendingEntryRequest, BowlingCenter } from '../utils/types';

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
  ensurePlayerForAuthUser: (authUser: AuthUser) => Promise<Player>;
  requestPlayerAccess: (authUser: AuthUser) => Promise<PlayerRequest>;
  approvePlayerRequest: (requestId: string) => Promise<void>;
  rejectPlayerRequest: (requestId: string) => Promise<void>;

  addCohort: (
    c: Pick<
      Cohort,
      'name'
      | 'type'
      | 'tournamentKind'
      | 'descriptionMode'
      | 'customDescription'
      | 'createdByAuthUserId'
      | 'createdByAuthUserEmail'
      | 'createdByName'
      | 'totalGames'
      | 'bracketStartGame'
      | 'scoreSourceCohortId'
      | 'centers'
    >
  ) => Promise<Cohort>;
  updateCohort: (id: string, updates: Partial<Cohort>) => Promise<void>;
  deleteCohort: (id: string) => Promise<void>;
  deployCohort: (id: string, selectedUsers: Player[], counts: Record<string, number>) => Promise<void>;
  queueTournamentEntry: (cohortId: string, player: Pick<Player, 'id' | 'name'>, bracketCount: number) => Promise<void>;
  markTournamentEntryPaid: (cohortId: string, playerId: string) => Promise<void>;
  removeTournamentEntryRequest: (cohortId: string, playerId: string) => Promise<void>;

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
  const descriptionMode = raw?.descriptionMode === TournamentDescriptionMode.CUSTOM
    ? TournamentDescriptionMode.CUSTOM
    : TournamentDescriptionMode.STOCK;

  const pendingEntryRequests: PendingEntryRequest[] = Array.isArray(raw?.pendingEntryRequests)
    ? raw.pendingEntryRequests
      .map((req: any) => ({
        playerId: String(req?.playerId || ''),
        playerName: String(req?.playerName || ''),
        bracketCount: Math.max(1, Math.floor(Number(req?.bracketCount) || 1)),
        requestedAt: req?.requestedAt || new Date().toISOString(),
      }))
      .filter((req: PendingEntryRequest) => req.playerId)
    : [];
  const scoreEntryUserIds: string[] = Array.isArray(raw?.scoreEntryUserIds)
    ? Array.from(new Set(raw.scoreEntryUserIds.map((id: any) => String(id)).filter(Boolean)))
    : [];
  const centers: BowlingCenter[] = Array.isArray(raw?.centers)
    ? raw.centers
      .map((center: any) => ({
        id: String(center?.id || ''),
        name: String(center?.name || '').trim(),
        address: center?.address ? String(center.address) : undefined,
        city: center?.city ? String(center.city) : undefined,
        state: center?.state ? String(center.state) : undefined,
        postalCode: center?.postalCode ? String(center.postalCode) : undefined,
        latitude: Number.isFinite(Number(center?.latitude)) ? Number(center.latitude) : undefined,
        longitude: Number.isFinite(Number(center?.longitude)) ? Number(center.longitude) : undefined,
      }))
      .filter((center: BowlingCenter) => center.id && center.name)
    : [];

  return {
    id: String(raw?.id ?? Date.now()),
    name: String(raw?.name ?? 'Tournament'),
    type,
    tournamentKind,
    descriptionMode,
    customDescription: typeof raw?.customDescription === 'string' ? raw.customDescription : '',
    createdByAuthUserId: raw?.createdByAuthUserId ? String(raw.createdByAuthUserId) : null,
    createdByAuthUserEmail: raw?.createdByAuthUserEmail ? String(raw.createdByAuthUserEmail) : null,
    createdByName: raw?.createdByName ? String(raw.createdByName) : null,
    scoreEntryUserIds,
    centers,
    totalGames,
    bracketStartGame: tournamentKind === TournamentKind.BRACKETS ? bracketStartGame : 1,
    scoreSourceCohortId: typeof raw?.scoreSourceCohortId === 'string' ? raw.scoreSourceCohortId : null,
    status: Object.values(CohortStatus).includes(raw?.status) ? raw.status : CohortStatus.NOT_DEPLOYED,
    selectedUserIds: Array.isArray(raw?.selectedUserIds) ? raw.selectedUserIds : [],
    userBracketCounts: raw?.userBracketCounts && typeof raw.userBracketCounts === 'object' ? raw.userBracketCounts : {},
    pendingEntryRequests,
    createdAt: raw?.createdAt || new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Load from cloud, update local cache; fall back to local cache on failure. */
async function loadWithFallback<T>(
  fetchFn: () => Promise<T[] | undefined>,
  cacheKey: string,
  fallback: T[],
): Promise<T[]> {
  try {
    const cloud = await fetchFn();
    if (cloud !== undefined) {
      await saveCacheJSON(cacheKey, cloud);
      return cloud;
    }
  } catch {
    // fall through to local cache
  }
  return loadCachedJSON<T[]>(cacheKey, fallback);
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
        // One-time migration from old app_state KV → relational tables
        await db.migrateFromKvToRelational();

        // Seed test players (idempotent — uses ON CONFLICT DO NOTHING)
        await db.seedTestPlayers();

        const [u, c, b, g, p, pw, reqs] = await Promise.all([
          loadWithFallback(db.fetchAllPlayers, CACHE_KEYS.USERS, []),
          loadWithFallback(db.fetchAllCohorts, CACHE_KEYS.COHORTS, []),
          loadWithFallback(db.fetchAllBrackets, CACHE_KEYS.BRACKETS, []),
          loadWithFallback(db.fetchAllGames, CACHE_KEYS.GAMES, []),
          loadWithFallback(db.fetchAllPayouts, CACHE_KEYS.PAYOUTS, []),
          getDeletePassword(),
          loadWithFallback(db.fetchAllPlayerRequests, CACHE_KEYS.PLAYER_REQUESTS, []),
        ]);
        const normalizedCohorts = (c || []).map(normalizeCohort);
        setUsers(u);
        setCohorts(normalizedCohorts);
        setBrackets(b);
        setGames(g);
        setPayouts(p);
        setDeletePassword(pw);
        setPlayerRequests(reqs);
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
    if (users.find(u =>
      u.name.trim().toLowerCase() === nameLower ||
      u.aliases?.some(a => a.trim().toLowerCase() === nameLower)
    )) {
      throw new Error(`Player "${user.name}" already exists`);
    }
    const newUser: Player = { ...user, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const next = [...users, newUser];
    setUsers(next);
    await db.insertPlayer(newUser);
    await saveCacheJSON(CACHE_KEYS.USERS, next);
    return newUser;
  }, [users]);

  const updateUser = useCallback(async (id: string, updates: Partial<Player>) => {
    const next = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    setUsers(next);
    await db.updatePlayer(id, updates);
    await saveCacheJSON(CACHE_KEYS.USERS, next);
  }, [users]);

  const deleteUser = useCallback(async (id: string) => {
    const next = users.filter(u => u.id !== id);
    setUsers(next);
    await db.deletePlayer(id);
    await saveCacheJSON(CACHE_KEYS.USERS, next);

    const nextCohorts = cohorts.map(c => {
      const nextScoreUsers = (c.scoreEntryUserIds || []).filter(uid => uid !== id);
      if (nextScoreUsers.length === (c.scoreEntryUserIds || []).length) return c;
      return { ...c, scoreEntryUserIds: nextScoreUsers };
    });
    setCohorts(nextCohorts);
    for (const c of nextCohorts) {
      const original = cohorts.find(oc => oc.id === c.id);
      if (original && original.scoreEntryUserIds.length !== c.scoreEntryUserIds.length) {
        await db.updateCohort(c.id, { scoreEntryUserIds: c.scoreEntryUserIds });
      }
    }
    await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
  }, [users, cohorts]);

  const removeDuplicateUsers = useCallback(async (): Promise<number> => {
    const seen = new Set<string>();
    const unique: Player[] = [];
    const toDelete: string[] = [];
    let removed = 0;
    for (const u of users) {
      const key = u.name.trim().toLowerCase();
      if (seen.has(key)) { removed++; toDelete.push(u.id); continue; }
      seen.add(key);
      unique.push(u);
    }
    if (removed > 0) {
      setUsers(unique);
      for (const id of toDelete) {
        await db.deletePlayer(id);
      }
      await saveCacheJSON(CACHE_KEYS.USERS, unique);
    }
    return removed;
  }, [users]);

  const ensurePlayerForAuthUser = useCallback(async (authUser: AuthUser): Promise<Player> => {
    const emailLower = authUser.email.trim().toLowerCase();
    const nameLower = authUser.name.trim().toLowerCase();

    const existing = users.find(u =>
      (u.email && u.email.trim().toLowerCase() === emailLower) ||
      u.name.trim().toLowerCase() === nameLower
    );

    if (existing) {
      if (!existing.email && authUser.email) {
        await updateUser(existing.id, { email: authUser.email.trim() });
      }
      return existing;
    }

    return addUser({
      name: authUser.name.trim(),
      email: authUser.email.trim(),
      average: 200,
      handicap: 0,
      numBrackets: 1,
    });
  }, [users, addUser, updateUser]);

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
    await db.insertPlayerRequest(nextReq);
    await saveCacheJSON(CACHE_KEYS.PLAYER_REQUESTS, next);
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
      await db.insertPlayer(newUser);
      await saveCacheJSON(CACHE_KEYS.USERS, nextUsers);
    }

    const now = new Date().toISOString();
    const nextRequests = playerRequests.map(r => (
      r.id === requestId ? { ...r, status: 'approved' as const, resolvedAt: now } : r
    ));
    setPlayerRequests(nextRequests);
    await db.updatePlayerRequest(requestId, { status: 'approved', resolvedAt: now });
    await saveCacheJSON(CACHE_KEYS.PLAYER_REQUESTS, nextRequests);
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
    await db.updatePlayerRequest(requestId, { status: 'rejected', resolvedAt: now });
    await saveCacheJSON(CACHE_KEYS.PLAYER_REQUESTS, nextRequests);
  }, [playerRequests]);

  // ─── Cohorts ─────────────────────────────────────────────────────────────

  const addCohort = useCallback(async (
    c: Pick<
      Cohort,
      'name'
      | 'type'
      | 'tournamentKind'
      | 'descriptionMode'
      | 'customDescription'
      | 'createdByAuthUserId'
      | 'createdByAuthUserEmail'
      | 'createdByName'
      | 'totalGames'
      | 'bracketStartGame'
      | 'scoreSourceCohortId'
      | 'centers'
    >,
  ): Promise<Cohort> => {
    const totalGames = Math.max(3, Math.floor(c.totalGames || 3));
    const maxBracketStart = Math.max(1, totalGames - 2);
    const bracketStartGame = Math.min(Math.max(1, Math.floor(c.bracketStartGame || 1)), maxBracketStart);

    const cohort: Cohort = {
      id: Date.now().toString(),
      name: c.name,
      type: c.type,
      tournamentKind: c.tournamentKind,
      descriptionMode: c.descriptionMode || TournamentDescriptionMode.STOCK,
      customDescription: c.customDescription || '',
      createdByAuthUserId: c.createdByAuthUserId || null,
      createdByAuthUserEmail: c.createdByAuthUserEmail || null,
      createdByName: c.createdByName || null,
      scoreEntryUserIds: [],
      centers: Array.isArray(c.centers)
        ? c.centers
          .map(center => ({
            id: String(center?.id || ''),
            name: String(center?.name || '').trim(),
            address: center?.address ? String(center.address) : undefined,
            city: center?.city ? String(center.city) : undefined,
            state: center?.state ? String(center.state) : undefined,
            postalCode: center?.postalCode ? String(center.postalCode) : undefined,
            latitude: Number.isFinite(Number(center?.latitude)) ? Number(center.latitude) : undefined,
            longitude: Number.isFinite(Number(center?.longitude)) ? Number(center.longitude) : undefined,
          }))
          .filter(center => center.id && center.name)
        : [],
      totalGames,
      bracketStartGame: c.tournamentKind === TournamentKind.BRACKETS ? bracketStartGame : 1,
      scoreSourceCohortId: c.scoreSourceCohortId || null,
      createdAt: new Date().toISOString(),
      status: CohortStatus.NOT_DEPLOYED,
      selectedUserIds: [],
      userBracketCounts: {},
      pendingEntryRequests: [],
    };
    const next = [...cohorts, cohort];
    setCohorts(next);
    await db.insertCohort(cohort);
    await saveCacheJSON(CACHE_KEYS.COHORTS, next);
    return cohort;
  }, [cohorts]);

  const updateCohort = useCallback(async (id: string, updates: Partial<Cohort>) => {
    const next = cohorts.map(c => (c.id === id ? { ...c, ...updates } : c));
    setCohorts(next);
    await db.updateCohort(id, updates);
    await saveCacheJSON(CACHE_KEYS.COHORTS, next);
  }, [cohorts]);

  const deleteCohort = useCallback(async (id: string) => {
    const target = cohorts.find(c => c.id === id);
    if (!target) throw new Error('Tournament not found');
    if (target.status !== CohortStatus.NOT_DEPLOYED) {
      throw new Error('Only draft tournaments can be deleted.');
    }

    // CASCADE in DB handles brackets, games, payouts automatically
    await db.deleteCohort(id);

    const nextBrackets = brackets.filter(b => b.cohortId !== id);
    setBrackets(nextBrackets);
    await saveCacheJSON(CACHE_KEYS.BRACKETS, nextBrackets);

    const nextGames = games.filter(g => g.cohortId !== id);
    setGames(nextGames);
    await saveCacheJSON(CACHE_KEYS.GAMES, nextGames);

    const nextPayouts = payouts.filter(p => p.cohortId !== id);
    setPayouts(nextPayouts);
    await saveCacheJSON(CACHE_KEYS.PAYOUTS, nextPayouts);

    const nextCohorts = cohorts
      .filter(c => c.id !== id)
      .map(c => (c.scoreSourceCohortId === id ? { ...c, scoreSourceCohortId: null } : c));
    setCohorts(nextCohorts);
    // score_source_cohort_id ON DELETE SET NULL handles this in DB,
    // but update local state for cohorts referencing the deleted one
    await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
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
      const updates: Partial<Cohort> = {
        status: CohortStatus.ACTIVE as typeof CohortStatus.ACTIVE,
        selectedUserIds: selectedUsers.map(u => u.id),
        userBracketCounts: counts,
      };
      const nextCohorts = cohorts.map(c =>
        c.id === cohortId ? { ...c, ...updates } : c,
      );
      setCohorts(nextCohorts);
      await db.updateCohort(cohortId, updates);
      await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
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
    await db.insertBrackets(newBrackets);
    await saveCacheJSON(CACHE_KEYS.BRACKETS, nextBrackets);

    const cohortUpdates: Partial<Cohort> = {
      status: CohortStatus.ACTIVE as typeof CohortStatus.ACTIVE,
      selectedUserIds: selectedUsers.map(u => u.id),
      userBracketCounts: counts,
    };
    const nextCohorts = cohorts.map(c =>
      c.id === cohortId ? { ...c, ...cohortUpdates } : c,
    );
    setCohorts(nextCohorts);
    await db.updateCohort(cohortId, cohortUpdates);
    await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
  }, [brackets, cohorts]);

  const queueTournamentEntry = useCallback(async (
    cohortId: string,
    player: Pick<Player, 'id' | 'name'>,
    bracketCount: number,
  ) => {
    if (!player?.id) throw new Error('Player required');
    if (bracketCount < 1) throw new Error('Bracket count must be at least 1');

    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) throw new Error('Tournament not found');
    if (cohort.status !== CohortStatus.NOT_DEPLOYED) {
      throw new Error('Tournament is not accepting new requests.');
    }

    const nextRequest: PendingEntryRequest = {
      playerId: player.id,
      playerName: player.name,
      bracketCount,
      requestedAt: new Date().toISOString(),
    };

    const pending = cohort.pendingEntryRequests || [];
    const existing = pending.find(req => req.playerId === player.id);
    const nextRequestCount = (existing?.bracketCount || 0) + bracketCount;
    const mergedRequest: PendingEntryRequest = {
      ...nextRequest,
      bracketCount: nextRequestCount,
    };
    const nextPending = existing
      ? pending.map(req => (req.playerId === player.id ? mergedRequest : req))
      : [mergedRequest, ...pending];

    const nextCohorts = cohorts.map(c => (c.id === cohortId ? { ...c, pendingEntryRequests: nextPending } : c));
    setCohorts(nextCohorts);
    await db.updateCohort(cohortId, { pendingEntryRequests: nextPending });
    await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
  }, [cohorts]);

  const markTournamentEntryPaid = useCallback(async (cohortId: string, playerId: string) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) throw new Error('Tournament not found');

    const pending = cohort.pendingEntryRequests || [];
    const request = pending.find(req => req.playerId === playerId);
    if (!request) throw new Error('Pending request not found');

    const nextPending = pending.filter(req => req.playerId !== playerId);
    const nextSelected = cohort.selectedUserIds.includes(playerId)
      ? cohort.selectedUserIds
      : [...cohort.selectedUserIds, playerId];
    const existingPaidCount = cohort.userBracketCounts?.[playerId] || 0;
    const nextCounts = { ...cohort.userBracketCounts, [playerId]: existingPaidCount + request.bracketCount };

    const updates: Partial<Cohort> = {
      pendingEntryRequests: nextPending,
      selectedUserIds: nextSelected,
      userBracketCounts: nextCounts,
    };
    const nextCohorts = cohorts.map(c => (
      c.id === cohortId ? { ...c, ...updates } : c
    ));
    setCohorts(nextCohorts);
    await db.updateCohort(cohortId, updates);
    await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
  }, [cohorts]);

  const removeTournamentEntryRequest = useCallback(async (cohortId: string, playerId: string) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) throw new Error('Tournament not found');

    const nextPending = (cohort.pendingEntryRequests || []).filter(req => req.playerId !== playerId);
    const nextCohorts = cohorts.map(c => (c.id === cohortId ? { ...c, pendingEntryRequests: nextPending } : c));
    setCohorts(nextCohorts);
    await db.updateCohort(cohortId, { pendingEntryRequests: nextPending });
    await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
  }, [cohorts]);

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
    await db.insertPayouts(newPayouts);
    await saveCacheJSON(CACHE_KEYS.PAYOUTS, nextPayouts);

    // Check if all brackets in cohort complete → mark cohort complete
    const cohortBrackets = allBrackets.filter(b => b.cohortId === bracket.cohortId);
    if (cohortBrackets.every(b => b.structure.completed)) {
      if (cohort.status !== CohortStatus.COMPLETE) {
        const statusUpdate = { status: CohortStatus.COMPLETE as typeof CohortStatus.COMPLETE };
        const nextCohorts = cohorts.map(c =>
          c.id === bracket.cohortId ? { ...c, ...statusUpdate } : c,
        );
        setCohorts(nextCohorts);
        await db.updateCohort(bracket.cohortId, statusUpdate);
        await saveCacheJSON(CACHE_KEYS.COHORTS, nextCohorts);
      }
    }
  }, [cohorts, payouts]);

  const updateBracket = useCallback(async (id: string, updates: Partial<Bracket>) => {
    const next = brackets.map(b => (b.id === id ? { ...b, ...updates } : b));
    setBrackets(next);
    await db.updateBracket(id, updates);
    await saveCacheJSON(CACHE_KEYS.BRACKETS, next);

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
    let gameToSave: Game;
    if (idx >= 0) {
      gameToSave = { ...games[idx], ...game };
      next = games.map((g, i) => (i === idx ? gameToSave : g));
    } else {
      gameToSave = { ...game, id: Date.now().toString(), createdAt: new Date().toISOString() };
      next = [...games, gameToSave];
    }
    setGames(next);
    await db.upsertGame(gameToSave);
    await saveCacheJSON(CACHE_KEYS.GAMES, next);
  }, [games]);

  const getPlayerGames = useCallback((cohortId: string, playerId: string) => {
    return games
      .filter(g => g.cohortId === cohortId && g.playerId === playerId)
      .sort((a, b) => a.gameNumber - b.gameNumber);
  }, [games]);

  // ─── Payouts ─────────────────────────────────────────────────────────────

  const getPlayerPayouts = useCallback((playerName: string, date: string | null) => {
    const search = playerName.toLowerCase();
    return payouts.filter(p => {
      if (p.isOperator) return false;
      const nameMatch = p.playerName.toLowerCase().includes(search);
      const aliasMatch = !nameMatch && users.some(u =>
        u.aliases?.some(a => a.toLowerCase().includes(search)) &&
        u.name.toLowerCase() === p.playerName.toLowerCase()
      );
      if (!nameMatch && !aliasMatch) return false;
      if (date && p.date !== date) return false;
      return true;
    });
  }, [payouts, users]);

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
    addUser, updateUser, deleteUser, removeDuplicateUsers, ensurePlayerForAuthUser, requestPlayerAccess, approvePlayerRequest, rejectPlayerRequest,
    addCohort, updateCohort, deleteCohort, deployCohort, queueTournamentEntry, markTournamentEntryPaid, removeTournamentEntryRequest,
    updateBracket, getCohortBrackets,
    saveGame: saveGameFn, getPlayerGames,
    getPlayerPayouts, getOperatorPayouts,
    deletePassword, verifyDeletePassword, setDeletePasswordValue,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
