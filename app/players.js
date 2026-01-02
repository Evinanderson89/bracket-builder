import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function PlayersScreen() {
  const router = useRouter();
  const { users, addUser, updateUser, deleteUser, brackets, cohorts, getPlayerPayouts, payouts } = useApp();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userBrackets, setUserBrackets] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical', 'average', 'payout'
  const [newUserName, setNewUserName] = useState('');
  const [newUserAverage, setNewUserAverage] = useState('');
  const [newUserHandicap, setNewUserHandicap] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserAverage, setEditUserAverage] = useState('');
  const [editUserHandicap, setEditUserHandicap] = useState('');

  const isUserInActiveBracket = (userId) => {
    const activeCohorts = cohorts.filter(c => c.status === 'active');
    return brackets.some(b => 
      activeCohorts.some(c => c.id === b.cohortId) &&
      b.players.some(p => p.id === userId)
    );
  };

  const getUserBrackets = (userId) => {
    const userBracketsList = brackets
      .filter(b => b.players.some(p => p.id === userId))
      .map(bracket => {
        const cohort = cohorts.find(c => c.id === bracket.cohortId);
        return {
          bracket,
          cohort,
          isActive: cohort?.status === 'active',
        };
      });
    return userBracketsList;
  };

  const handleDeleteUser = (user) => {
    const bracketsList = getUserBrackets(user.id);
    setUserBrackets(bracketsList);
    setUserToDelete(user);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    // Check if user is in an active bracket
    if (isUserInActiveBracket(userToDelete.id)) {
      Alert.alert(
        'Cannot Delete',
        `Cannot delete "${userToDelete.name}" because they are in an active bracket. Please complete or cancel the active bracket first.`
      );
      setDeleteModalVisible(false);
      setUserToDelete(null);
      return;
    }

    try {
      await deleteUser(userToDelete.id);
      if (selectedUserId === userToDelete.id) {
        setSelectedUserId(null);
      }
      setDeleteModalVisible(false);
      setUserToDelete(null);
      Alert.alert('Success', 'Player deleted successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete player');
    }
  };

  const handleViewPayouts = (user) => {
    router.push({
      pathname: '/payout',
      params: { searchName: user.name }
    });
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserAverage(user.average.toString());
    setEditUserHandicap(user.handicap.toString());
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editUserName.trim() || !editUserAverage || !editUserHandicap) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check for duplicate name (excluding current user)
    const nameLower = editUserName.trim().toLowerCase();
    const existingUser = users.find(u => 
      u.id !== editingUserId && 
      u.name.trim().toLowerCase() === nameLower
    );
    if (existingUser) {
      Alert.alert('Error', `User "${editUserName.trim()}" already exists. Please use a different name.`);
      return;
    }

    try {
      await updateUser(editingUserId, {
        name: editUserName.trim(),
        average: parseInt(editUserAverage, 10),
        handicap: parseInt(editUserHandicap, 10),
      });
      Alert.alert('Success', 'Player updated successfully');
      setShowEditForm(false);
      setEditingUserId(null);
      setEditUserName('');
      setEditUserAverage('');
      setEditUserHandicap('');
      setSelectedUserId(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update player');
    }
  };

  // Calculate total historical payout for a user
  const getUserTotalPayout = (userName) => {
    if (!payouts) return 0;
    const userPayouts = payouts.filter(p => 
      p.playerName && p.playerName.toLowerCase() === userName.toLowerCase() && !p.isOperator
    );
    return userPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Sort users based on selected sort option
  const sortedUsers = useMemo(() => {
    const usersCopy = [...users];
    
    switch (sortBy) {
      case 'alphabetical':
        return usersCopy.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      case 'average':
        return usersCopy.sort((a, b) => 
          (b.average || 0) - (a.average || 0)
        );
      case 'payout':
        return usersCopy.sort((a, b) => {
          const payoutA = getUserTotalPayout(a.name);
          const payoutB = getUserTotalPayout(b.name);
          return payoutB - payoutA;
        });
      default:
        return usersCopy;
    }
  }, [users, sortBy, payouts]);

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserAverage || !newUserHandicap) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check for duplicate name
    const nameLower = newUserName.trim().toLowerCase();
    const existingUser = users.find(u => u.name.trim().toLowerCase() === nameLower);
    if (existingUser) {
      Alert.alert('Error', `User "${newUserName.trim()}" already exists. Please use a different name.`);
      return;
    }

    const user = {
      name: newUserName.trim(),
      average: parseInt(newUserAverage, 10),
      handicap: parseInt(newUserHandicap, 10),
      numBrackets: 1,
    };

    try {
      await addUser(user);
      Alert.alert('Success', 'Player added successfully');
      setNewUserName('');
      setNewUserAverage('');
      setNewUserHandicap('');
      setShowAddForm(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add player');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Manage Players" />
      {showAddForm ? (
        <View style={styles.addFormContainer}>
          <View style={styles.addForm}>
            <View style={styles.addFormHeader}>
              <Text style={styles.addFormTitle}>Add New Player</Text>
              <TouchableOpacity
                style={styles.cancelAddButton}
                onPress={() => {
                  setShowAddForm(false);
                  setNewUserName('');
                  setNewUserAverage('');
                  setNewUserHandicap('');
                }}
              >
                <Text style={styles.cancelAddButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.addFormFields}>
              <View style={styles.addFormField}>
                <Text style={styles.addFormLabel}>Name</Text>
                <TextInput
                  style={styles.addFormInput}
                  value={newUserName}
                  onChangeText={setNewUserName}
                  placeholder="Enter player name"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <View style={styles.addFormField}>
                <Text style={styles.addFormLabel}>Average</Text>
                <TextInput
                  style={styles.addFormInput}
                  value={newUserAverage}
                  onChangeText={setNewUserAverage}
                  placeholder="Enter average"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <View style={styles.addFormField}>
                <Text style={styles.addFormLabel}>Handicap</Text>
                <TextInput
                  style={styles.addFormInput}
                  value={newUserHandicap}
                  onChangeText={setNewUserHandicap}
                  placeholder="Enter handicap"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.addFormSubmitButton}
              onPress={handleAddUser}
            >
              <Text style={styles.addFormSubmitButtonText}>Add Player</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : showEditForm ? (
        <View style={styles.addFormContainer}>
          <View style={styles.addForm}>
            <View style={styles.addFormHeader}>
              <Text style={styles.addFormTitle}>Edit Player</Text>
              <TouchableOpacity
                style={styles.cancelAddButton}
                onPress={() => {
                  setShowEditForm(false);
                  setEditingUserId(null);
                  setEditUserName('');
                  setEditUserAverage('');
                  setEditUserHandicap('');
                }}
              >
                <Text style={styles.cancelAddButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.addFormFields}>
              <View style={styles.addFormField}>
                <Text style={styles.addFormLabel}>Name</Text>
                <TextInput
                  style={styles.addFormInput}
                  value={editUserName}
                  onChangeText={setEditUserName}
                  placeholder="Enter player name"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <View style={styles.addFormField}>
                <Text style={styles.addFormLabel}>Average</Text>
                <TextInput
                  style={styles.addFormInput}
                  value={editUserAverage}
                  onChangeText={setEditUserAverage}
                  placeholder="Enter average"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <View style={styles.addFormField}>
                <Text style={styles.addFormLabel}>Handicap</Text>
                <TextInput
                  style={styles.addFormInput}
                  value={editUserHandicap}
                  onChangeText={setEditUserHandicap}
                  placeholder="Enter handicap"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.addFormSubmitButton}
              onPress={handleSaveEdit}
            >
              <Text style={styles.addFormSubmitButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Left Column - Player Names */}
          <View style={styles.namesColumn}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>Players ({users.length})</Text>
              <TouchableOpacity
                style={styles.addUserButton}
                onPress={() => setShowAddForm(true)}
              >
                <Text style={styles.addUserButtonText}>+ Add User</Text>
              </TouchableOpacity>
            </View>
            
            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <View style={styles.sortButtons}>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === 'alphabetical' && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy('alphabetical')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortBy === 'alphabetical' && styles.sortButtonTextActive,
                  ]}>
                    A-Z
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === 'average' && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy('average')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortBy === 'average' && styles.sortButtonTextActive,
                  ]}>
                    Avg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === 'payout' && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy('payout')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortBy === 'payout' && styles.sortButtonTextActive,
                  ]}>
                    Payout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.namesList}>
              {sortedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No players registered</Text>
              ) : (
                sortedUsers.map((user) => {
                  const totalPayout = getUserTotalPayout(user.name);
                  // Calculate total brackets for this user
                  const bracketCount = brackets.filter(b => b.players.some(p => p.id === user.id)).length;
                  
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.nameItem,
                        selectedUserId === user.id && styles.nameItemSelected,
                      ]}
                      onPress={() => setSelectedUserId(user.id)}
                    >
                      <Text style={[
                        styles.nameText,
                        selectedUserId === user.id && styles.nameTextSelected,
                      ]}>
                        {user.name} <Text style={{ fontSize: 12, opacity: 0.7 }}>({bracketCount} games)</Text>
                      </Text>
                      <Text style={[
                        styles.nameInfo,
                        selectedUserId === user.id && styles.nameInfoSelected,
                      ]}>
                        Avg: {user.average} | Hdcp: {user.handicap}
                        {sortBy === 'payout' && totalPayout > 0 && (
                          <Text> | Total: ${totalPayout}</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

        {/* Right Column - Actions */}
        <View style={styles.actionsColumn}>
          <Text style={styles.columnTitle}>Actions</Text>
          {selectedUserId ? (
            <View style={styles.actionsContainer}>
              {(() => {
                const selectedUser = users.find(u => u.id === selectedUserId);
                if (!selectedUser) return null;

                const inActiveBracket = isUserInActiveBracket(selectedUser.id);
                const payouts = getPlayerPayouts(selectedUser.name, null);
                const hasPayouts = payouts.length > 0;

                return (
                  <>
                    <View style={styles.userInfo}>
                      <Text style={styles.userInfoTitle}>{selectedUser.name}</Text>
                      <Text style={styles.userInfoText}>
                        Average: {selectedUser.average}
                      </Text>
                      <Text style={styles.userInfoText}>
                        Handicap: {selectedUser.handicap}
                      </Text>
                      {inActiveBracket && (
                        <Text style={styles.warningText}>
                          ⚠️ In active bracket
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditUser(selectedUser)}
                    >
                      <Text style={styles.actionButtonText}>✏️ Edit Player</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.deleteButton,
                        inActiveBracket && styles.deleteButtonDisabled,
                      ]}
                      onPress={() => handleDeleteUser(selectedUser)}
                      disabled={inActiveBracket}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        inActiveBracket && styles.actionButtonTextDisabled,
                      ]}>
                        🗑️ Delete Player
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.payoutButton,
                        !hasPayouts && styles.actionButtonDisabled,
                      ]}
                      onPress={() => handleViewPayouts(selectedUser)}
                      disabled={!hasPayouts}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        !hasPayouts && styles.actionButtonTextDisabled,
                      ]}>
                        💰 View Payout History
                      </Text>
                      {hasPayouts && (
                        <Text style={styles.payoutCount}>
                          ({payouts.length} payout{payouts.length !== 1 ? 's' : ''})
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          ) : (
            <View style={styles.noSelectionContainer}>
              <Text style={styles.noSelectionText}>
                Select a player from the list to view actions
              </Text>
            </View>
          )}
        </View>
      </View>
      )}

      {/* Delete Confirmation Modal with Brackets Info */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setUserToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Delete {userToDelete?.name}?
            </Text>
            
            {userBrackets.length > 0 && (
              <View style={styles.bracketsInfo}>
                <Text style={styles.bracketsTitle}>
                  This player is in {userBrackets.length} bracket{userBrackets.length !== 1 ? 's' : ''}:
                </Text>
                <ScrollView style={styles.bracketsList}>
                  {userBrackets.map((item, index) => (
                    <View key={index} style={styles.bracketInfoItem}>
                      <Text style={styles.bracketInfoText}>
                        • {item.cohort?.name || 'Unknown Cohort'} - Bracket {item.bracket.bracketNumber}
                      </Text>
                      <Text style={[
                        styles.bracketStatus,
                        item.isActive && styles.bracketStatusActive
                      ]}>
                        {item.cohort?.status || 'Unknown'} {item.isActive && '⚠️'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                {userBrackets.some(item => item.isActive) && (
                  <Text style={styles.warningText}>
                    ⚠️ Cannot delete player while in active brackets
                  </Text>
                )}
              </View>
            )}

            {userBrackets.length === 0 && (
              <Text style={styles.noBracketsText}>
                This player is not in any brackets.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setUserToDelete(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteButton,
                  userBrackets.some(item => item.isActive) && styles.modalDeleteButtonDisabled
                ]}
                onPress={confirmDelete}
                disabled={userBrackets.some(item => item.isActive)}
              >
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
  },
  namesColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionsColumn: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.headerDark,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  addUserButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addUserButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  sortButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sortButtonTextActive: {
    color: Colors.white,
  },
  addFormContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addForm: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  cancelAddButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cancelAddButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  addFormFields: {
    gap: 16,
    marginBottom: 20,
  },
  addFormField: {
    gap: 8,
  },
  addFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  addFormInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  addFormSubmitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addFormSubmitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  namesList: {
    flex: 1,
  },
  nameItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  nameItemSelected: {
    backgroundColor: Colors.primary,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  nameTextSelected: {
    color: Colors.white,
  },
  nameInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nameInfoSelected: {
    color: Colors.white,
    opacity: 0.9,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  userInfo: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 8,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.danger,
  },
  deleteButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.6,
  },
  payoutButton: {
    backgroundColor: Colors.success,
  },
  actionButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.6,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  payoutCount: {
    color: Colors.white,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noSelectionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  bracketsInfo: {
    marginBottom: 20,
  },
  bracketsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  bracketsList: {
    maxHeight: 200,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bracketInfoItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bracketInfoText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bracketStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bracketStatusActive: {
    color: Colors.danger,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    marginTop: 8,
  },
  noBracketsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
  },
  modalDeleteButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.6,
  },
  modalDeleteButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});