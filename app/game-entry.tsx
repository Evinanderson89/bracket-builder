import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { calculateTotalScore, advanceWinner, isPlayerLiveInCohort, isScoreRelevant } from '../utils/bracketLogic';
import type { Bracket, BracketStructure } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

export default function GameEntryScreen() {
  const { cohortId: paramId } = useLocalSearchParams<{ cohortId: string }>();
  const { cohorts, users, brackets, games, saveGame, getPlayerGames, updateBracket, getCohortBrackets } = useApp();

  const [selectedId, setSelectedId] = useState(paramId || '');
  const [editing, setEditing] = useState<{ playerId: string; gameNumber: number } | null>(null);
  const [tempScore, setTempScore] = useState('');
  const [dropdown, setDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { if (paramId && paramId !== selectedId) setSelectedId(paramId); }, [paramId]);

  const activeCohorts = cohorts.filter(c => c.status === 'active' || c.status === 'complete')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const selectedCohort = cohorts.find(c => c.id === selectedId);

  const cohortBrackets = useMemo(() => selectedId ? getCohortBrackets(selectedId) : [], [selectedId, getCohortBrackets, brackets]);

  const activePlayers = useMemo(() => {
    if (!selectedId) return [];
    const ids = new Set<string>();
    cohortBrackets.forEach(b => b.players.forEach(p => ids.add(p.id)));
    return users.filter(u => ids.has(u.id)).sort((a, b) => {
      const al = isPlayerLiveInCohort(a.id, cohortBrackets);
      const bl = isPlayerLiveInCohort(b.id, cohortBrackets);
      if (al && !bl) return -1;
      if (!al && bl) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [selectedId, cohortBrackets, users]);

  const getScore = (pid: string, gn: number) => {
    if (!selectedId) return null;
    return getPlayerGames(selectedId, pid).find(g => g.gameNumber === gn)?.score ?? null;
  };

  // Process a bracket for automatic advancement
  const processBracket = async (bracket: Bracket, override?: { playerId: string; gameNumber: number; score: number }) => {
    const cohort = cohorts.find(c => c.id === bracket.cohortId);
    if (!cohort) return false;

    const structure: BracketStructure = JSON.parse(JSON.stringify(bracket.structure));
    let changed = false;

    for (let loop = 0; loop < 5; loop++) {
      let loopChanged = false;
      for (let ri = 0; ri < structure.rounds.length; ri++) {
        for (let mi = 0; mi < structure.rounds[ri].length; mi++) {
          const match = structure.rounds[ri][mi];
          if (!match || match.completed || !match.player1 || !match.player2) continue;
          const gn = ri + 1;

          let s1: number | null = null;
          let s2: number | null = null;

          if (override?.gameNumber === gn) {
            if (override.playerId === match.player1.id) s1 = override.score;
            if (override.playerId === match.player2.id) s2 = override.score;
          }
          if (s1 === null && match.player1) { const g = games.find(g => g.cohortId === bracket.cohortId && g.playerId === match.player1!.id && g.gameNumber === gn); if (g) s1 = g.score; }
          if (s2 === null && match.player2) { const g = games.find(g => g.cohortId === bracket.cohortId && g.playerId === match.player2!.id && g.gameNumber === gn); if (g) s2 = g.score; }

          if (s1 != null && s2 != null) {
            const t1 = calculateTotalScore(s1, match.player1.handicap, cohort.type === 'Handicap');
            const t2 = calculateTotalScore(s2, match.player2.handicap, cohort.type === 'Handicap');
            const winner = t1 >= t2 ? match.player1 : match.player2;
            const result = advanceWinner({ structure }, ri, mi, winner);
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

  const handleBlur = async (pid: string, gn: number) => {
    if (!selectedId) return;
    const val = tempScore.trim() === '' ? null : parseInt(tempScore);
    if (tempScore.trim() !== '' && (val === null || isNaN(val) || val < 0 || val > 300)) {
      Alert.alert('Error', 'Score must be 0-300');
      setEditing(null); setTempScore(''); return;
    }

    if (val != null) {
      try {
        await saveGame({ cohortId: selectedId, playerId: pid, gameNumber: gn, score: val });
        const relevant = brackets.filter(b => b.cohortId === selectedId && b.players.some(p => p.id === pid) && !b.structure.completed);
        for (const b of relevant) await processBracket(b, { playerId: pid, gameNumber: gn, score: val });
      } catch (e) {
        Alert.alert('Error', 'Failed to save score');
      }
    }
    setEditing(null); setTempScore('');
  };

  const handleSync = async () => {
    if (!selectedId) return;
    setSyncing(true);
    try {
      let updated = 0;
      for (const b of brackets.filter(b => b.cohortId === selectedId && !b.structure.completed)) {
        if (await processBracket(b)) updated++;
      }
      Alert.alert('Sync Complete', `Updated ${updated} bracket(s)`);
    } catch { Alert.alert('Error', 'Sync failed'); }
    finally { setSyncing(false); }
  };

  const renderScoreCell = (pid: string, gn: number) => {
    const relevant = isScoreRelevant(pid, gn, cohortBrackets);
    const score = getScore(pid, gn);
    const isEditing = editing?.playerId === pid && editing?.gameNumber === gn;

    if (!relevant) return <View style={styles.cellDisabled}><Text style={styles.disabledText}>-</Text></View>;
    if (isEditing) return (
      <TextInput style={styles.cellInput} value={tempScore} onChangeText={setTempScore}
        onBlur={() => handleBlur(pid, gn)} keyboardType="numeric" autoFocus placeholder="-"
        placeholderTextColor={Colors.textLight} />
    );
    return (
      <TouchableOpacity style={styles.cell} onPress={() => { setEditing({ playerId: pid, gameNumber: gn }); setTempScore(score?.toString() || ''); }}>
        <Text style={styles.cellText}>{score ?? '-'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Enter Scores" />
      <ScrollView style={styles.scroll}>
        <View style={styles.form}>
          {/* Cohort Selection */}
          <View style={styles.selectionBox}>
            <View style={styles.selCol}>
              <Text style={styles.selTitle}>Select Tournament</Text>
              <Text style={styles.selSub}>Choose a tournament to enter scores</Text>
            </View>
            <View style={styles.selCol}>
              <TouchableOpacity style={styles.dropBtn} onPress={() => setDropdown(true)}>
                <Text style={styles.dropBtnText}>{selectedCohort ? `${selectedCohort.name} (${selectedCohort.type})` : 'Select...'}</Text>
                <Text style={styles.dropArrow}>▼</Text>
              </TouchableOpacity>
              {selectedId !== '' && (
                <TouchableOpacity style={[styles.syncBtn, syncing && styles.syncBtnOff]} onPress={handleSync} disabled={syncing}>
                  {syncing ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.syncBtnText}>Update Brackets</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Dropdown Modal */}
          <Modal visible={dropdown} transparent animationType="fade" onRequestClose={() => setDropdown(false)}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDropdown(false)}>
              <View style={styles.dropModal} onStartShouldSetResponder={() => true}>
                <View style={styles.dropHeader}>
                  <Text style={styles.dropTitle}>Select Tournament</Text>
                  <TouchableOpacity onPress={() => setDropdown(false)}><Text style={styles.closeBtn}>X</Text></TouchableOpacity>
                </View>
                <ScrollView style={styles.dropList}>
                  {activeCohorts.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.dropItem, selectedId === c.id && styles.dropItemSel]}
                      onPress={() => { setSelectedId(c.id); setDropdown(false); }}>
                      <Text style={[styles.dropItemText, selectedId === c.id && styles.dropItemTextSel]}>{c.name}</Text>
                      {selectedId === c.id && <Text style={styles.dropCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Score Table */}
          {selectedId !== '' && (
            <>
              <View style={styles.tableHead}>
                <Text style={[styles.headText, styles.nameCol]}>Player</Text>
                <Text style={[styles.headText, styles.gameCol]}>Gm 1</Text>
                <Text style={[styles.headText, styles.gameCol]}>Gm 2</Text>
                <Text style={[styles.headText, styles.gameCol]}>Gm 3</Text>
              </View>

              {activePlayers.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No players</Text></View>
              ) : activePlayers.map(u => {
                const live = isPlayerLiveInCohort(u.id, cohortBrackets);
                return (
                  <View key={u.id} style={[styles.row, !live && styles.rowDim]}>
                    <View style={styles.nameCol}>
                      <Text style={styles.rowName}>{u.name}</Text>
                      <Text style={styles.rowInfo}>{live ? `Avg: ${u.average}` : 'Eliminated'}</Text>
                    </View>
                    <View style={styles.gameCol}>{renderScoreCell(u.id, 1)}</View>
                    <View style={styles.gameCol}>{renderScoreCell(u.id, 2)}</View>
                    <View style={styles.gameCol}>{renderScoreCell(u.id, 3)}</View>
                  </View>
                );
              })}
            </>
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
  selectionBox: { backgroundColor: Colors.primary, borderRadius: 12, padding: 20, marginBottom: 24, flexDirection: 'row', gap: 20 },
  selCol: { flex: 1, justifyContent: 'center' },
  selTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  selSub: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  dropBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 8, borderWidth: 2, borderColor: Colors.white, backgroundColor: Colors.white },
  dropBtnText: { fontSize: 15, color: Colors.headerDark, fontWeight: '600', flex: 1 },
  dropArrow: { fontSize: 12, color: Colors.textSecondary, marginLeft: 8 },
  syncBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.white, alignItems: 'center', marginTop: 12 },
  syncBtnOff: { opacity: 0.6 },
  syncBtnText: { color: Colors.white, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropModal: { backgroundColor: Colors.surface, borderRadius: 12, width: '90%', maxHeight: '70%' },
  dropHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  closeBtn: { fontSize: 20, color: Colors.textSecondary, fontWeight: 'bold' },
  dropList: { maxHeight: 400 },
  dropItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropItemSel: { backgroundColor: Colors.primary },
  dropItemText: { fontSize: 16, color: Colors.textPrimary },
  dropItemTextSel: { color: Colors.white },
  dropCheck: { color: Colors.white, fontWeight: 'bold' },
  tableHead: { flexDirection: 'row', backgroundColor: Colors.headerDark, padding: 12, borderRadius: 8, marginBottom: 8 },
  headText: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
  nameCol: { flex: 2 },
  gameCol: { flex: 1, alignItems: 'center' },
  row: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  rowDim: { opacity: 0.5, backgroundColor: Colors.background },
  rowName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  rowInfo: { fontSize: 12, color: Colors.textSecondary },
  cell: { minWidth: 50, paddingVertical: 8, alignItems: 'center', backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  cellDisabled: { minWidth: 50, paddingVertical: 8, alignItems: 'center', backgroundColor: Colors.border, borderRadius: 6, opacity: 0.3 },
  cellInput: { minWidth: 50, paddingVertical: 8, backgroundColor: Colors.background, borderRadius: 6, borderWidth: 2, borderColor: Colors.primary, textAlign: 'center', fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
  cellText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  disabledText: { color: Colors.textSecondary, fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary },
});
