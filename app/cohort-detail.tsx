import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Modal, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus } from '../utils/types';
import { isPlayerLiveInCohort } from '../utils/bracketLogic';
import NavigationHeader from '../components/NavigationHeader';

export default function CohortDetailScreen() {
  const router = useRouter();
  const { cohortId } = useLocalSearchParams<{ cohortId: string }>();
  const { cohorts, getCohortBrackets, users, deployCohort, updateCohort } = useApp();

  const [activeTab, setActiveTab] = useState<'brackets' | 'roster'>('brackets');
  const [rosterModal, setRosterModal] = useState(false);
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const cohort = cohorts.find(c => c.id === cohortId);
  const brackets = cohort ? getCohortBrackets(cohortId!) : [];
  const selectedIds = cohort?.selectedUserIds || [];

  // Auto-switch to roster if no brackets yet
  useEffect(() => {
    if (brackets.length === 0 && cohort?.status === CohortStatus.NOT_DEPLOYED) setActiveTab('roster');
  }, [brackets.length, cohort?.status]);

  // Auto-complete cohort
  useEffect(() => {
    if (cohort && brackets.length > 0 && cohort.status === CohortStatus.ACTIVE) {
      if (brackets.every(b => b.structure.completed)) {
        updateCohort(cohort.id, { status: CohortStatus.COMPLETE });
      }
    }
  }, [cohort, brackets]);

  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedIds.includes(u.id)).sort((a, b) => {
      const al = isPlayerLiveInCohort(a.id, brackets);
      const bl = isPlayerLiveInCohort(b.id, brackets);
      if (al && !bl) return -1;
      if (!al && bl) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users, selectedIds, brackets]);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  // Bracket estimation
  const estBrackets = useMemo(() => {
    const players = selectedIds.map(uid => {
      const u = users.find(u => u.id === uid);
      return { id: uid, count: cohort?.userBracketCounts?.[uid] || u?.numBrackets || 1 };
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
  }, [selectedIds, users, cohort?.userBracketCounts]);

  const totalSlots = selectedIds.reduce((s, uid) => {
    const u = users.find(u => u.id === uid);
    return s + Math.min(cohort?.userBracketCounts?.[uid] || u?.numBrackets || 1, estBrackets || 999);
  }, 0);
  const slotsNeeded = (estBrackets + 1) * 8 - totalSlots;

  const toggleUser = (uid: string) => {
    const isIn = selectedIds.includes(uid);
    const next = isIn ? selectedIds.filter(id => id !== uid) : [...selectedIds, uid];
    const counts = { ...cohort!.userBracketCounts };
    if (isIn) delete counts[uid];
    else if (!counts[uid]) { const u = users.find(u => u.id === uid); counts[uid] = u?.numBrackets || 1; }
    updateCohort(cohortId!, { selectedUserIds: next, userBracketCounts: counts });
  };

  const setBracketCount = (uid: string, text: string) => {
    const val = parseInt(text);
    if (!isNaN(val) && val >= 1) {
      updateCohort(cohortId!, { userBracketCounts: { ...cohort!.userBracketCounts, [uid]: val } });
    }
  };

  const handleDeploy = async () => {
    if (estBrackets < 1) { Alert.alert('Not Enough', 'Need at least 8 player slots'); return; }
    try {
      await deployCohort(cohortId!, selectedUsers, cohort!.userBracketCounts);
      Alert.alert('Success', 'Brackets generated!');
      setActiveTab('brackets');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const statusColor = (s: string) => {
    if (s === CohortStatus.ACTIVE) return Colors.success;
    if (s === CohortStatus.COMPLETE) return Colors.info;
    return Colors.warning;
  };

  if (!cohort) return null;

  // ─── Brackets Tab ──────────────────────────────────────────────────────

  const visibleBrackets = brackets.filter(b => showCompleted || !(b.structure.completed || b.structure.winner));

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
          <TouchableOpacity key={b.id} style={styles.bracketCard}
            onPress={() => router.push({ pathname: '/bracket-edit' as any, params: { bracketId: b.id, cohortId: cohort.id } })}>
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
                <View style={styles.progressRow}>
                  <View style={styles.progressBar}><View style={[styles.progressFill, { width: '40%' }]} /></View>
                  <Text style={styles.progressText}>In Progress</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Roster Tab ────────────────────────────────────────────────────────

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
            const live = isPlayerLiveInCohort(u.id, brackets);
            return (
              <View key={u.id} style={[styles.rosterRow, !live && styles.rosterRowDim]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{u.name[0]}</Text></View>
                <View style={styles.rosterInfo}>
                  <Text style={styles.rosterName}>{u.name}</Text>
                  <Text style={styles.rosterStats}>Avg: {u.average} | Hdcp: {u.handicap}</Text>
                </View>
                {live ? (
                  <View style={styles.entryBadge}>
                    <Text style={styles.entryCount}>{entries}</Text>
                    <Text style={styles.entryLabel}>{entries === 1 ? 'Entry' : 'Entries'}</Text>
                  </View>
                ) : (
                  <View style={styles.elimBadge}><Text style={styles.elimText}>Eliminated</Text></View>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={cohort.name} />

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudItem}><Text style={styles.hudLabel}>Type</Text><Text style={styles.hudVal}>{cohort.type}</Text></View>
        <View style={styles.hudDiv} />
        <View style={styles.hudItem}><Text style={styles.hudLabel}>Status</Text><Text style={[styles.hudVal, { color: statusColor(cohort.status) }]}>{cohort.status.toUpperCase()}</Text></View>
        <View style={styles.hudDiv} />
        <View style={styles.hudItem}><Text style={styles.hudLabel}>Brackets</Text><Text style={styles.hudVal}>{estBrackets}</Text></View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['brackets', 'roster'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
              {t === 'brackets' ? 'Brackets' : 'Roster'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll}>
        {activeTab === 'brackets' ? renderBrackets() : renderRoster()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Deploy Footer */}
      {activeTab === 'roster' && cohort.status === CohortStatus.NOT_DEPLOYED && selectedUsers.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerSlots}><Text style={{ fontWeight: 'bold', color: Colors.white }}>{totalSlots}</Text> Spots Filled</Text>
            <Text style={styles.footerHint}>Add {slotsNeeded} more for next bracket</Text>
          </View>
          <TouchableOpacity style={[styles.deployBtn, estBrackets < 1 && styles.deployBtnOff]} onPress={handleDeploy} disabled={estBrackets < 1}>
            <Text style={styles.deployBtnText}>Deploy ({estBrackets})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Roster Modal */}
      <Modal visible={rosterModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRosterModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Roster</Text>
            <TouchableOpacity onPress={() => setRosterModal(false)}><Text style={styles.doneText}>Done</Text></TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <TextInput style={styles.searchInput} placeholder="Search players..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
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
                      <Text style={styles.countLabel}>Brackets:</Text>
                      <TextInput style={styles.countInput} value={count.toString()} keyboardType="numeric"
                        onChangeText={t => setBracketCount(u.id, t)} selectTextOnFocus maxLength={2} />
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
  hud: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, justifyContent: 'space-evenly', alignItems: 'center' },
  hudItem: { alignItems: 'center', flex: 1 },
  hudLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  hudVal: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
  hudDiv: { width: 1, height: '60%', backgroundColor: Colors.border },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: Colors.surface, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.white, fontWeight: 'bold' },
  scroll: { flex: 1 },
  tabContent: { paddingHorizontal: 16 },
  // Filter
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: Colors.textSecondary, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  filterLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  // Empty
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  emptySub: { textAlign: 'center', color: Colors.textSecondary, marginBottom: 20, paddingHorizontal: 32 },
  emptyBtn: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  emptyBtnText: { color: Colors.primary, fontWeight: 'bold' },
  // Bracket cards
  bracketCard: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  bracketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  bracketTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillActive: { backgroundColor: 'rgba(59,130,246,0.2)' },
  pillComplete: { backgroundColor: 'rgba(16,185,129,0.2)' },
  pillText: { fontSize: 10, fontWeight: 'bold', color: Colors.white },
  bracketBody: { padding: 16 },
  bracketSub: { color: Colors.textSecondary, marginBottom: 12 },
  winnerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.1)', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  winnerLabel: { color: Colors.accent, fontWeight: 'bold', marginRight: 6 },
  winnerName: { color: Colors.white },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary },
  progressText: { fontSize: 10, color: Colors.textSecondary },
  // Roster
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rosterCount: { color: Colors.textSecondary, fontWeight: '600' },
  editLink: { color: Colors.primary, fontWeight: 'bold' },
  rosterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  rosterRowDim: { opacity: 0.5, backgroundColor: Colors.background },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: Colors.textPrimary, fontWeight: 'bold' },
  rosterInfo: { flex: 1 },
  rosterName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
  rosterStats: { color: Colors.textSecondary, fontSize: 12 },
  entryBadge: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', minWidth: 70 },
  entryCount: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  entryLabel: { color: Colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  elimBadge: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  elimText: { color: Colors.danger, fontSize: 12, fontWeight: 'bold' },
  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', alignItems: 'center',
  },
  footerInfo: { flex: 1 },
  footerSlots: { color: Colors.textSecondary, fontSize: 14 },
  footerHint: { color: Colors.textLight, fontSize: 10, marginTop: 2 },
  deployBtn: { backgroundColor: Colors.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  deployBtnOff: { backgroundColor: Colors.border, opacity: 0.5 },
  deployBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  doneText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  searchBar: { padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.white },
  modalList: { flex: 1, padding: 16 },
  playerRow: { flexDirection: 'row', backgroundColor: Colors.surface, marginBottom: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', paddingRight: 12 },
  playerRowSel: { borderColor: Colors.primary, backgroundColor: Colors.surfaceSecondary },
  playerTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  playerName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  playerStats: { color: Colors.textSecondary, fontSize: 12 },
  countWrap: { alignItems: 'center', marginLeft: 8 },
  countLabel: { fontSize: 8, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  countInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, width: 40, height: 36, textAlign: 'center', color: Colors.white, fontWeight: 'bold', fontSize: 16 },
});
