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
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus, CohortType } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

export default function CohortsScreen() {
  const router = useRouter();
  const { cohorts, addCohort, updateCohort, deleteCohort, verifyDeletePassword } = useApp();
  const [cohortName, setCohortName] = useState('');
  const [cohortType, setCohortType] = useState(CohortType.SCRATCH);
  const [showForm, setShowForm] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cohortToDelete, setCohortToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  const handleCreateCohort = async () => {
    if (!cohortName.trim()) {
      Alert.alert('Error', 'Please enter a cohort name');
      return;
    }

    await addCohort({
      name: cohortName.trim(),
      type: cohortType,
    });

    setCohortName('');
    setShowForm(false);
    Alert.alert('Success', 'Cohort created successfully');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CohortStatus.ACTIVE:
        return Colors.success;
      case CohortStatus.COMPLETE:
        return Colors.info;
      default:
        return Colors.warning;
    }
  };

  const handleEditCohort = (cohort) => {
    router.push({
      pathname: '/cohort-detail',
      params: { cohortId: cohort.id },
    });
  };

  const handleDeleteCohort = (cohort) => {
    setCohortToDelete(cohort);
    setDeletePassword('');
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!cohortToDelete) return;

    if (!deletePassword.trim()) {
      Alert.alert('Error', 'Please enter the delete password');
      return;
    }

    if (!verifyDeletePassword(deletePassword.trim())) {
      Alert.alert('Error', 'Incorrect password');
      setDeletePassword('');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${cohortToDelete.name}"? This will also delete all associated brackets, games, and payouts. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setDeleteModalVisible(false);
            setCohortToDelete(null);
            setDeletePassword('');
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCohort(cohortToDelete.id);
            setDeleteModalVisible(false);
            setCohortToDelete(null);
            setDeletePassword('');
            Alert.alert('Success', 'Cohort deleted successfully');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Manage Cohorts" />
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Add Cohort'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.label}>Cohort Name</Text>
          <TextInput
            style={styles.input}
            value={cohortName}
            onChangeText={setCohortName}
            placeholder="Enter cohort name"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                cohortType === CohortType.SCRATCH && styles.typeButtonActive,
              ]}
              onPress={() => setCohortType(CohortType.SCRATCH)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  cohortType === CohortType.SCRATCH && styles.typeButtonTextActive,
                ]}
              >
                Scratch
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                cohortType === CohortType.HANDICAP && styles.typeButtonActive,
              ]}
              onPress={() => setCohortType(CohortType.HANDICAP)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  cohortType === CohortType.HANDICAP && styles.typeButtonTextActive,
                ]}
              >
                Handicap
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleCreateCohort}>
            <Text style={styles.buttonText}>Create Cohort</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {cohorts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No cohorts yet. Create one to get started!</Text>
          </View>
        ) : (
          cohorts.map((cohort) => (
            <View key={cohort.id} style={styles.cohortCard}>
              <TouchableOpacity
                style={styles.cohortCardContent}
                onPress={() => handleEditCohort(cohort)}
              >
                <View style={styles.cohortHeader}>
                  <Text style={styles.cohortName}>{cohort.name}</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(cohort.status) }]}
                  >
                    <Text style={styles.statusText}>{cohort.status}</Text>
                  </View>
                </View>
                <Text style={styles.cohortType}>Type: {cohort.type}</Text>
                <Text style={styles.cohortDate}>
                  Created: {new Date(cohort.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteCohort(cohort)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setCohortToDelete(null);
          setDeletePassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Cohort</Text>
            {cohortToDelete && (
              <Text style={styles.modalSubtitle}>
                {cohortToDelete.name}
              </Text>
            )}
            <Text style={styles.modalWarning}>
              ⚠️ This will delete the cohort and all associated brackets, games, and payouts. This action cannot be undone.
            </Text>
            <Text style={styles.modalLabel}>Enter Delete Password</Text>
            <TextInput
              style={styles.modalInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Enter password"
              secureTextEntry
              placeholderTextColor={Colors.textLight}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setCohortToDelete(null);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={confirmDelete}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextDelete]}>Delete</Text>
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
  actionBar: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  form: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  createButton: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cohortCardContent: {
    padding: 16,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 14,
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
    marginBottom: 16,
  },
  modalWarning: {
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 20,
    lineHeight: 20,
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
  modalButtonDelete: {
    backgroundColor: Colors.danger,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalButtonTextDelete: {
    color: Colors.white,
  },
  cohortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cohortName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cohortType: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cohortDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
});

