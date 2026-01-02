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
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus, CohortType } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function CohortsScreen() {
  const router = useRouter();
  const { cohorts, addCohort, deleteCohort } = useApp();
  
  // View State
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'setup', 'history'
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form State
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortType, setNewCohortType] = useState(CohortType.SCRATCH);
  
  // Delete State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cohortToDelete, setCohortToDelete] = useState(null);

  // --- Filtering Logic ---
  const filteredCohorts = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return cohorts.filter(c => c.status === CohortStatus.ACTIVE);
      case 'setup':
        return cohorts.filter(c => c.status === CohortStatus.NOT_DEPLOYED);
      case 'history':
        return cohorts.filter(c => c.status === CohortStatus.COMPLETE);
      default:
        return cohorts;
    }
  }, [cohorts, activeTab]);

  // --- Actions ---

  const handleCreateCohort = async () => {
    if (!newCohortName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for the tournament group.');
      return;
    }

    await addCohort({
      name: newCohortName.trim(),
      type: newCohortType,
    });

    setNewCohortName('');
    setShowCreateModal(false);
    // Switch to setup tab to see the new cohort
    setActiveTab('setup');
    Alert.alert('Success', 'Tournament group created!');
  };

  const handleDeletePress = (cohort) => {
    setCohortToDelete(cohort);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!cohortToDelete) {
      Alert.alert('Error', 'No tournament selected for deletion.');
      setDeleteModalVisible(false);
      return;
    }

    try {
      await deleteCohort(cohortToDelete.id);
      setDeleteModalVisible(false);
      setCohortToDelete(null);
      Alert.alert('Success', `"${cohortToDelete.name}" has been deleted successfully.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete tournament. Please try again.');
      console.error('Delete cohort error:', error);
    }
  };

  // --- Render Helpers ---

  const renderTab = (key, label, icon) => (
    <TouchableOpacity 
      style={[styles.tab, activeTab === key && styles.tabActive]} 
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveTab(key);
      }}
    >
      <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
        {icon} {label}
      </Text>
      {activeTab === key && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Tournaments" />
      
      {/* TABS */}
      <View style={styles.tabBar}>
        {renderTab('active', 'Active', '🔥')}
        {renderTab('setup', 'Setup', '🛠️')}
        {renderTab('history', 'History', '🏁')}
      </View>

      {/* CONTENT LIST */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredCohorts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'active' ? '😴' : activeTab === 'setup' ? '✨' : '📜'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No active tournaments.' : 
               activeTab === 'setup' ? 'No tournaments in setup.' : 
               'No past tournaments.'}
            </Text>
            {activeTab === 'setup' && (
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.emptyCreateBtnText}>Create Your First One</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredCohorts.map((cohort) => (
            <TouchableOpacity
              key={cohort.id}
              style={[
                styles.cohortCard, 
                activeTab === 'active' && styles.cohortCardActive
              ]}
              onPress={() => router.push({ pathname: '/cohort-detail', params: { cohortId: cohort.id } })}
              activeOpacity={0.9}
            >
              <View style={styles.cardMain}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cohortType}>{cohort.type}</Text>
                  {cohort.status === CohortStatus.ACTIVE && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.cohortName}>{cohort.name}</Text>
                
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>
                     📅 {new Date(cohort.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Quick Actions Footer */}
              <View style={styles.cardFooter}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/cohort-detail', params: { cohortId: cohort.id } })}
                >
                  <Text style={styles.actionBtnText}>Open Dashboard →</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.deleteIconBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeletePress(cohort);
                  }}
                >
                  <Text style={styles.deleteIconText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 80 }} /> 
      </ScrollView>

      {/* Floating Create Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.fabText}>+ New</Text>
      </TouchableOpacity>

      {/* CREATE MODAL */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Tournament Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={newCohortName}
              onChangeText={setNewCohortName}
              placeholder="e.g. Thursday Night League"
              placeholderTextColor={Colors.textLight}
              autoFocus
            />
            
            <Text style={styles.label}>Format</Text>
            <View style={styles.typeSelector}>
              {[CohortType.SCRATCH, CohortType.HANDICAP].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    newCohortType === type && styles.typeOptionSelected
                  ]}
                  onPress={() => setNewCohortType(type)}
                >
                  <Text style={[
                    styles.typeText,
                    newCohortType === type && styles.typeTextSelected
                  ]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.createSubmitBtn} onPress={handleCreateCohort}>
              <Text style={styles.createSubmitText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setCohortToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteTitle}>Delete Tournament?</Text>
            <Text style={styles.deleteWarning}>
              Are you sure you want to delete "{cohortToDelete?.name}"?{'\n\n'}
              This will permanently delete the tournament and all associated data (brackets, games, payouts).
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setCohortToDelete(null);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmDeleteBtn}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
  
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '100%',
    backgroundColor: Colors.primary,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCreateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    color: Colors.white,
    fontWeight: 'bold',
  },

  // Cards
  cohortCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 3,
  },
  cohortCardActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  cardMain: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cohortType: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red tint
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
    marginRight: 4,
  },
  liveText: {
    color: Colors.danger,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cohortName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  
  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  actionBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteIconBtn: {
    padding: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconText: {
    fontSize: 16,
    opacity: 0.7,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: Colors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    elevation: 8,
  },
  fabText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  createModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  closeText: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.white,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  typeText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  createSubmitBtn: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createSubmitText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Delete Modal Specific
  deleteModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.danger,
    marginBottom: 8,
  },
  deleteWarning: {
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    backgroundColor: Colors.danger,
    padding: 12,
    borderRadius: 8,
  },
  confirmDeleteText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});