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
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

export default function UserEntryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cohorts, users, updateCohort } = useApp();
  
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [numBrackets, setNumBrackets] = useState('1');

  // Find the player profile
  const playerProfile = useMemo(() => {
    if (!user?.email) return null;
    return users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
  }, [users, user]);

  // Get available cohorts (not deployed or active)
  const availableCohorts = useMemo(() => {
    return cohorts.filter(c => 
      c.status === CohortStatus.NOT_DEPLOYED || c.status === CohortStatus.ACTIVE
    );
  }, [cohorts]);

  const handleSubmit = async () => {
    if (!selectedCohortId) {
      Alert.alert('Error', 'Please select a tournament');
      return;
    }

    if (!playerProfile) {
      Alert.alert('Error', 'Please create a player profile first');
      router.push('/user-profile');
      return;
    }

    const bracketCount = parseInt(numBrackets, 10);
    if (isNaN(bracketCount) || bracketCount < 1) {
      Alert.alert('Error', 'Please enter a valid number of brackets');
      return;
    }

    try {
      const cohort = cohorts.find(c => c.id === selectedCohortId);
      if (!cohort) {
        Alert.alert('Error', 'Tournament not found');
        return;
      }

      // Add user to cohort if not already added
      const selectedUserIds = cohort.selectedUserIds || [];
      if (!selectedUserIds.includes(playerProfile.id)) {
        selectedUserIds.push(playerProfile.id);
      }

      // Update user bracket count for this cohort
      const userBracketCounts = cohort.userBracketCounts || {};
      userBracketCounts[playerProfile.id] = bracketCount;

      await updateCohort(selectedCohortId, {
        selectedUserIds,
        userBracketCounts,
      });

      Alert.alert(
        'Success',
        `You've been entered into "${cohort.name}" with ${bracketCount} bracket${bracketCount !== 1 ? 's' : ''}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to enter tournament');
    }
  };

  if (!playerProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="Enter Tournament" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please create a player profile first</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/user-profile')}
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Enter Tournament" />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Tournament</Text>
          {availableCohorts.length === 0 ? (
            <Text style={styles.emptyText}>No tournaments available for entry</Text>
          ) : (
            availableCohorts.map(cohort => (
              <TouchableOpacity
                key={cohort.id}
                style={[
                  styles.cohortOption,
                  selectedCohortId === cohort.id && styles.cohortOptionSelected,
                ]}
                onPress={() => setSelectedCohortId(cohort.id)}
              >
                <View style={styles.cohortInfo}>
                  <Text style={styles.cohortName}>{cohort.name}</Text>
                  <Text style={styles.cohortType}>{cohort.type}</Text>
                </View>
                {selectedCohortId === cohort.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {selectedCohortId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Brackets</Text>
            <Text style={styles.label}>
              How many brackets would you like to enter?
            </Text>
            <TextInput
              style={styles.input}
              value={numBrackets}
              onChangeText={setNumBrackets}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor={Colors.textLight}
            />
            <Text style={styles.hint}>
              Each bracket entry costs the same. You'll be randomly placed in brackets.
            </Text>
          </View>
        )}

        {selectedCohortId && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Enter Tournament</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
  },
  cohortOption: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cohortOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceSecondary,
  },
  cohortInfo: {
    flex: 1,
  },
  cohortName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  cohortType: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.white,
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
  },
});

