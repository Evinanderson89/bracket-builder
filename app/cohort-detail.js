import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

export default function CohortDetailScreen() {
  const router = useRouter();
  const { cohortId } = useLocalSearchParams();
  const { cohorts, getCohortBrackets, users, deployCohort, updateCohort } = useApp();
  
  const [editingMode, setEditingMode] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const cohort = cohorts.find(c => c.id === cohortId);
  const brackets = cohort ? getCohortBrackets(cohortId) : [];
  const selectedUserIds = cohort?.selectedUserIds || [];
  
  // Calculate potential bracket count
  const totalPlayerInstances = selectedUserIds.reduce((sum, uid) => {
    const count = cohort?.userBracketCounts?.[uid] || users.find(u => u.id === uid)?.numBrackets || 1;
    return sum + count;
  }, 0);
  const bracketsToGenerate = Math.floor(totalPlayerInstances / 8);

  const filteredUsers = useMemo(() => {
    if (!playerSearch) return users;
    return users.filter(u => u.name.toLowerCase().includes(playerSearch.toLowerCase()));
  }, [users, playerSearch]);

  const toggleUserSelection = (userId) => {
    const isSelected = selectedUserIds.includes(userId);
    let newSelectedIds;
    let newBracketCounts = { ...cohort.userBracketCounts };

    if (isSelected) {
      newSelectedIds = selectedUserIds.filter(id => id !== userId);
      delete newBracketCounts[userId];
    } else {
      newSelectedIds = [...selectedUserIds, userId];
      // Default to 1 bracket when adding
      const user = users.find(u => u.id === userId);
      newBracketCounts[userId] = user?.numBrackets || 1;
    }

    updateCohort(cohortId, {
      selectedUserIds: newSelectedIds,
      userBracketCounts: newBracketCounts,
    });
  };

  const updateBracketCount = (userId, increment) => {
    const currentCount = cohort.userBracketCounts?.[userId] || 1;
    const newCount = currentCount + increment;
    
    if (newCount < 1) return;

    updateCohort(cohortId, {
      userBracketCounts: {
        ...cohort.userBracketCounts,
        [userId]: newCount
      }
    });
  };

  const handleDeploy = async () => {
    if (bracketsToGenerate < 1) {
      Alert.alert('Not Enough Players', `You need at least 8 player spots to form a bracket. Currently have ${totalPlayerInstances}.`);
      return;
    }
    
    try {
      await deployCohort(cohortId, users.filter(u => selectedUserIds.includes(u.id)), cohort.userBracketCounts);
      Alert.alert('Success', 'Tournament brackets generated!');
      setEditingMode(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (!cohort) return null;

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={cohort.name} />
      
      {/* Dashboard Header */}
      <View style={styles.dashboard}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{selectedUserIds.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{bracketsToGenerate}</Text>
          <Text style={styles.statLabel}>Est. Brackets</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{brackets.length}</Text>
          <Text style={styles.statLabel}>Active Brackets</Text>
        </View>
      </View>

      {/* Main Action Bar */}
      {cohort.status === CohortStatus.NOT_DEPLOYED && (
        <View style={styles.actionBar}>
           {!editingMode ? (
             <>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setEditingMode(true)}>
                  <Text style={styles.primaryButtonText}>Select Players</Text>
                </TouchableOpacity>
                {bracketsToGenerate > 0 && (
                  <TouchableOpacity style={styles.deployButton} onPress={handleDeploy}>
                    <Text style={styles.deployButtonText}>Deploy Tournament ({bracketsToGenerate} Brackets)</Text>
                  </TouchableOpacity>
                )}
             </>
           ) : (
             <TouchableOpacity style={styles.doneButton} onPress={() => setEditingMode(false)}>
               <Text style={styles.doneButtonText}>Done Selecting</Text>
             </TouchableOpacity>
           )}
        </View>
      )}

      <ScrollView style={styles.content}>
        
        {/* PLAYER SELECTION MODE */}
        {editingMode && cohort.status === CohortStatus.NOT_DEPLOYED && (
          <View style={styles.selectionContainer}>
            <TextInput 
              style={styles.searchInput}
              placeholder="Search players..."
              placeholderTextColor={Colors.textLight}
              value={playerSearch}
              onChangeText={setPlayerSearch}
            />
            {filteredUsers.map(user => {
              const isSelected = selectedUserIds.includes(user.id);
              const bracketCount = cohort.userBracketCounts?.[user.id] || 1;
              
              return (
                <View key={user.id} style={[styles.playerRow, isSelected && styles.playerRowSelected]}>
                  <TouchableOpacity 
                    style={styles.playerCheckArea} 
                    onPress={() => toggleUserSelection(user.id)}
                  >
                    <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                       {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View>
                      <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>{user.name}</Text>
                      <Text style={styles.playerDetails}>Avg: {user.average} • Hdcp: {user.handicap}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {isSelected && (
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => updateBracketCount(user.id, -1)} style={styles.stepBtn}>
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.countContainer}>
                         <Text style={styles.countText}>{bracketCount}</Text>
                         <Text style={styles.countLabel}>Brackets</Text>
                      </View>
                      <TouchableOpacity onPress={() => updateBracketCount(user.id, 1)} style={styles.stepBtn}>
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
             <View style={{height: 100}} />
          </View>
        )}

        {/* BRACKET DISPLAY MODE */}
        {!editingMode && (
          <View style={styles.bracketsList}>
            {brackets.length === 0 ? (
              <View style={styles.emptyBrackets}>
                 <Text style={styles.infoText}>
                   {cohort.status === CohortStatus.NOT_DEPLOYED 
                     ? "Ready to setup? Tap 'Select Players' above." 
                     : "No brackets generated."}
                 </Text>
              </View>
            ) : (
              brackets.map((bracket) => (
                <TouchableOpacity
                  key={bracket.id}
                  style={styles.bracketCard}
                  onPress={() => router.push({
                    pathname: '/bracket-edit',
                    params: { bracketId: bracket.id, cohortId: cohort.id },
                  })}
                >
                  <View style={styles.bracketCardHeader}>
                    <Text style={styles.bracketTitle}>Bracket #{bracket.bracketNumber}</Text>
                    {bracket.structure.completed ? (
                      <View style={styles.badgeComplete}><Text style={styles.badgeText}>Completed</Text></View>
                    ) : (
                      <View style={styles.badgeActive}><Text style={styles.badgeText}>In Progress</Text></View>
                    )}
                  </View>
                  <Text style={styles.bracketSubtitle}>
                    {bracket.players.length} Players • {bracket.players.map(p => p.name).slice(0, 3).join(', ')}...
                  </Text>
                  {bracket.structure.winner && (
                    <View style={styles.winnerBanner}>
                      <Text style={styles.winnerText}>🏆 Won by {bracket.structure.winner.name}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dashboard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  actionBar: {
    padding: 16,
    flexDirection: 'column',
    gap: 12,
    backgroundColor: Colors.surfaceSecondary,
  },
  primaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  deployButton: {
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deployButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  
  // Selection
  selectionContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    color: Colors.white,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerRow: {
    backgroundColor: Colors.surface,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'column', // Changed to column to accommodate stepper
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerRowSelected: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  playerCheckArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textLight,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  playerNameSelected: {
    color: Colors.success,
  },
  playerDetails: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: -2,
  },
  countContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    width: 80,
  },
  countText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  countLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  
  // Brackets List
  bracketsList: {
    padding: 16,
  },
  emptyBrackets: {
    alignItems: 'center',
    padding: 40,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  bracketCard: {
    backgroundColor: Colors.surface,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 3,
  },
  bracketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bracketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  badgeActive: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeComplete: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  bracketSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  winnerBanner: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  winnerText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
});