import React, { useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus, CohortType, TournamentKind } from '../utils/types';
import { calculateTotalScore, getBracketGameWindow, isPlayerLiveInCohort } from '../utils/bracketLogic';
import NavigationHeader from '../components/NavigationHeader';

type TabKey = 'brackets' | 'series' | 'roster';

export default function CohortDetailScreen() {
  const router = useRouter();
  const { cohortId } = useLocalSearchParams<{ cohortId: string }>();
  const { cohorts, getCohortBrackets, users, deployCohort, updateCohort, getPlayerGames } = useApp();

  const [activeTab, setActiveTab] = useState<TabKey>('brackets');
  const [rosterModal, setRosterModal] = useState(false);
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const cohort = cohorts.find(c => c.id === cohortId);
  const brackets = useMemo(() => (cohort ? getCohortBrackets(cohortId!) : []), [cohort, cohortId, getCohortBrackets]);
  const selectedIds = useMemo(() => (cohort?.selectedUserIds || []), [cohort?.selectedUserIds]);
  const isSeries = cohort?.tournamentKind === TournamentKind.SERIES;

  useEffect(() => {
    if (!cohort) return;

    if (cohort.tournamentKind === TournamentKind.SERIES && activeTab === 'brackets') {
      setActiveTab('series');
      return;
    }

    if (cohort.tournamentKind === TournamentKind.BRACKETS && activeTab === 'series') {
      setActiveTab('brackets');
      return;
    }

    if (
      cohort.tournamentKind === TournamentKind.BRACKETS
      && brackets.length === 0
      && cohort.status === CohortStatus.NOT_DEPLOYED
    ) {
      setActiveTab('roster');
    }
  }, [activeTab, brackets.length, cohort]);

  useEffect(() => {
    if (!cohort || isSeries) return;
    if (brackets.length > 0 && cohort.status === CohortStatus.ACTIVE && brackets.every(b => b.structure.completed)) {
      updateCohort(cohort.id, { status: CohortStatus.COMPLETE });
    }
  }, [cohort, brackets, isSeries, updateCohort]);

  const selectedUsers = useMemo(() => {
    const base = users.filter(u => selectedIds.includes(u.id));

    if (isSeries) {
      return base.sort((a, b) => a.name.localeCompare(b.name));
    }

    return base.sort((a, b) => {
      const al = isPlayerLiveInCohort(a.id, brackets);
      const bl = isPlayerLiveInCohort(b.id, brackets);
      if (al && !bl) return -1;
      if (!al && bl) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users, selectedIds, isSeries, brackets]);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  const estBrackets = useMemo(() => {
    if (!cohort || isSeries) return 0;

    const players = selectedIds.map(uid => {
      const u = users.find(p => p.id === uid);
      return { id: uid, count: cohort.userBracketCounts?.[uid] || u?.numBrackets || 1 };
    });

    let total = players.reduce((s, p) => s + p.count, 0);
    let max = Math.floor(total / 8);
    for (let i = 0; i < 5 && max > 0; i++) {
      let usable = 0;
      players.forEach(p => { usable += Math.min(p.count, max); });
      const next = Math.floor(usable / 8);
      if (next === max) break;
      max = next;
    }
    return max;
  }, [cohort, isSeries, selectedIds, users]);

  const totalSlots = selectedIds.reduce((sum, uid) => {
    const u = users.find(p => p.id === uid);
    if (!cohort) return sum;
    return sum + (cohort.userBracketCounts?.[uid] || u?.numBrackets || 1);
  }, 0);

  const slotsNeeded = Math.max(0, (estBrackets + 1) * 8 - totalSlots);

  const { startGame, endGame } = useMemo(() => {
    if (!cohort) return { startGame: 1, endGame: 3 };
    return getBracketGameWindow(cohort);
  }, [cohort]);

  const seriesStandings = useMemo(() => {
    if (!cohort || !isSeries) return [];

    const scoreCohortId = cohort.scoreSourceCohortId || cohort.id;
    const useHandicap = cohort.type === CohortType.HANDICAP;

    return selectedUsers.map(player => {
      const playerGames = getPlayerGames(scoreCohortId, player.id);
      const byGame = new Map(playerGames.map(g => [g.gameNumber, g.score]));

      let total = 0;
      let enteredGames = 0;
      const scores: (number | null)[] = [];

      for (let gn = 1; gn <= cohort.totalGames; gn++) {
        const raw = byGame.get(gn);
        if (typeof raw === 'number') {
          enteredGames += 1;
          total += calculateTotalScore(raw, player.handicap, useHandicap);
          scores.push(raw);
        } else {
          scores.push(null);
        }
      }

      return {
        player,
        total,
        enteredGames,
        scores,
      };
    }).sort((a, b) => b.total - a.total || b.enteredGames - a.enteredGames || a.player.name.localeCompare(b.player.name));
  }, [cohort, getPlayerGames, isSeries, selectedUsers]);

  const toggleUser = (uid: string) => {
    if (!cohort) return;
    const isIn = selectedIds.includes(uid);
    const next = isIn ? selectedIds.filter(id => id !== uid) : [...selectedIds, uid];
    const counts = { ...cohort.userBracketCounts };

    if (isIn) {
      delete counts[uid];
    } else if (!counts[uid]) {
      const u = users.find(p => p.id === uid);
      counts[uid] = u?.numBrackets || 1;
    }

    updateCohort(cohortId!, { selectedUserIds: next, userBracketCounts: counts });
  };

  const setBracketCount = (uid: string, text: string) => {
    if (!cohort) return;
    const val = parseInt(text, 10);
    if (!Number.isNaN(val) && val >= 1) {
      updateCohort(cohortId!, { userBracketCounts: { ...cohort.userBracketCounts, [uid]: val } });
    }
  };

  const handleDeploy = async () => {
    if (!cohort) return;

    if (!isSeries && estBrackets < 1) {
      Alert.alert('Not Enough', 'Need at least 8 player slots');
      return;
    }

    try {
      await deployCohort(cohortId!, selectedUsers, cohort.userBracketCounts);
      Alert.alert('Success', isSeries ? 'Series started!' : 'Brackets generated!');
      setActiveTab(isSeries ? 'series' : 'brackets');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const statusColor = (s: string) => {
    if (s === CohortStatus.ACTIVE) return Colors.success;
    if (s === CohortStatus.COMPLETE) return Colors.info;
    return Colors.warning;
  };

  if (!cohort) return null;

  const visibleBrackets = brackets.filter(b => showCompleted || !(b.structure.completed || b.structure.winner));
  const scoreSourceName = cohort.scoreSourceCohortId
    ? cohorts.find(c => c.id === cohort.scoreSourceCohortId)?.name
    : null;

  const renderBrackets = () => (
    <View style={styles.tabContent}>
      {brackets.length > 0 && (
        <TouchableOpacity style={styles.filterRow} onPress={() => setShowCompleted(!showCompleted)}>
          <View style={[styles.checkbox, showCompleted && styles.checkboxActive]}>
            {showCompleted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.filterLabel}>Show completed brackets</Text>
        </TouchableOpacity>
      )}

      {visibleBrackets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{brackets.length > 0 ? 'All Brackets Complete' : 'No Brackets Yet'}</Text>
          <Text style={styles.emptySub}>
            {brackets.length > 0 ? 'Toggle the checkbox above to view history' : 'Set up your roster to get started'}
          </Text>
          {brackets.length === 0 && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('roster')}>
              <Text style={styles.emptyBtnText}>Go to Roster</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : visibleBrackets.map(b => {
        const done = b.structure.completed || !!b.structure.winner;
        return (
          <TouchableOpacity
            key={b.id}
            style={styles.bracketCard}
            onPress={() => router.push({ pathname: '/bracket-edit' as any, params: { bracketId: b.id, cohortId: cohort.id } })}
          >
            <View style={styles.bracketTop}>
              <Text style={styles.bracketTitle}>Bracket {b.bracketNumber}</Text>
              <View style={[styles.pill, done ? styles.pillComplete : styles.pillActive]}>
                <Text style={styles.pillText}>{done ? 'COMPLETE' : 'LIVE'}</Text>
              </View>
            </View>
            <View style={styles.bracketBody}>
              <Text style={styles.bracketSub}>{b.players.length} Players</Text>
              {b.structure.winner ? (
                <View style={styles.winnerRow}>
                  <Text style={styles.winnerLabel}>Winner: </Text>
                  <Text style={styles.winnerName}>{b.structure.winner.name}</Text>
                </View>
              ) : (
                <Text style={styles.progressText}>In Progress</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSeries = () => (
    <View style={styles.tabContent}>
      {scoreSourceName && (
        <View style={styles.sourceBanner}>
          <Text style={styles.sourceBannerText}>Using shared scores from: {scoreSourceName}</Text>
        </View>
      )}

      {seriesStandings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Players In Series</Text>
          <Text style={styles.emptySub}>Add players in roster to view standings.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('roster')}>
            <Text style={styles.emptyBtnText}>Go to Roster</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {seriesStandings.map((entry, idx) => (
            <View key={entry.player.id} style={styles.seriesRow}>
              <View style={styles.rankBubble}><Text style={styles.rankText}>{idx + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.seriesName}>{entry.player.name}</Text>
                <Text style={styles.seriesMeta}>Games entered: {entry.enteredGames}/{cohort.totalGames}</Text>
                <View style={styles.seriesScoresRow}>
                  {entry.scores.map((s, i) => (
                    <View key={`${entry.player.id}_${i + 1}`} style={styles.seriesScoreChip}>
                      <Text style={styles.seriesScoreChipText}>G{i + 1}: {s ?? '-'}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.totalCol}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{entry.total}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderRoster = () => (
    <View style={styles.tabContent}>
      {selectedUsers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Roster Empty</Text>
          {cohort.status === CohortStatus.NOT_DEPLOYED && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setRosterModal(true)}>
              <Text style={styles.emptyBtnText}>Manage Roster</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterCount}>{selectedUsers.length} Players</Text>
            {cohort.status === CohortStatus.NOT_DEPLOYED && (
              <TouchableOpacity onPress={() => setRosterModal(true)}>
                <Text style={styles.editLink}>Edit Roster</Text>
              </TouchableOpacity>
            )}
          </View>
          {selectedUsers.map(u => {
            const entries = cohort.userBracketCounts?.[u.id] || u.numBrackets || 1;
            const live = isSeries ? true : isPlayerLiveInCohort(u.id, brackets);

            return (
              <View key={u.id} style={[styles.rosterRow, !live && styles.rosterRowDim]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{u.name[0]}</Text></View>
                <View style={styles.rosterInfo}>
                  <Text style={styles.rosterName}>{u.name}</Text>
                  <Text style={styles.rosterStats}>Avg: {u.average} | Hdcp: {u.handicap}</Text>
                </View>
                {!isSeries ? (
                  live ? (
                    <View style={styles.entryBadge}>
                      <Text style={styles.entryCount}>{entries}</Text>
                      <Text style={styles.entryLabel}>{entries === 1 ? 'Entry' : 'Entries'}</Text>
                    </View>
                  ) : (
                    <View style={styles.elimBadge}><Text style={styles.elimText}>Eliminated</Text></View>
                  )
                ) : (
                  <View style={styles.entryBadge}>
                    <Text style={styles.entryCount}>{entries}</Text>
                    <Text style={styles.entryLabel}>{entries === 1 ? 'Spot' : 'Spots'}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );

  const tabItems: { key: TabKey; label: string }[] = isSeries
    ? [{ key: 'series', label: 'Series' }, { key: 'roster', label: 'Roster' }]
    : [{ key: 'brackets', label: 'Brackets' }, { key: 'roster', label: 'Roster' }];

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={cohort.name} />

      <View style={styles.hudCard}>
        <View style={styles.hudRow}><Text style={styles.hudLabel}>Mode</Text><Text style={styles.hudValue}>{cohort.tournamentKind}</Text></View>
        <View style={styles.hudRow}><Text style={styles.hudLabel}>Scoring</Text><Text style={styles.hudValue}>{cohort.type}</Text></View>
        <View style={styles.hudRow}>
          <Text style={styles.hudLabel}>Games</Text>
          <Text style={styles.hudValue}>
            {cohort.tournamentKind === TournamentKind.BRACKETS
              ? cohort.totalGames > 3
                ? `${cohort.totalGames} (counting ${startGame}-${endGame})`
                : `${cohort.totalGames}`
              : `${cohort.totalGames} total`}
          </Text>
        </View>
        <View style={styles.hudRow}><Text style={styles.hudLabel}>Status</Text><Text style={[styles.hudValue, { color: statusColor(cohort.status) }]}>{cohort.status.toUpperCase()}</Text></View>
      </View>

      <View style={styles.tabs}>
        {tabItems.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]} onPress={() => setActiveTab(t.key)}>
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll}>
        {activeTab === 'roster' && renderRoster()}
        {activeTab === 'series' && renderSeries()}
        {activeTab === 'brackets' && renderBrackets()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {activeTab === 'roster' && cohort.status === CohortStatus.NOT_DEPLOYED && selectedUsers.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            {!isSeries ? (
              <>
                <Text style={styles.footerSlots}><Text style={{ fontWeight: 'bold', color: Colors.white }}>{totalSlots}</Text> Spots Filled</Text>
                <Text style={styles.footerHint}>Add {slotsNeeded} more for next bracket</Text>
              </>
            ) : (
              <>
                <Text style={styles.footerSlots}><Text style={{ fontWeight: 'bold', color: Colors.white }}>{selectedUsers.length}</Text> Players Ready</Text>
                <Text style={styles.footerHint}>Series will score across all {cohort.totalGames} games.</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[styles.deployBtn, !isSeries && estBrackets < 1 && styles.deployBtnOff]}
            onPress={handleDeploy}
            disabled={!isSeries && estBrackets < 1}
          >
            <Text style={styles.deployBtnText}>{isSeries ? 'Start Series' : `Deploy (${estBrackets})`}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={rosterModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRosterModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Roster</Text>
            <TouchableOpacity onPress={() => setRosterModal(false)}><Text style={styles.doneText}>Done</Text></TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search players..."
              placeholderTextColor={Colors.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <ScrollView style={styles.modalList}>
            {filteredUsers.map(u => {
              const isSel = selectedIds.includes(u.id);
              const count = cohort.userBracketCounts?.[u.id] || u.numBrackets || 1;

              return (
                <View key={u.id} style={[styles.playerRow, isSel && styles.playerRowSel]}>
                  <TouchableOpacity style={styles.playerTouch} onPress={() => toggleUser(u.id)}>
                    <View style={[styles.checkbox, isSel && styles.checkboxActive]}>
                      {isSel && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.playerName, isSel && { color: Colors.primary }]}>{u.name}</Text>
                      <Text style={styles.playerStats}>Avg: {u.average} | Hdcp: {u.handicap}</Text>
                    </View>
                  </TouchableOpacity>
                  {isSel && (
                    <View style={styles.countWrap}>
                      <Text style={styles.countLabel}>{isSeries ? 'Spots:' : 'Brackets:'}</Text>
                      <TextInput
                        style={styles.countInput}
                        value={count.toString()}
                        keyboardType="numeric"
                        onChangeText={t => setBracketCount(u.id, t)}
                        selectTextOnFocus
                        maxLength={2}
                      />
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hudCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  hudLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.7 },
  hudValue: { fontSize: 13, fontWeight: '700', color: Colors.white },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.white, fontWeight: 'bold' },
  scroll: { flex: 1 },
  tabContent: { paddingHorizontal: 16 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  filterLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  emptySub: { textAlign: 'center', color: Colors.textSecondary, marginBottom: 20, paddingHorizontal: 32 },
  emptyBtn: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyBtnText: { color: Colors.primary, fontWeight: 'bold' },
  bracketCard: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  bracketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  bracketTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillActive: { backgroundColor: 'rgba(59,130,246,0.2)' },
  pillComplete: { backgroundColor: 'rgba(16,185,129,0.2)' },
  pillText: { fontSize: 10, fontWeight: 'bold', color: Colors.white },
  bracketBody: { padding: 16 },
  bracketSub: { color: Colors.textSecondary, marginBottom: 12 },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  winnerLabel: { color: Colors.accent, fontWeight: 'bold', marginRight: 6 },
  winnerName: { color: Colors.white },
  progressText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sourceBanner: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    padding: 10,
  },
  sourceBannerText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  seriesRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  rankBubble: {
    width: 24,
    height: 24,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  rankText: { color: Colors.textPrimary, fontWeight: '800', fontSize: 12 },
  seriesName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  seriesMeta: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  seriesScoresRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  seriesScoreChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  seriesScoreChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  totalCol: { alignItems: 'flex-end', marginLeft: 10 },
  totalLabel: { color: Colors.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
  totalValue: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 2 },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rosterCount: { color: Colors.textSecondary, fontWeight: '600' },
  editLink: { color: Colors.primary, fontWeight: 'bold' },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rosterRowDim: { opacity: 0.5, backgroundColor: Colors.background },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.textPrimary, fontWeight: 'bold' },
  rosterInfo: { flex: 1 },
  rosterName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
  rosterStats: { color: Colors.textSecondary, fontSize: 12 },
  entryBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 70,
  },
  entryCount: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  entryLabel: { color: Colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  elimBadge: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  elimText: { color: Colors.danger, fontSize: 12, fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerInfo: { flex: 1 },
  footerSlots: { color: Colors.textSecondary, fontSize: 14 },
  footerHint: { color: Colors.textLight, fontSize: 10, marginTop: 2 },
  deployBtn: { backgroundColor: Colors.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  deployBtnOff: { backgroundColor: Colors.border, opacity: 0.5 },
  deployBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  doneText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  searchBar: { padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.white },
  modalList: { flex: 1, padding: 16 },
  playerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingRight: 12,
  },
  playerRowSel: { borderColor: Colors.primary, backgroundColor: Colors.surfaceSecondary },
  playerTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  playerName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  playerStats: { color: Colors.textSecondary, fontSize: 12 },
  countWrap: { alignItems: 'center', marginLeft: 8 },
  countLabel: { fontSize: 8, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  countInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    width: 40,
    height: 36,
    textAlign: 'center',
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
