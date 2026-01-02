import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { calculateTotalScore, advanceWinner } from '../utils/bracketLogic';
import NavigationHeader from '../components/NavigationHeader';

export default function GameEntryScreen() {
  const { cohortId: paramCohortId } = useLocalSearchParams();
  const { cohorts, users, brackets, games, saveGame, getPlayerGames, updateBracket, getCohortBrackets } = useApp();
  const [selectedCohortId, setSelectedCohortId] = useState(paramCohortId || '');
  const [editingScore, setEditingScore] = useState({ playerId: null, gameNumber: null });
  const [tempScore, setTempScore] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Update selected cohort when param changes
  useEffect(() => {
    if (paramCohortId && paramCohortId !== selectedCohortId) {
      setSelectedCohortId(paramCohortId);
    }
  }, [paramCohortId]);

  const activeCohorts = cohorts.filter(c => c.status === 'active');
  const completedCohorts = cohorts.filter(c => c.status === 'complete');
  const availableCohorts = showCompleted 
    ? [...activeCohorts, ...completedCohorts].sort((a, b) => {
        // Sort by date, most recent first
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    : activeCohorts;
  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
  
  // Get all active users in the selected cohort
  const activeUsers = React.useMemo(() => {
    if (!selectedCohortId) return [];
    
    const cohortBrackets = getCohortBrackets(selectedCohortId);
    const userIds = new Set();
    
    cohortBrackets.forEach(bracket => {
      bracket.players.forEach(player => {
        userIds.add(player.id);
      });
    });
    
    return users.filter(u => userIds.has(u.id));
  }, [selectedCohortId, brackets, users, getCohortBrackets]);

  const handleScoreChange = (playerId, gameNumber, value) => {
    setEditingScore({ playerId, gameNumber });
    setTempScore(value);
  };

  const handleScoreBlur = async (playerId, gameNumber) => {
    if (!selectedCohortId) return;
    
    const scoreValue = tempScore.trim() === '' ? null : parseInt(tempScore, 10);
    
    // Validate score if provided
    if (tempScore.trim() !== '' && (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 300)) {
      Alert.alert('Error', 'Score must be between 0 and 300');
      setEditingScore({ playerId: null, gameNumber: null });
      setTempScore('');
      return;
    }

    // Save the game if score is provided
    if (scoreValue !== null && !isNaN(scoreValue)) {
      await saveGame({
        cohortId: selectedCohortId,
        playerId: playerId,
        gameNumber: gameNumber,
        score: scoreValue,
      });

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update brackets - check all brackets for any ready matches
      await updateBracketsForPlayer(playerId, gameNumber);
    }

    setEditingScore({ playerId: null, gameNumber: null });
    setTempScore('');
  };

  const updateBracketsForPlayer = async (playerId, gameNumber) => {
    if (!selectedCohortId) return;
    
    const cohort = cohorts.find(c => c.id === selectedCohortId);
    if (!cohort) return;

    // Get latest brackets for this cohort - use current brackets from state
    const activeBrackets = brackets.filter(b => b.cohortId === selectedCohortId);
    
    // Check ALL brackets and ALL matches to see if any are ready to advance
    // This ensures winners advance even if scores were entered in different order
    for (const bracket of activeBrackets) {
      let bracketUpdated = true;
      let iterations = 0;
      const maxIterations = 10; // Safety limit to prevent infinite loops
      
      // Keep checking until no more advances are possible
      while (bracketUpdated && iterations < maxIterations) {
        iterations++;
        bracketUpdated = false;
        
        // Get fresh bracket data each iteration
        const currentBracket = brackets.find(b => b.id === bracket.id);
        if (!currentBracket) break;
        
        const updatedStructure = JSON.parse(JSON.stringify(currentBracket.structure));

        // Check each round
        for (let roundIndex = 0; roundIndex < updatedStructure.rounds.length; roundIndex++) {
          const round = updatedStructure.rounds[roundIndex];
          if (!round || !Array.isArray(round)) continue;
          
          const requiredGameNumber = roundIndex + 1; // Round 1 = Game 1, etc.

          // Check each match in the round
          for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
            const match = round[matchIndex];
            
            // Skip if match is undefined or null
            if (!match) continue;
            
            // Skip if already completed
            if (match.completed) continue;
            
            // Skip if players not set yet
            if (!match.player1 || !match.player2) continue;

            // Get both players' games for this round - use latest games from state
            const player1Games = games.filter(
              g => g.cohortId === selectedCohortId && g.playerId === match.player1.id
            ).sort((a, b) => a.gameNumber - b.gameNumber);
            const player2Games = games.filter(
              g => g.cohortId === selectedCohortId && g.playerId === match.player2.id
            ).sort((a, b) => a.gameNumber - b.gameNumber);
            
            const player1Game = player1Games.find(g => g.gameNumber === requiredGameNumber);
            const player2Game = player2Games.find(g => g.gameNumber === requiredGameNumber);
            
            const player1Score = player1Game?.score;
            const player2Score = player2Game?.score;

            // If both players have scores for this round, determine winner and advance
            if (player1Score !== undefined && player2Score !== undefined && player1Score !== null && player2Score !== null) {
              // Update scores in match
              match.player1 = {
                ...match.player1,
                score: player1Score,
                [`game${requiredGameNumber}Score`]: player1Score,
              };
              match.player2 = {
                ...match.player2,
                score: player2Score,
                [`game${requiredGameNumber}Score`]: player2Score,
              };
              
              // Calculate total scores (score + handicap if handicap type)
              const player1Total = calculateTotalScore(
                player1Score,
                match.player1?.handicap || 0,
                cohort.type === 'Handicap'
              );
              const player2Total = calculateTotalScore(
                player2Score,
                match.player2?.handicap || 0,
                cohort.type === 'Handicap'
              );

              // Determine winner
              const winner = player1Total > player2Total
                ? match.player1
                : player2Total > player1Total
                ? match.player2
                : match.player1; // Tie goes to player1

              // Advance winner
              const updatedBracket = advanceWinner(
                { structure: updatedStructure },
                roundIndex,
                matchIndex,
                winner
              );
              
              // Update the bracket structure
              Object.assign(updatedStructure, updatedBracket.structure);
              bracketUpdated = true;
              
              // Save immediately after each advancement
              await updateBracket(bracket.id, { structure: updatedStructure });
              
              // Break out of loops to restart check from beginning
              break;
            }
          }
          
          // If we advanced someone, break and restart the check
          if (bracketUpdated) break;
        }
      }
    }
  };

  const findCurrentMatch = (bracket, playerId) => {
    for (let roundIndex = 0; roundIndex < bracket.structure.rounds.length; roundIndex++) {
      const round = bracket.structure.rounds[roundIndex];
      for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
        const match = round[matchIndex];
        if (
          (match.player1?.id === playerId || match.player2?.id === playerId) &&
          !match.completed
        ) {
          return { roundIndex, matchIndex, match };
        }
      }
    }
    return null;
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
          {/* Cohort Selection Container */}
          <View style={styles.cohortSelectionContainer}>
            <View style={styles.instructionsColumn}>
              <Text style={styles.instructionsTitle}>Select Cohort</Text>
              <Text style={styles.instructionsText}>
                Choose a cohort to enter scores. Use the toggle to view completed brackets from the past.
              </Text>
            </View>
            <View style={styles.selectionsColumn}>
              {/* Dropdown Button */}
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setDropdownVisible(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedCohort 
                    ? `${selectedCohort.name} (${selectedCohort.type})`
                    : 'Select a cohort...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* Checkbox for Completed Cohorts */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowCompleted(!showCompleted)}
                  style={styles.checkboxLabelContainer}
                >
                  <Text style={styles.checkboxLabel}>
                    Show Completed Brackets
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Dropdown Modal */}
          <Modal
            visible={dropdownVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setDropdownVisible(false)}
            >
              <View style={styles.dropdownModal} onStartShouldSetResponder={() => true}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Select Cohort</Text>
                  <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.dropdownList}>
                  {availableCohorts.length === 0 ? (
                    <Text style={styles.noDataText}>No cohorts available</Text>
                  ) : (
                    availableCohorts.map((cohort) => {
                      const isCompleted = cohort.status === 'complete';
                      const createdDate = cohort.createdAt 
                        ? new Date(cohort.createdAt).toLocaleDateString()
                        : 'Unknown';
                      
                      return (
                        <TouchableOpacity
                          key={cohort.id}
                          style={[
                            styles.dropdownItem,
                            selectedCohortId === cohort.id && styles.dropdownItemSelected,
                            isCompleted && styles.dropdownItemCompleted,
                          ]}
                          onPress={() => {
                            setSelectedCohortId(cohort.id);
                            setDropdownVisible(false);
                          }}
                        >
                          <View style={styles.dropdownItemContent}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                selectedCohortId === cohort.id && styles.dropdownItemTextSelected,
                              ]}
                            >
                              {cohort.name} ({cohort.type})
                            </Text>
                            {isCompleted && (
                              <Text style={[
                                styles.dropdownItemDate,
                                selectedCohortId === cohort.id && styles.dropdownItemDateSelected
                              ]}>
                                Completed • {createdDate}
                              </Text>
                            )}
                            {!isCompleted && (
                              <Text style={[
                                styles.dropdownItemDate,
                                selectedCohortId === cohort.id && styles.dropdownItemDateSelected
                              ]}>
                                Created: {createdDate}
                              </Text>
                            )}
                          </View>
                          {selectedCohortId === cohort.id && (
                            <Text style={[
                              styles.checkmark,
                              selectedCohortId === cohort.id && styles.checkmarkSelected
                            ]}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {selectedCohortId && (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.playerNameColumn]}>Player</Text>
                <Text style={[styles.tableHeaderText, styles.gameColumn]}>Game 1</Text>
                <Text style={[styles.tableHeaderText, styles.gameColumn]}>Game 2</Text>
                <Text style={[styles.tableHeaderText, styles.gameColumn]}>Game 3</Text>
              </View>

              {activeUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active players in this cohort</Text>
                </View>
              ) : (
                activeUsers.map((user) => {
                  const game1Score = getGameScore(user.id, 1);
                  const game2Score = getGameScore(user.id, 2);
                  const game3Score = getGameScore(user.id, 3);
                  
                  const isEditingGame1 = editingScore.playerId === user.id && editingScore.gameNumber === 1;
                  const isEditingGame2 = editingScore.playerId === user.id && editingScore.gameNumber === 2;
                  const isEditingGame3 = editingScore.playerId === user.id && editingScore.gameNumber === 3;

                  return (
                    <View key={user.id} style={styles.playerRow}>
                      <View style={styles.playerNameColumn}>
                        <Text style={styles.playerName}>{user.name}</Text>
                        <Text style={styles.playerInfo}>
                          Avg: {user.average} | Hdcp: {user.handicap}
                        </Text>
                      </View>
                      
                      <View style={styles.gameColumn}>
                        {isEditingGame1 ? (
                          <TextInput
                            style={styles.scoreInput}
                            value={tempScore}
                            onChangeText={setTempScore}
                            onBlur={() => handleScoreBlur(user.id, 1)}
                            keyboardType="numeric"
                            autoFocus
                            placeholder="0"
                            placeholderTextColor={Colors.textLight}
                          />
                        ) : (
                          <TouchableOpacity
                            style={styles.scoreCell}
                            onPress={() => handleScoreChange(user.id, 1, game1Score?.toString() || '')}
                          >
                            <Text style={styles.scoreText}>
                              {game1Score !== undefined && game1Score !== null ? game1Score : '-'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={styles.gameColumn}>
                        {isEditingGame2 ? (
                          <TextInput
                            style={styles.scoreInput}
                            value={tempScore}
                            onChangeText={setTempScore}
                            onBlur={() => handleScoreBlur(user.id, 2)}
                            keyboardType="numeric"
                            autoFocus
                            placeholder="0"
                            placeholderTextColor={Colors.textLight}
                          />
                        ) : (
                          <TouchableOpacity
                            style={styles.scoreCell}
                            onPress={() => handleScoreChange(user.id, 2, game2Score?.toString() || '')}
                          >
                            <Text style={styles.scoreText}>
                              {game2Score !== undefined && game2Score !== null ? game2Score : '-'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={styles.gameColumn}>
                        {isEditingGame3 ? (
                          <TextInput
                            style={styles.scoreInput}
                            value={tempScore}
                            onChangeText={setTempScore}
                            onBlur={() => handleScoreBlur(user.id, 3)}
                            keyboardType="numeric"
                            autoFocus
                            placeholder="0"
                            placeholderTextColor={Colors.textLight}
                          />
                        ) : (
                          <TouchableOpacity
                            style={styles.scoreCell}
                            onPress={() => handleScoreChange(user.id, 3, game3Score?.toString() || '')}
                          >
                            <Text style={styles.scoreText}>
                              {game3Score !== undefined && game3Score !== null ? game3Score : '-'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {selectedCohort && selectedCohort.type === 'Handicap' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Note: Handicap scores are calculated automatically (Score + Handicap)
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  cohortSelectionContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 20,
  },
  instructionsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: 20,
  },
  selectionsColumn: {
    flex: 1,
    gap: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.white,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 24,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primary,
  },
  dropdownItemCompleted: {
    opacity: 0.8,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dropdownItemTextSelected: {
    color: Colors.white,
  },
  dropdownItemDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dropdownItemDateSelected: {
    color: Colors.white,
    opacity: 0.9,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  checkmarkSelected: {
    color: Colors.white,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.headerDark,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.white,
  },
  playerNameColumn: {
    flex: 2,
  },
  gameColumn: {
    flex: 1,
    alignItems: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  playerInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scoreCell: {
    minWidth: 60,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreInput: {
    minWidth: 60,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
