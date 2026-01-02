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
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function AdminScreen() {
  const { getOperatorPayouts, cohorts, deletePassword, setDeletePasswordValue, removeDuplicateUsers, users } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [passwordSection, setPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const operatorPayouts = getOperatorPayouts(selectedDate);
  const totalOperatorCut = operatorPayouts.reduce((sum, p) => sum + p.amount, 0);

  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Password cannot be empty');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    await setDeletePasswordValue(newPassword.trim());
    Alert.alert('Success', 'Delete password updated');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSection(false);
  };

  const handleRemoveDuplicates = async () => {
    Alert.alert(
      'Remove Duplicates',
      'This will remove all duplicate users (users with the same name). Only the first occurrence will be kept.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove Duplicates',
          style: 'destructive',
          onPress: async () => {
            const removed = await removeDuplicateUsers();
            if (removed > 0) {
              Alert.alert('Success', `Removed ${removed} duplicate user(s)`);
            } else {
              Alert.alert('Info', 'No duplicates found');
            }
          },
        },
      ]
    );
  };

  // Group by cohort
  const payoutsByCohort = operatorPayouts.reduce((acc, payout) => {
    if (!acc[payout.cohortId]) {
      acc[payout.cohortId] = [];
    }
    acc[payout.cohortId].push(payout);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Admin - Operator Cuts" />

      <View style={styles.dateSection}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.passwordSection}>
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setPasswordSection(!passwordSection)}
        >
          <Text style={styles.passwordToggleText}>
            {passwordSection ? '▼' : '▶'} Delete Password Settings
          </Text>
        </TouchableOpacity>

        {passwordSection && (
          <View style={styles.passwordForm}>
            <Text style={styles.passwordInfo}>
              Current password: {deletePassword ? '••••••••' : 'Not set'}
            </Text>
            <Text style={styles.label}>New Delete Password</Text>
            <TextInput
              style={styles.dateInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
              placeholderTextColor={Colors.textLight}
            />
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.dateInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry
              placeholderTextColor={Colors.textLight}
            />
            <TouchableOpacity
              style={styles.savePasswordButton}
              onPress={handleSavePassword}
            >
              <Text style={styles.buttonText}>Save Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.duplicateSection}>
        <Text style={styles.sectionHeader}>User Management</Text>
        <Text style={styles.duplicateInfo}>
          Total Users: {users.length}
        </Text>
        <TouchableOpacity
          style={styles.removeDuplicatesButton}
          onPress={handleRemoveDuplicates}
        >
          <Text style={styles.buttonText}>Remove Duplicate Users</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Operator Cut</Text>
          <Text style={styles.summaryAmount}>${totalOperatorCut.toFixed(2)}</Text>
          <Text style={styles.summaryCount}>
            {operatorPayouts.length} bracket{operatorPayouts.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {Object.keys(payoutsByCohort).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No operator cuts for this date</Text>
          </View>
        ) : (
          Object.entries(payoutsByCohort).map(([cohortId, payouts]) => {
            const cohort = cohorts.find(c => c.id === cohortId);
            const cohortTotal = payouts.reduce((sum, p) => sum + p.amount, 0);
            
            return (
              <View key={cohortId} style={styles.cohortCard}>
                <Text style={styles.cohortName}>
                  {cohort?.name || 'Unknown Cohort'}
                </Text>
                <Text style={styles.cohortTotal}>${cohortTotal.toFixed(2)}</Text>
                <Text style={styles.cohortCount}>
                  {payouts.length} bracket{payouts.length !== 1 ? 's' : ''}
                </Text>
              </View>
            );
          })
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
  dateSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passwordSection: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passwordToggle: {
    padding: 16,
  },
  passwordToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  passwordForm: {
    padding: 16,
    paddingTop: 0,
  },
  passwordInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  savePasswordButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  duplicateSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  duplicateInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  removeDuplicatesButton: {
    backgroundColor: Colors.warning,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.accent,
    margin: 16,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: Colors.white,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
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
  cohortCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cohortName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cohortTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  cohortCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

