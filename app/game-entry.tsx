import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';
import { CohortType, TournamentKind } from '../utils/types';
import {
  advanceWinner,
  calculateTotalScore,
  getBracketGameWindow,
  getRoundGameNumber,
  isPlayerLiveInCohort,
  isScoreRelevant,
} from '../utils/bracketLogic';
import type { Bracket, BracketStructure, Cohort } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

interface ScoreOverride {
  sourceCohortId: string;
  playerId: string;
  gameNumber: number;
  score: number;
}

export default function GameEntryScreen() {
  const { cohortId: paramId } = useLocalSearchParams<{ cohortId: string }>();
  const { user, mode } = useAuth();
  const { cohorts, users, brackets, games, saveGame, updateBracket, getCohortBrackets } = useApp();

  const [selectedId, setSelectedId] = useState(paramId || '');
  const [editing, setEditing] = useState<{ playerId: string; gameNumber: number } | null>(null);
  const [tempScore, setTempScore] = useState('');
  const [dropdown, setDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loggedInPlayer = useMemo(() => {
    if (!user) return null;
    return users.find(u => (
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
      || u.name.toLowerCase() === user.name.toLowerCase()
    ));
  }, [user, users]);

  const hasScoreEntryAccess = useCallback((cohort: Cohort) => {
    if (mode === 'admin') return true;
    if (!user) return false;

    const byCreatorId = !!(cohort.createdByAuthUserId && user.id === cohort.createdByAuthUserId);
    const byCreatorEmail = !!(
      cohort.createdByAuthUserEmail
      && user.email
      && cohort.createdByAuthUserEmail.toLowerCase() === user.email.toLowerCase()
    );
    if (byCreatorId || byCreatorEmail) return true;

    if (!loggedInPlayer) return false;
    return (cohort.scoreEntryUserIds || []).includes(loggedInPlayer.id);
  }, [mode, user, loggedInPlayer]);

  useEffect(() => {
    if (!paramId) return;
    setSelectedId(paramId);
  }, [paramId]);

  const activeCohorts = useMemo(() => {
    return cohorts
      .filter(c => c.status === 'active' || c.status === 'complete')
      .filter(c => hasScoreEntryAccess(c))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cohorts, hasScoreEntryAccess]);

  useEffect(() => {
    if (selectedId && activeCohorts.some(c => c.id === selectedId)) return;
    setSelectedId(activeCohorts[0]?.id || '');
  }, [activeCohorts, selectedId]);

  const selectedCohort = activeCohorts.find(c => c.id === selectedId);
  const cohortBrackets = useMemo(() => (selectedId ? getCohortBrackets(selectedId) : []), [selectedId, getCohortBrackets]);
  const canEditSelected = !!selectedCohort && hasScoreEntryAccess(selectedCohort);

  const scoreSetCohortId = selectedCohort ? (selectedCohort.scoreSourceCohortId || selectedCohort.id) : selectedId;
  const scoreSetCohortName = scoreSetCohortId
    ? cohorts.find(c => c.id === scoreSetCohortId)?.name
    : null;

  const gameNumbers = useMemo(() => {
    const total = Math.max(3, selectedCohort?.totalGames || 3);
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }, [selectedCohort?.totalGames]);

  const scoresByPlayerAndGame = useMemo(() => {
    const map = new Map<string, number>();
    games
      .filter(g => g.cohortId === scoreSetCohortId)
      .forEach(g => map.set(`${g.playerId}_${g.gameNumber}`, g.score));
    return map;
  }, [games, scoreSetCohortId]);

  const activePlayers = useMemo(() => {
    if (!selectedCohort) return [];

    if (selectedCohort.tournamentKind === TournamentKind.SERIES) {
      const ids = new Set<string>([
        ...(selectedCohort.selectedUserIds || []),
        ...Object.keys(selectedCohort.userBracketCounts || {}),
      ]);
      return users
        .filter(u => ids.has(u.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const ids = new Set<string>();
    cohortBrackets.forEach(b => b.players.forEach(p => ids.add(p.id)));

    return users
      .filter(u => ids.has(u.id))
      .sort((a, b) => {
        const al = isPlayerLiveInCohort(a.id, cohortBrackets);
        const bl = isPlayerLiveInCohort(b.id, cohortBrackets);
        if (al && !bl) return -1;
        if (!al && bl) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [selectedCohort, users, cohortBrackets]);

  const getScore = (playerId: string, gameNumber: number) => {
    const key = `${playerId}_${gameNumber}`;
    return scoresByPlayerAndGame.has(key) ? scoresByPlayerAndGame.get(key)! : null;
  };

  const processBracket = async (
    bracket: Bracket,
    bracketCohort: Cohort,
    override?: ScoreOverride,
  ) => {
    if (bracketCohort.tournamentKind !== TournamentKind.BRACKETS) return false;

    const sourceCohortId = bracketCohort.scoreSourceCohortId || bracketCohort.id;
    const structure: BracketStructure = JSON.parse(JSON.stringify(bracket.structure));
    let changed = false;

    for (let loop = 0; loop < 5; loop++) {
      let loopChanged = false;

      for (let roundIndex = 0; roundIndex < structure.rounds.length; roundIndex++) {
        for (let matchIndex = 0; matchIndex < structure.rounds[roundIndex].length; matchIndex++) {
          const match = structure.rounds[roundIndex][matchIndex];
          if (!match || match.completed || !match.player1 || !match.player2) continue;

          const gameNumber = getRoundGameNumber(bracketCohort, roundIndex);
          let s1: number | null = null;
          let s2: number | null = null;

          if (
            override
            && override.sourceCohortId === sourceCohortId
            && override.gameNumber === gameNumber
          ) {
            if (override.playerId === match.player1.id) s1 = override.score;
            if (override.playerId === match.player2.id) s2 = override.score;
          }

          if (s1 === null) {
            const g = games.find(g => (
              g.cohortId === sourceCohortId
              && g.playerId === match.player1!.id
              && g.gameNumber === gameNumber
            ));
            if (g) s1 = g.score;
          }

          if (s2 === null) {
            const g = games.find(g => (
              g.cohortId === sourceCohortId
              && g.playerId === match.player2!.id
              && g.gameNumber === gameNumber
            ));
            if (g) s2 = g.score;
          }

          if (s1 != null && s2 != null) {
            const t1 = calculateTotalScore(s1, match.player1.handicap, bracketCohort.type === CohortType.HANDICAP);
            const t2 = calculateTotalScore(s2, match.player2.handicap, bracketCohort.type === CohortType.HANDICAP);
            const winner = t1 >= t2 ? match.player1 : match.player2;
            const result = advanceWinner({ structure }, roundIndex, matchIndex, winner);
            Object.assign(structure, result.structure);
            changed = true;
            loopChanged = true;
          }
        }
      }

      if (!loopChanged) break;
    }

    if (changed) {
      await updateBracket(bracket.id, { structure });
      return true;
    }

    return false;
  };

  const syncLinkedBracketTournaments = async (override?: ScoreOverride): Promise<number> => {
    if (!scoreSetCohortId) return 0;

    const affectedCohorts = cohorts.filter(c => (
      c.tournamentKind === TournamentKind.BRACKETS
      && (c.scoreSourceCohortId || c.id) === scoreSetCohortId
    ));

    let updated = 0;
    for (const bracketCohort of affectedCohorts) {
      const cohortBrackets = brackets.filter(b => b.cohortId === bracketCohort.id && !b.structure.completed);
      for (const bracket of cohortBrackets) {
        if (await processBracket(bracket, bracketCohort, override)) updated += 1;
      }
    }

    return updated;
  };

  const handleBlur = async (playerId: string, gameNumber: number) => {
    if (!selectedCohort || !canEditSelected) return;

    const val = tempScore.trim() === '' ? null : parseInt(tempScore, 10);
    if (tempScore.trim() !== '' && (val === null || Number.isNaN(val) || val < 0 || val > 300)) {
      Alert.alert('Error', 'Score must be 0-300');
      setEditing(null);
      setTempScore('');
      return;
    }

    if (val != null) {
      try {
        await saveGame({
          cohortId: scoreSetCohortId,
          playerId,
          gameNumber,
          score: val,
        });

        await syncLinkedBracketTournaments({
          sourceCohortId: scoreSetCohortId,
          playerId,
          gameNumber,
          score: val,
        });
      } catch {
        Alert.alert('Error', 'Failed to save score');
      }
    }

    setEditing(null);
    setTempScore('');
  };

  const handleSync = async () => {
    if (!selectedCohort || !canEditSelected) return;

    setSyncing(true);
    try {
      const updated = await syncLinkedBracketTournaments();
      if (updated === 0) {
        Alert.alert('Sync Complete', 'No bracket tournaments needed updates for this score set.');
      } else {
        Alert.alert('Sync Complete', `Updated ${updated} bracket(s)`);
      }
    } catch {
      Alert.alert('Error', 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const renderScoreCell = (playerId: string, gameNumber: number) => {
    if (!selectedCohort) return null;

    const { startGame, endGame } = getBracketGameWindow(selectedCohort);
    const isBracketTournament = selectedCohort.tournamentKind === TournamentKind.BRACKETS;
    const countsTowardBracket = isBracketTournament && gameNumber >= startGame && gameNumber <= endGame;

    const relevant = !isBracketTournament
      ? true
      : countsTowardBracket
        ? isScoreRelevant(playerId, gameNumber, cohortBrackets, startGame, endGame)
        : true;

    const score = getScore(playerId, gameNumber);
    const isEditing = editing?.playerId === playerId && editing?.gameNumber === gameNumber;

    if (!relevant) {
      return (
        <View style={styles.cellDisabled}>
          <Text style={styles.disabledText}>-</Text>
        </View>
      );
    }

    if (!canEditSelected) {
      return (
        <View style={[styles.cell, !countsTowardBracket && styles.cellSoft]}>
          <Text style={[styles.cellText, !countsTowardBracket && styles.cellTextSoft]}>{score ?? '-'}</Text>
        </View>
      );
    }

    if (isEditing) {
      return (
        <TextInput
          style={[styles.cellInput, !countsTowardBracket && styles.cellInputSoft]}
          value={tempScore}
          onChangeText={setTempScore}
          onBlur={() => handleBlur(playerId, gameNumber)}
          keyboardType="numeric"
          autoFocus
          placeholder="-"
          placeholderTextColor={Colors.textLight}
        />
      );
    }

    return (
      <TouchableOpacity
        style={[styles.cell, !countsTowardBracket && styles.cellSoft]}
        onPress={() => {
          setEditing({ playerId, gameNumber });
          setTempScore(score?.toString() || '');
        }}
      >
        <Text style={[styles.cellText, !countsTowardBracket && styles.cellTextSoft]}>{score ?? '-'}</Text>
      </TouchableOpacity>
    );
  };

  const columnWidth = 74;
  const nameColWidth = 180;
  const tableMinWidth = nameColWidth + (gameNumbers.length * columnWidth);
  const bracketWindow = selectedCohort ? getBracketGameWindow(selectedCohort) : { startGame: 1, endGame: 3 };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Enter Scores" />
      <ScrollView style={styles.scroll}>
        <View style={styles.form}>
          <View style={styles.selectionBox}>
            <View style={styles.selCol}>
              <Text style={styles.selTitle}>Select Tournament</Text>
              <Text style={styles.selSub}>
                {mode === 'user' && activeCohorts.length === 0
                  ? 'No score-entry access yet. Ask a tournament admin to grant you rights.'
                  : 'Choose a tournament and enter game-by-game scores.'}
              </Text>
            </View>
            <View style={styles.selCol}>
              <TouchableOpacity
                style={[styles.dropBtn, activeCohorts.length === 0 && styles.dropBtnOff]}
                onPress={() => setDropdown(true)}
                disabled={activeCohorts.length === 0}
              >
                <Text style={styles.dropBtnText}>
                  {selectedCohort
                    ? `${selectedCohort.name} (${selectedCohort.tournamentKind} | ${selectedCohort.type})`
                    : 'Select...'}
                </Text>
                <Text style={styles.dropArrow}>▼</Text>
              </TouchableOpacity>
              {selectedCohort && (
                <TouchableOpacity
                  style={[styles.syncBtn, (syncing || !canEditSelected) && styles.syncBtnOff]}
                  onPress={handleSync}
                  disabled={syncing || !canEditSelected}
                >
                  {syncing ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.syncBtnText}>Update Brackets</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {mode === 'user' && activeCohorts.length === 0 && (
            <View style={styles.accessWarn}>
              <Text style={styles.accessWarnTitle}>Score Entry Access Needed</Text>
              <Text style={styles.accessWarnText}>
                Tournament creators can assign you as a score-entry user even if you are not in that tournament.
              </Text>
            </View>
          )}

          {selectedCohort && (
            <View style={styles.contextWrap}>
              <Text style={styles.contextText}>Games in tournament: {selectedCohort.totalGames}</Text>
              {selectedCohort.tournamentKind === TournamentKind.BRACKETS && selectedCohort.totalGames > 3 && (
                <Text style={styles.contextText}>
                  Brackets count games {bracketWindow.startGame}-{bracketWindow.endGame}
                </Text>
              )}
              {scoreSetCohortId !== selectedCohort.id && (
                <Text style={styles.contextText}>Shared score set source: {scoreSetCohortName || 'Unknown Tournament'}</Text>
              )}
            </View>
          )}

          <Modal visible={dropdown} transparent animationType="fade" onRequestClose={() => setDropdown(false)}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDropdown(false)}>
              <View style={styles.dropModal} onStartShouldSetResponder={() => true}>
                <View style={styles.dropHeader}>
                  <Text style={styles.dropTitle}>Select Tournament</Text>
                  <TouchableOpacity onPress={() => setDropdown(false)}><Text style={styles.closeBtn}>X</Text></TouchableOpacity>
                </View>
                <ScrollView style={styles.dropList}>
                  {activeCohorts.length === 0 ? (
                    <View style={styles.dropEmpty}>
                      <Text style={styles.dropEmptyText}>
                        {mode === 'user'
                          ? 'No tournaments available for your score-entry rights.'
                          : 'No active or completed tournaments yet.'}
                      </Text>
                    </View>
                  ) : (
                    activeCohorts.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.dropItem, selectedId === c.id && styles.dropItemSel]}
                        onPress={() => {
                          setSelectedId(c.id);
                          setDropdown(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropItemText, selectedId === c.id && styles.dropItemTextSel]}>{c.name}</Text>
                          <Text style={[styles.dropItemSub, selectedId === c.id && styles.dropItemTextSel]}>
                            {c.tournamentKind} | {c.type}
                          </Text>
                        </View>
                        {selectedId === c.id && <Text style={styles.dropCheck}>✓</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {selectedCohort && (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: tableMinWidth, width: '100%' }}>
                <View style={styles.tableHead}>
                  <Text style={[styles.headText, { width: nameColWidth }]}>Player</Text>
                  {gameNumbers.map(gameNumber => (
                    <Text key={`head_${gameNumber}`} style={[styles.headText, styles.gameCol, { width: columnWidth }]}>Gm {gameNumber}</Text>
                  ))}
                </View>

                {activePlayers.length === 0 ? (
                  <View style={styles.empty}><Text style={styles.emptyText}>No players in this tournament.</Text></View>
                ) : activePlayers.map(u => {
                  const live = selectedCohort.tournamentKind === TournamentKind.BRACKETS
                    ? isPlayerLiveInCohort(u.id, cohortBrackets)
                    : true;

                  return (
                    <View key={u.id} style={[styles.row, !live && styles.rowDim]}>
                      <View style={{ width: nameColWidth, paddingRight: 10 }}>
                        <Text style={styles.rowName}>{u.name}</Text>
                        <Text style={styles.rowInfo}>{live ? `Avg: ${u.average}` : 'Eliminated'}</Text>
                      </View>
                      {gameNumbers.map(gameNumber => (
                        <View key={`${u.id}_${gameNumber}`} style={[styles.gameCol, { width: columnWidth }]}>
                          {renderScoreCell(u.id, gameNumber)}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  form: { padding: 16 },
  selectionBox: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 20,
  },
  selCol: { flex: 1, justifyContent: 'center' },
  selTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  selSub: { fontSize: 14, color: Colors.white, opacity: 0.9, lineHeight: 19 },
  dropBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.white,
  },
  dropBtnText: { fontSize: 15, color: Colors.headerDark, fontWeight: '600', flex: 1 },
  dropBtnOff: { opacity: 0.55 },
  dropArrow: { fontSize: 12, color: Colors.textSecondary, marginLeft: 8 },
  syncBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.white,
    alignItems: 'center',
    marginTop: 12,
  },
  syncBtnOff: { opacity: 0.6 },
  syncBtnText: { color: Colors.white, fontWeight: 'bold' },
  accessWarn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: 'rgba(245,158,11,0.12)',
    padding: 10,
    marginBottom: 10,
  },
  accessWarnTitle: { color: Colors.warning, fontWeight: '800', fontSize: 12, marginBottom: 3 },
  accessWarnText: { color: Colors.textPrimary, fontSize: 12, lineHeight: 17 },
  contextWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 10,
    marginBottom: 10,
  },
  contextText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropModal: { backgroundColor: Colors.surface, borderRadius: 12, width: '90%', maxHeight: '70%' },
  dropHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  closeBtn: { fontSize: 20, color: Colors.textSecondary, fontWeight: 'bold' },
  dropList: { maxHeight: 400 },
  dropEmpty: { padding: 18 },
  dropEmptyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  dropItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropItemSel: { backgroundColor: Colors.primaryDark },
  dropItemText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
  dropItemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  dropItemTextSel: { color: Colors.white },
  dropCheck: { color: Colors.white, fontWeight: 'bold', marginLeft: 10 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: Colors.headerDark,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  headText: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
  gameCol: { alignItems: 'center' },
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  rowDim: { opacity: 0.5, backgroundColor: Colors.background },
  rowName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  rowInfo: { fontSize: 12, color: Colors.textSecondary },
  cell: {
    minWidth: 56,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cellSoft: {
    backgroundColor: Colors.surfaceSecondary,
    borderStyle: 'dashed',
    borderColor: Colors.borderLight,
  },
  cellDisabled: {
    minWidth: 56,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.border,
    borderRadius: 6,
    opacity: 0.3,
  },
  cellInput: {
    minWidth: 56,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  cellInputSoft: {
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceSecondary,
  },
  cellText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  cellTextSoft: { color: Colors.textSecondary },
  disabledText: { color: Colors.textSecondary, fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary },
});
