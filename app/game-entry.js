import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { calculateTotalScore, advanceWinner, isPlayerLiveInCohort, isScoreRelevant } from '../utils/bracketLogic';
import NavigationHeader from '../components/NavigationHeader';

export default function GameEntryScreen() {
  const { cohortId: paramCohortId } = useLocalSearchParams();
  const { cohorts, users, brackets, games, saveGame, getPlayerGames, updateBracket, getCohortBrackets } = useApp();
  const [selectedCohortId, setSelectedCohortId] = useState(paramCohortId || '');
  const [editingScore, setEditingScore] = useState({ playerId: null, gameNumber: null });
  const [tempScore, setTempScore] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (paramCohortId && paramCohortId !== selectedCohortId) {
      setSelectedCohortId(paramCohortId);
    }
  }, [paramCohortId]);

  const activeCohorts = cohorts.filter(c => c.status === 'active');
  const completedCohorts = cohorts.filter(c => c.status === 'complete');
  const availableCohorts = showCompleted 
    ? [...activeCohorts, ...completedCohorts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : activeCohorts;
  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
  
  const activeBrackets = useMemo(() => {
    if (!selectedCohortId) return [];
    return getCohortBrackets(selectedCohortId);
  }, [selectedCohortId, getCohortBrackets, brackets]);

  const activeUsers = useMemo(() => {
    if (!selectedCohortId) return [];
    
    const userIds = new Set();
    activeBrackets.forEach(bracket => {
      bracket.players.forEach(player => userIds.add(player.id));
    });
    
    const players = users.filter(u => userIds.has(u.id));

    return players.sort((a, b) => {
       const aLive = isPlayerLiveInCohort(a.id, activeBrackets);
       const bLive = isPlayerLiveInCohort(b.id, activeBrackets);
       
       if (aLive && !bLive) return -1;
       if (!aLive && bLive) return 1;
       return a.name.localeCompare(b.name);
    });
  }, [selectedCohortId, activeBrackets, users]);

  const handleScoreChange = (playerId, gameNumber, value) => {
    setEditingScore({ playerId, gameNumber });
    setTempScore(value);
  };

  const handleScoreBlur = async (playerId, gameNumber) => {
    if (!selectedCohortId) return;
    
    const scoreValue = tempScore.trim() === '' ? null : parseInt(tempScore, 10);
    
    if (tempScore.trim() !== '' && (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 300)) {
      Alert.alert('Error', 'Score must be between 0 and 300');
      setEditingScore({ playerId: null, gameNumber: null });
      setTempScore('');
      return;
    }

    if (scoreValue !== null && !isNaN(scoreValue)) {
      try {
        // 1. Save to DB
        await saveGame({
          cohortId: selectedCohortId,
          playerId: playerId,
          gameNumber: gameNumber,
          score: scoreValue,
        });

        // 2. IMMEDIATE UPDATE: Pass the new score specifically
        // This triggers the bracket update > which triggers the Payout creation in AppContext
        await updateBracketsForPlayer(playerId, gameNumber, scoreValue);
        
      } catch (error) {
        console.error("Error saving game/updating bracket:", error);
        Alert.alert("Error", "Failed to update scores. Please try again.");
      }
    }

    setEditingScore({ playerId: null, gameNumber: null });
    setTempScore('');
  };

  // --- MANUAL SYNC BUTTON FUNCTION ---
  const handleForceSync = async () => {
    if (!selectedCohortId) return;
    setIsSyncing(true);
    try {
      const currentCohortBrackets = brackets.filter(b => b.cohortId === selectedCohortId);
      let updatesCount = 0;

      for (const bracket of currentCohortBrackets) {
         if (bracket.structure.completed) continue;
         
         const updated = await processSingleBracket(bracket, null); 
         if (updated) updatesCount++;
      }
      
      Alert.alert("Sync Complete", `Checked all brackets. Updated ${updatesCount} bracket(s).`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to sync brackets.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper: Process a single bracket to see if we can advance anyone
  const processSingleBracket = async (bracket, manualScoreOverride) => {
    const cohort = cohorts.find(c => c.id === bracket.cohortId);
    if (!cohort) return false;

    const freshBracket = brackets.find(b => b.id === bracket.id) || bracket;
    const updatedStructure = JSON.parse(JSON.stringify(freshBracket.structure));
    let structureChanged = false;

    // Loop through rounds (checking up to 5 times for cascading wins)
    for (let loop = 0; loop < 5; loop++) {
      let loopChanged = false;

      for (let roundIndex = 0; roundIndex < updatedStructure.rounds.length; roundIndex++) {
        const round = updatedStructure.rounds[roundIndex];
        const requiredGameNumber = roundIndex + 1;

        for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
          const match = round[matchIndex];
          if (!match || match.completed || !match.player1 || !match.player2) continue;

          // --- SCORE LOOKUP ---
          let p1Score = null;
          let p2Score = null;

          if (manualScoreOverride && manualScoreOverride.gameNumber === requiredGameNumber) {
            if (manualScoreOverride.playerId === match.player1.id) p1Score = manualScoreOverride.score;
            if (manualScoreOverride.playerId === match.player2.id) p2Score = manualScoreOverride.score;
          }

          if (p1Score === null) {
            const g = games.find(g => g.cohortId === bracket.cohortId && g.playerId === match.player1.id && g.gameNumber === requiredGameNumber);
            if (g) p1Score = g.score;
          }
          if (p2Score === null) {
            const g = games.find(g => g.cohortId === bracket.cohortId && g.playerId === match.player2.id && g.gameNumber === requiredGameNumber);
            if (g) p2Score = g.score;
          }

          // --- EVALUATE ---
          if (p1Score != null && p2Score != null) {
            match.player1.score = p1Score;
            match.player2.score = p2Score;
            
            const p1Total = calculateTotalScore(p1Score, match.player1.handicap, cohort.type === 'Handicap');
            const p2Total = calculateTotalScore(p2Score, match.player2.handicap, cohort.type === 'Handicap');

            const winner = p1Total > p2Total ? match.player1 : (p2Total > p1Total ? match.player2 : match.player1);

            const advancedResult = advanceWinner(
              { structure: updatedStructure },
              roundIndex,
              matchIndex,
              winner
            );
            
            Object.assign(updatedStructure, advancedResult.structure);
            structureChanged = true;
            loopChanged = true;
          }
        }
      }
      if (!loopChanged) break; 
    }

    if (structureChanged) {
      // This update triggers the context to check for completion and generate payouts
      await updateBracket(bracket.id, { structure: updatedStructure });
      return true;
    }
    return false;
  };

  const updateBracketsForPlayer = async (playerId, gameNumber, newScore) => {
    if (!selectedCohortId) return;
    
    const currentCohortBrackets = brackets.filter(b => b.cohortId === selectedCohortId);
    const relevantBrackets = currentCohortBrackets.filter(b => 
      b.players.some(p => p.id === playerId)
    );

    for (const bracket of relevantBrackets) {
      if (bracket.structure.completed) continue;
      await processSingleBracket(bracket, { playerId, gameNumber, score: newScore });
    }
  };

  const getGameScore = (playerId, gameNumber) => {
    if (!selectedCohortId) return null;
    const playerGames = getPlayerGames(selectedCohortId, playerId);
    const game = playerGames.find(g => g.gameNumber === gameNumber);
    return game?.score;
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Enter Game Scores" />

      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.cohortSelectionContainer}>
            <View style={styles.instructionsColumn}>
              <Text style={styles.instructionsTitle}>Select Cohort</Text>
              <Text style={styles.instructionsText}>
                Choose a cohort to enter scores.
              </Text>
            </View>
            <View style={styles.selectionsColumn}>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
                <Text style={styles.dropdownButtonText}>{selectedCohort ? `${selectedCohort.name} (${selectedCohort.type})` : 'Select a cohort...'}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              
              {selectedCohortId && (
                <TouchableOpacity 
                  style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]} 
                  onPress={handleForceSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.syncButtonText}>🔄 Update Brackets</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Modal visible={dropdownVisible} transparent={true} animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
             <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
               <View style={styles.dropdownModal} onStartShouldSetResponder={() => true}>
                 <View style={styles.dropdownHeader}>
                   <Text style={styles.dropdownTitle}>Select Cohort</Text>
                   <TouchableOpacity onPress={() => setDropdownVisible(false)}><Text style={styles.closeButton}>✕</Text></TouchableOpacity>
                 </View>
                 <ScrollView style={styles.dropdownList}>
                   {availableCohorts.map((cohort) => (
                     <TouchableOpacity key={cohort.id} style={[styles.dropdownItem, selectedCohortId === cohort.id && styles.dropdownItemSelected]} onPress={() => { setSelectedCohortId(cohort.id); setDropdownVisible(false); }}>
                       <Text style={[styles.dropdownItemText, selectedCohortId === cohort.id && styles.dropdownItemTextSelected]}>{cohort.name}</Text>
                       {selectedCohortId === cohort.id && <Text style={styles.checkmarkSelected}>✓</Text>}
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
               </View>
             </TouchableOpacity>
          </Modal>

          {selectedCohortId && (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.playerNameColumn]}>Player</Text>
                <Text style={[styles.tableHeaderText, styles.gameColumn]}>Gm 1</Text>
                <Text style={[styles.tableHeaderText, styles.gameColumn]}>Gm 2</Text>
                <Text style={[styles.tableHeaderText, styles.gameColumn]}>Gm 3</Text>
              </View>

              {activeUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active players</Text>
                </View>
              ) : (
                activeUsers.map((user) => {
                  const isLive = isPlayerLiveInCohort(user.id, activeBrackets);
                  
                  const isGame1Relevant = isScoreRelevant(user.id, 1, activeBrackets);
                  const isGame2Relevant = isScoreRelevant(user.id, 2, activeBrackets);
                  const isGame3Relevant = isScoreRelevant(user.id, 3, activeBrackets);

                  const game1Score = getGameScore(user.id, 1);
                  const game2Score = getGameScore(user.id, 2);
                  const game3Score = getGameScore(user.id, 3);
                  
                  const isEditingGame1 = editingScore.playerId === user.id && editingScore.gameNumber === 1;
                  const isEditingGame2 = editingScore.playerId === user.id && editingScore.gameNumber === 2;
                  const isEditingGame3 = editingScore.playerId === user.id && editingScore.gameNumber === 3;

                  return (
                    <View key={user.id} style={[styles.playerRow, !isLive && styles.playerRowEliminated]}>
                      <View style={styles.playerNameColumn}>
                        <Text style={styles.playerName}>{user.name}</Text>
                        <Text style={styles.playerInfo}>{isLive ? `Avg: ${user.average}` : 'Eliminated'}</Text>
                      </View>
                      
                      {/* GAME 1 */}
                      <View style={styles.gameColumn}>
                        {!isGame1Relevant ? <View style={styles.scoreCellDisabled}><Text style={styles.disabledText}>-</Text></View> : 
                         isEditingGame1 ? 
                          <TextInput style={styles.scoreInput} value={tempScore} onChangeText={setTempScore} onBlur={() => handleScoreBlur(user.id, 1)} keyboardType="numeric" autoFocus placeholder="-" /> :
                          <TouchableOpacity style={styles.scoreCell} onPress={() => handleScoreChange(user.id, 1, game1Score?.toString() || '')}>
                            <Text style={styles.scoreText}>{game1Score ?? '-'}</Text>
                          </TouchableOpacity>
                        }
                      </View>
                      
                      {/* GAME 2 */}
                      <View style={styles.gameColumn}>
                        {!isGame2Relevant ? <View style={styles.scoreCellDisabled}><Text style={styles.disabledText}>-</Text></View> : 
                         isEditingGame2 ? 
                          <TextInput style={styles.scoreInput} value={tempScore} onChangeText={setTempScore} onBlur={() => handleScoreBlur(user.id, 2)} keyboardType="numeric" autoFocus placeholder="-" /> :
                          <TouchableOpacity style={styles.scoreCell} onPress={() => handleScoreChange(user.id, 2, game2Score?.toString() || '')}>
                            <Text style={styles.scoreText}>{game2Score ?? '-'}</Text>
                          </TouchableOpacity>
                        }
                      </View>
                      
                      {/* GAME 3 */}
                      <View style={styles.gameColumn}>
                        {!isGame3Relevant ? <View style={styles.scoreCellDisabled}><Text style={styles.disabledText}>-</Text></View> : 
                         isEditingGame3 ? 
                          <TextInput style={styles.scoreInput} value={tempScore} onChangeText={setTempScore} onBlur={() => handleScoreBlur(user.id, 3)} keyboardType="numeric" autoFocus placeholder="-" /> :
                          <TouchableOpacity style={styles.scoreCell} onPress={() => handleScoreChange(user.id, 3, game3Score?.toString() || '')}>
                            <Text style={styles.scoreText}>{game3Score ?? '-'}</Text>
                          </TouchableOpacity>
                        }
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  form: { padding: 16 },
  cohortSelectionContainer: { backgroundColor: Colors.primary, borderRadius: 12, padding: 20, marginBottom: 24, flexDirection: 'row', gap: 20 },
  instructionsColumn: { flex: 1, justifyContent: 'center' },
  instructionsTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  instructionsText: { fontSize: 14, color: Colors.white, opacity: 0.9, lineHeight: 20 },
  selectionsColumn: { flex: 1, gap: 12 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 8, borderWidth: 2, borderColor: Colors.white, backgroundColor: Colors.white },
  dropdownButtonText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600', flex: 1 },
  dropdownArrow: { fontSize: 12, color: Colors.textSecondary, marginLeft: 8 },
  
  syncButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.white, alignItems: 'center' },
  syncButtonDisabled: { opacity: 0.6 },
  syncButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModal: { backgroundColor: Colors.surface, borderRadius: 12, width: '90%', maxHeight: '70%' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  closeButton: { fontSize: 24, color: Colors.textSecondary },
  dropdownList: { maxHeight: 400 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemSelected: { backgroundColor: Colors.primary },
  dropdownItemText: { fontSize: 16, color: Colors.textPrimary },
  dropdownItemTextSelected: { color: Colors.white },
  checkmarkSelected: { color: Colors.white, fontWeight: 'bold' },
  
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.headerDark, padding: 12, borderRadius: 8, marginBottom: 8 },
  tableHeaderText: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
  playerNameColumn: { flex: 2 },
  gameColumn: { flex: 1, alignItems: 'center' },
  
  playerRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  playerRowEliminated: { opacity: 0.5, backgroundColor: Colors.background, borderColor: Colors.border },
  playerName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  playerInfo: { fontSize: 12, color: Colors.textSecondary },
  scoreCell: { minWidth: 50, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  scoreCellDisabled: { minWidth: 50, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.border, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, opacity: 0.3 },
  scoreInput: { minWidth: 50, paddingVertical: 8, backgroundColor: Colors.background, borderRadius: 6, borderWidth: 2, borderColor: Colors.primary, textAlign: 'center', fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
  scoreText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  disabledText: { color: Colors.textSecondary, fontWeight: 'bold' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary },
});