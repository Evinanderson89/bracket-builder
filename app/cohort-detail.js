import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

export default function CohortDetailScreen() {
  const router = useRouter();
  const { cohortId } = useLocalSearchParams();
  const { cohorts, getCohortBrackets, users, deployCohort, updateCohort, updateUser } = useApp();
  const [editingUsers, setEditingUsers] = useState(false);
  const [bracketCountInputs, setBracketCountInputs] = useState({});

  const cohort = cohorts.find(c => c.id === cohortId);
  const brackets = cohort ? getCohortBrackets(cohortId) : [];
  const selectedUserIds = cohort?.selectedUserIds || [];
  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
  const userBracketCounts = cohort?.userBracketCounts || {};

  const handleToggleUser = (userId) => {
    if (!cohort) return;
    
    const newSelectedIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter(id => id !== userId)
      : [...selectedUserIds, userId];
    
    // Initialize bracket count to user's default when adding
    const newBracketCounts = { ...userBracketCounts };
    if (!selectedUserIds.includes(userId) && !newBracketCounts[userId]) {
      const user = users.find(u => u.id === userId);
      const defaultCount = user?.numBrackets || 1;
      newBracketCounts[userId] = defaultCount;
      // Initialize input value
      setBracketCountInputs(prev => ({
        ...prev,
        [userId]: defaultCount.toString(),
      }));
    }
    
    // Remove bracket count when removing user
    if (selectedUserIds.includes(userId)) {
      delete newBracketCounts[userId];
      setBracketCountInputs(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }
    
    updateCohort(cohortId, { 
      selectedUserIds: newSelectedIds,
      userBracketCounts: newBracketCounts,
    });
  };

  const handleBracketCountChange = (userId, value) => {
    setBracketCountInputs(prev => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handleBracketCountBlur = (userId) => {
    if (!cohort) return;
    
    const value = bracketCountInputs[userId];
    if (!value || value.trim() === '') {
      // Reset to current value if empty
      const user = users.find(u => u.id === userId);
      const currentCount = userBracketCounts[userId] || user?.numBrackets || 1;
      setBracketCountInputs(prev => ({
        ...prev,
        [userId]: currentCount.toString(),
      }));
      return;
    }
    
    const count = parseInt(value, 10);
    if (isNaN(count) || count < 1) {
      Alert.alert('Error', 'Number of brackets must be at least 1');
      // Reset to current value
      const user = users.find(u => u.id === userId);
      const currentCount = userBracketCounts[userId] || user?.numBrackets || 1;
      setBracketCountInputs(prev => ({
        ...prev,
        [userId]: currentCount.toString(),
      }));
      return;
    }

    const newBracketCounts = { ...userBracketCounts };
    newBracketCounts[userId] = count;
    
    updateCohort(cohortId, { userBracketCounts: newBracketCounts });
  };

  const handleDeploy = async () => {
    if (!cohort) return;

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user before deploying');
      return;
    }

    // Check if we have enough players after expanding by numBrackets
    const totalPlayerInstances = selectedUsers.reduce((sum, user) => {
      const numBrackets = userBracketCounts[user.id] || user.numBrackets || 1;
      return sum + numBrackets;
    }, 0);
    const bracketsPossible = Math.floor(totalPlayerInstances / 8);
    
    if (bracketsPossible < 1) {
      Alert.alert(
        'Error',
        `Need at least 8 player instances (players × brackets) to create at least one bracket. Currently have ${totalPlayerInstances} instances.`
      );
      return;
    }

    try {
      await deployCohort(cohortId, selectedUsers, userBracketCounts);
      Alert.alert('Success', 'Tournament deployed successfully!');
      setEditingUsers(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to deploy tournament');
    }
  };

  if (!cohort) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cohort not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canDeploy = cohort.status === CohortStatus.NOT_DEPLOYED && selectedUsers.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={cohort.name} />

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>Type: {cohort.type}</Text>
        <Text style={styles.infoText}>Status: {cohort.status}</Text>
        <Text style={styles.infoText}>Brackets: {brackets.length}</Text>
        <Text style={styles.infoText}>Selected Players: {selectedUsers.length}</Text>
      </View>

      {cohort.status === CohortStatus.NOT_DEPLOYED && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, editingUsers && styles.actionButtonActive]}
            onPress={() => setEditingUsers(!editingUsers)}
          >
            <Text style={styles.actionButtonText}>
              {editingUsers ? 'Done Editing' : 'Edit Players'}
            </Text>
          </TouchableOpacity>
          {canDeploy && (
            <TouchableOpacity
              style={styles.deployButton}
              onPress={handleDeploy}
            >
              <Text style={styles.deployButtonText}>Deploy Tournament</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {editingUsers && cohort.status === CohortStatus.NOT_DEPLOYED && (
          <View style={styles.userSelectionSection}>
            <Text style={styles.sectionTitle}>Select Players for This Cohort</Text>
            {users.length === 0 ? (
              <Text style={styles.emptyText}>No players registered yet. Register players first.</Text>
            ) : (
              users.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const bracketCount = userBracketCounts[user.id] || user.numBrackets || 1;
                const inputValue = bracketCountInputs[user.id] !== undefined 
                  ? bracketCountInputs[user.id] 
                  : bracketCount.toString();
                
                return (
                  <View key={user.id} style={styles.userCardWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.userCard,
                        isSelected && styles.userCardSelected,
                      ]}
                      onPress={() => handleToggleUser(user.id)}
                    >
                      <View style={styles.userCardContent}>
                        <Text style={[styles.userName, isSelected && styles.userNameSelected]}>
                          {user.name}
                        </Text>
                        <Text style={styles.userInfo}>
                          Avg: {user.average} | Handicap: {user.handicap}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {isSelected && (
                      <View style={styles.bracketCountSection}>
                        <Text style={styles.bracketCountLabel}>Number of Brackets:</Text>
                        <TextInput
                          style={styles.bracketCountInput}
                          value={inputValue}
                          onChangeText={(value) => handleBracketCountChange(user.id, value)}
                          onBlur={() => handleBracketCountBlur(user.id)}
                          keyboardType="numeric"
                          placeholder="1"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {brackets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {cohort.status === CohortStatus.NOT_DEPLOYED
                ? 'Select players and deploy the tournament to create brackets.'
                : 'No brackets yet. Deploy the tournament to create brackets.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Brackets</Text>
            {brackets.map((bracket) => (
              <TouchableOpacity
                key={bracket.id}
                style={styles.bracketCard}
                onPress={() =>
                  router.push({
                    pathname: '/bracket-edit',
                    params: { bracketId: bracket.id, cohortId: cohort.id },
                  })
                }
              >
                <Text style={styles.bracketTitle}>Bracket {bracket.bracketNumber}</Text>
                <Text style={styles.bracketInfo}>
                  Players: {bracket.players.length} | Status:{' '}
                  {bracket.structure.completed ? 'Complete' : 'Active'}
                </Text>
                {bracket.structure.winner && (
                  <Text style={styles.winnerText}>
                    Winner: {bracket.structure.winner.name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </>
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
  infoSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  actionSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: Colors.accent,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  deployButton: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deployButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  userSelectionSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  userCardWrapper: {
    marginBottom: 8,
  },
  userCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceSecondary,
  },
  userCardContent: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userNameSelected: {
    color: Colors.primary,
  },
  userInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bracketCountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
  },
  bracketCountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  bracketCountInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
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
  bracketCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bracketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  bracketInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  winnerText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.border,
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalButtonTextSave: {
    color: Colors.white,
  },
});
