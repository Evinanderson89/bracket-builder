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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function RegisterScreen() {
  const router = useRouter();
  const { userId: paramUserId } = useLocalSearchParams();
  const { users, addUser, updateUser, deleteUser, cohorts, deployCohort, brackets } = useApp();
  const [name, setName] = useState('');
  const [average, setAverage] = useState('');
  const [handicap, setHandicap] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(paramUserId || null);
  const [isEditing, setIsEditing] = useState(!!paramUserId);

  // Load user data if editing from params
  React.useEffect(() => {
    if (paramUserId) {
      const user = users.find(u => u.id === paramUserId);
      if (user) {
        setName(user.name);
        setAverage(user.average.toString());
        setHandicap(user.handicap.toString());
        setSelectedUserId(user.id);
        setIsEditing(true);
      }
    }
  }, [paramUserId, users]);

  const handleSelectUser = (user) => {
    setSelectedUserId(user.id);
    setIsEditing(true);
    setName(user.name);
    setAverage(user.average.toString());
    setHandicap(user.handicap.toString());
  };

  const handleClearSelection = () => {
    setSelectedUserId(null);
    setIsEditing(false);
    setName('');
    setAverage('');
    setHandicap('');
  };

  const isUserInActiveBracket = (userId) => {
    const activeCohorts = cohorts.filter(c => c.status === 'active');
    return brackets.some(b => 
      activeCohorts.some(c => c.id === b.cohortId) &&
      b.players.some(p => p.id === userId)
    );
  };

  const handleDeleteUser = async (user) => {
    // Check if user is in an active bracket
    if (isUserInActiveBracket(user.id)) {
      Alert.alert(
        'Cannot Delete',
        `Cannot delete "${user.name}" because they are in an active bracket. Please complete or cancel the active bracket first.`
      );
      return;
    }

    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.id);
              if (selectedUserId === user.id) {
                handleClearSelection();
              }
              Alert.alert('Success', 'Player deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete player');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !average || !handicap) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isEditing && selectedUserId) {
      // Update existing user
      try {
        await updateUser(selectedUserId, {
          name: name.trim(),
          average: parseInt(average, 10),
          handicap: parseInt(handicap, 10),
        });
        Alert.alert('Success', 'Player updated successfully');
        handleClearSelection();
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to update player');
      }
    } else {
      // Create new user
      const nameLower = name.trim().toLowerCase();
      const existingUser = users.find(u => u.name.trim().toLowerCase() === nameLower);
      if (existingUser) {
        Alert.alert('Error', `User "${name.trim()}" already exists. Please use a different name.`);
        return;
      }

      const user = {
        name: name.trim(),
        average: parseInt(average, 10),
        handicap: parseInt(handicap, 10),
        numBrackets: 1,
      };

      try {
        await addUser(user);
        Alert.alert('Success', 'Player registered successfully');
        handleClearSelection();
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to register player');
      }
    }
  };

  const handleDeployTournament = () => {
    if (users.length === 0) {
      Alert.alert('Error', 'No players registered');
      return;
    }

    // Check if there's a not deployed cohort
    const notDeployedCohort = cohorts.find(c => c.status === 'not deployed');
    if (!notDeployedCohort) {
      Alert.alert('Error', 'Please create a cohort first');
      router.push('/cohorts');
      return;
    }

    // Check if we have enough players after expanding by numBrackets
    // Each user can be in multiple brackets, so we expand the user list
    const totalPlayerInstances = users.reduce((sum, u) => sum + u.numBrackets, 0);
    const bracketsPossible = Math.floor(totalPlayerInstances / 8);
    
    if (bracketsPossible < 1) {
      Alert.alert(
        'Error',
        `Need at least 8 player instances (players × brackets) to create at least one bracket. Currently have ${totalPlayerInstances} instances.`
      );
      return;
    }

    // Deploy the cohort
    deployCohort(notDeployedCohort.id, users);
    Alert.alert('Success', 'Tournament deployed successfully');
    router.push('/cohorts');
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Register Players" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Add New Player Button */}
          {!isEditing && (
            <View style={styles.addNewSection}>
              <TouchableOpacity 
                style={styles.addNewButton} 
                onPress={handleClearSelection}
              >
                <Text style={styles.addNewButtonText}>+ Add New Player</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Compact Form */}
          <View style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isEditing ? 'Edit Player' : 'New Player'}
              </Text>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.clearButton} 
                  onPress={handleClearSelection}
                >
                  <Text style={styles.clearButtonText}>+ Add New</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter player name"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Average</Text>
                <TextInput
                  style={styles.input}
                  value={average}
                  onChangeText={setAverage}
                  placeholder="Enter average"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Handicap</Text>
                <TextInput
                  style={styles.input}
                  value={handicap}
                  onChangeText={setHandicap}
                  placeholder="Enter handicap"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.saveButton, isEditing && styles.updateButton]} 
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>
                  {isEditing ? 'Update Player' : 'Register Player'}
                </Text>
              </TouchableOpacity>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleClearSelection}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* User List */}
          <View style={styles.userListSection}>
            <Text style={styles.sectionTitle}>Players ({users.length})</Text>
            <ScrollView 
              style={styles.userList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {users.length === 0 ? (
                <Text style={styles.emptyText}>No players registered yet</Text>
              ) : (
                users.map((user) => (
                  <View
                    key={user.id}
                    style={[
                      styles.userListItem,
                      selectedUserId === user.id && styles.userListItemSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.userListItemContent}
                      onPress={() => handleSelectUser(user)}
                    >
                      <View style={styles.userListItemText}>
                        <Text style={[
                          styles.userListName,
                          selectedUserId === user.id && styles.userListNameSelected,
                        ]}>
                          {user.name}
                        </Text>
                        <Text style={[
                          styles.userListInfo,
                          selectedUserId === user.id && styles.userListInfoSelected,
                        ]}>
                          Avg: {user.average} | Hdcp: {user.handicap}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteUser(user)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.deployButton}
            onPress={handleDeployTournament}
          >
            <Text style={styles.buttonText}>Deploy Tournament</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/cohorts')}
          >
            <Text style={styles.buttonText}>Edit Brackets</Text>
          </TouchableOpacity>
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
  addNewSection: {
    padding: 16,
    paddingBottom: 0,
  },
  addNewButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addNewButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  form: {
    padding: 16,
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  clearButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  updateButton: {
    backgroundColor: Colors.success,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  userListSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  userList: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 500,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userListItemContent: {
    flex: 1,
  },
  userListItemText: {
    flex: 1,
  },
  userListItemSelected: {
    backgroundColor: Colors.primary,
  },
  userListName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userListNameSelected: {
    color: Colors.white,
  },
  userListInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  userListInfoSelected: {
    color: Colors.white,
    opacity: 0.9,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  deployButton: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});

