import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { calculateTotalScore, advanceWinner, isPlayerLiveInCohort, isScoreRelevant } from '../utils/bracketLogic';
import NavigationHeader from '../components/NavigationHeader';

const { width } = Dimensions.get('window');

// --- Celebration Modal Component ---
const CelebrationModal = ({ visible, winnerName, bracketNumber, onClose }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleValue.setValue(0);
      opacityValue.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none">
      <View style={styles.celebrationOverlay}>
        <Animated.View 
          style={[
            styles.celebrationCard, 
            { transform: [{ scale: scaleValue }], opacity: opacityValue }
          ]}
        >
          <Text style={styles.celebrationEmoji}>🏆</Text>
          <Text style={styles.celebrationTitle}>WINNER!</Text>
          <Text style={styles.celebrationText}>
            <Text style={styles.winnerHighlight}>{winnerName}</Text>
          </Text>
          <Text style={styles.celebrationSub}>
            Champion of Bracket #{bracketNumber}
          </Text>
          <TouchableOpacity style={styles.celebrationBtn} onPress={onClose}>
            <Text style={styles.celebrationBtnText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function GameEntryScreen() {
  const { cohortId: paramCohortId } = useLocalSearchParams();
  const { cohorts, users, brackets, games, saveGame, getPlayerGames, updateBracket, getCohortBrackets } = useApp();
  const [selectedCohortId, setSelectedCohortId] = useState(paramCohortId || '');
  const [editingScore, setEditingScore] = useState({ playerId: null, gameNumber: null });
  const [tempScore, setTempScore] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  // Celebration State
  const [celebrationData, setCelebrationData] = useState(null);

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
        await saveGame({
          cohortId: selectedCohortId,
          playerId: playerId,
          gameNumber: gameNumber,
          score: scoreValue,
        });

        await new Promise(resolve => setTimeout(resolve, 50));
        await updateBracketsForPlayer(playerId, gameNumber);
      } catch (error) {
        console.error("Error saving game/updating bracket:", error);
        Alert.alert("Error", "Failed to update scores. Please try again.");
      }
    }

    setEditingScore({ playerId: null, gameNumber: null });
    setTempScore('');
  };

  const updateBracketsForPlayer = async (playerId, gameNumber) => {
    if (!selectedCohortId) return;
    
    const cohort = cohorts.find(c => c.id === selectedCohortId);
    if (!cohort) return;

    const currentCohortBrackets = brackets.filter(b => b.cohortId === selectedCohortId);
    
    for (const bracket of currentCohortBrackets) {
      // Don't process already completed brackets unless we are correcting scores
      // but logic handles 'completed' flag inside matches anyway.
      
      let bracketUpdated = true;
      let iterations = 0;
      
      while (bracketUpdated && iterations < 5) {
        iterations++;
        bracketUpdated = false;
        
        // Fetch fresh bracket state
        const currentBracket = brackets.find(b => b.id === bracket.id);
        if (!currentBracket) break;
        
        // If already completed, skip processing to avoid re-triggering win
        if (currentBracket.structure.completed) continue;
        
        const updatedStructure = JSON.parse(JSON.stringify(currentBracket.structure));
        let justCompleted = false;
        let winnerName = "";

        for (let roundIndex = 0; roundIndex < updatedStructure.rounds.length; roundIndex++) {
          const round = updatedStructure.rounds[roundIndex];
          if (!round) continue;
          
          const requiredGameNumber = roundIndex + 1;

          for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
            const match = round[matchIndex];
            if (!match || match.completed || !match.player1 || !match.player2) continue;

            // Fetch scores
            const player1Games = games.filter(g => g.cohortId === selectedCohortId && g.playerId === match.player1.id);
            const player2Games = games.filter(g => g.cohortId === selectedCohortId && g.playerId === match.player2.id);
            
            const player1Game = player1Games.find(g => g.gameNumber === requiredGameNumber);
            const player2Game = player2Games.find(g => g.gameNumber === requiredGameNumber);
            
            const p1Score = player1Game?.score;
            const p2Score = player2Game?.score;

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
              bracketUpdated = true;
              
              // Check if this move completed the tournament
              if (updatedStructure.completed && updatedStructure.winner) {
                justCompleted = true;
                winnerName = updatedStructure.winner.name;
              }
              
              await updateBracket(bracket.id, { structure: updatedStructure });
              
              if (justCompleted) {
                 setCelebrationData({
                   winnerName: winnerName,
                   bracketNumber: bracket.bracketNumber
                 });
              }
              break; 
            }
          }
          if (bracketUpdated) break;
        }
      }
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

      {/* Celebration Modal */}
      <CelebrationModal 
        visible={!!celebrationData} 
        winnerName={celebrationData?.winnerName}
        bracketNumber={celebrationData?.bracketNumber}
        onClose={() => setCelebrationData(null)}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.cohortSelectionContainer}>
            <View style={styles.instructionsColumn}>
              <Text style={styles.instructionsTitle}>Select Cohort</Text>
              <Text style={styles.instructionsText}>
                Choose a cohort to enter scores. Use the toggle to view completed brackets.
              </Text>
            </View>
            <View style={styles.selectionsColumn}>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
                <Text style={styles.dropdownButtonText}>{selectedCohort ? `${selectedCohort.name} (${selectedCohort.type})` : 'Select a cohort...'}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity style={styles.checkbox} onPress={() => setShowCompleted(!showCompleted)}>
                  {showCompleted && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>Show Completed</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Modal Dropdown Logic... (Same as before) */}
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
                  
                  // Relevance checks
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
  // ... (previous styles)
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
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  checkmark: { fontSize: 16, color: Colors.primary, fontWeight: 'bold' },
  checkboxLabelContainer: { flex: 1 },
  checkboxLabel: { fontSize: 14, color: Colors.white, fontWeight: '600' },
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

  // Celebration Modal Styles
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    backgroundColor: Colors.surface,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: width * 0.8,
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  celebrationEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  celebrationText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  winnerHighlight: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 20,
  },
  celebrationSub: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 24,
    marginTop: 8,
  },
  celebrationBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  celebrationBtnText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});