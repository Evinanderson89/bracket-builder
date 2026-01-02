import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus } from '../utils/types';
import { isPlayerLiveInCohort } from '../utils/bracketLogic';
import NavigationHeader from '../components/NavigationHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CohortDetailScreen() {
  const router = useRouter();
  const { cohortId } = useLocalSearchParams();
  const { cohorts, getCohortBrackets, users, deployCohort, updateCohort } = useApp();
  
  const [activeTab, setActiveTab] = useState('brackets'); 
  const [rosterModalVisible, setRosterModalVisible] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const cohort = cohorts.find(c => c.id === cohortId);
  const brackets = cohort ? getCohortBrackets(cohortId) : [];
  const selectedUserIds = cohort?.selectedUserIds || [];
  
  // --- Auto-Switch Tab ---
  useEffect(() => {
    if (brackets.length === 0 && cohort?.status === CohortStatus.NOT_DEPLOYED) {
      setActiveTab('roster');
    }
  }, [brackets.length, cohort?.status]);

  // --- Self-Healing: Auto-Complete Cohort ---
  useEffect(() => {
    if (cohort && brackets.length > 0 && cohort.status === CohortStatus.ACTIVE) {
      const allBracketsComplete = brackets.every(b => b.structure.completed);
      if (allBracketsComplete) {
        updateCohort(cohort.id, { status: CohortStatus.COMPLETE });
      }
    }
  }, [cohort, brackets, updateCohort]);

  // --- Calculations ---
  
  const selectedUsers = useMemo(() => {
    const players = users.filter(u => selectedUserIds.includes(u.id));
    
    // Sort logic for Roster Tab: Live players on top
    return players.sort((a, b) => {
       const aLive = isPlayerLiveInCohort(a.id, brackets);
       const bLive = isPlayerLiveInCohort(b.id, brackets);
       
       if (aLive && !bLive) return -1;
       if (!aLive && bLive) return 1;
       return a.name.localeCompare(b.name);
    });
  }, [users, selectedUserIds, brackets]);

  // Filter for the MODAL (all users)
  const allUsersFiltered = useMemo(() => {
    if (!playerSearch) return users;
    return users.filter(u => u.name.toLowerCase().includes(playerSearch.toLowerCase()));
  }, [users, playerSearch]);

  // --- FIXED: Smart Calculation ---
  // This calculates the TRUE limit by accounting for the "No Self-Play" rule.
  const bracketsToGenerate = useMemo(() => {
    // 1. Get all active users and their ticket counts
    const activePlayers = selectedUserIds.map(uid => {
      const user = users.find(u => u.id === uid);
      const count = cohort?.userBracketCounts?.[uid] || user?.numBrackets || 1;
      return { id: uid, count };
    });

    let totalTickets = activePlayers.reduce((sum, p) => sum + p.count, 0);
    
    // Start with the naive estimate (Total / 8)
    let maxBrackets = Math.floor(totalTickets / 8);

    // Iteratively lower the number until it fits everyone's constraints
    // (If I have 20 tickets but maxBrackets is 7, 13 of my tickets are dead weight)
    for (let i = 0; i < 5; i++) {
      if (maxBrackets === 0) break;
      
      let usableTickets = 0;
      activePlayers.forEach(p => {
        // A player can only use up to 'maxBrackets' tickets
        usableTickets += Math.min(p.count, maxBrackets);
      });

      const newMax = Math.floor(usableTickets / 8);
      if (newMax === maxBrackets) break; // Found the stable number
      maxBrackets = newMax;
    }

    return maxBrackets;
  }, [selectedUserIds, users, cohort?.userBracketCounts]);

  // Count only the spots that are actually usable (ignoring dead tickets)
  const totalPlayerInstances = selectedUserIds.reduce((sum, uid) => {
    const user = users.find(u => u.id === uid);
    const count = cohort?.userBracketCounts?.[uid] || user?.numBrackets || 1;
    return sum + Math.min(count, bracketsToGenerate || 999); // Cap at max brackets if calculated
  }, 0);
  
  const playersNeeded = (bracketsToGenerate + 1) * 8 - totalPlayerInstances;
  const isDeployable = bracketsToGenerate > 0;

  // --- Actions ---

  const handleTabChange = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const toggleUserSelection = (userId) => {
    const isSelected = selectedUserIds.includes(userId);
    let newSelectedIds;
    
    if (isSelected) {
      newSelectedIds = selectedUserIds.filter(id => id !== userId);
    } else {
      newSelectedIds = [...selectedUserIds, userId];
    }

    const newBracketCounts = { ...cohort.userBracketCounts };
    if (!newSelectedIds.includes(userId)) {
      delete newBracketCounts[userId];
    } else if (!newBracketCounts[userId]) {
      const user = users.find(u => u.id === userId);
      newBracketCounts[userId] = user?.numBrackets || 1;
    }

    updateCohort(cohortId, {
      selectedUserIds: newSelectedIds,
      userBracketCounts: newBracketCounts,
    });
  };

  // Set number of brackets directly from text input
  const setBracketCount = (userId, text) => {
    const val = parseInt(text, 10);
    // Only update if it's a valid positive number
    if (!isNaN(val) && val >= 1) {
      updateCohort(cohortId, {
        userBracketCounts: {
          ...cohort.userBracketCounts,
          [userId]: val
        }
      });
    }
  };

  const handleDeploy = async () => {
    if (!isDeployable) {
      Alert.alert('Not Enough Players', `You need 8 spots to form a bracket.`);
      return;
    }
    
    try {
      await deployCohort(cohortId, selectedUsers, cohort.userBracketCounts);
      Alert.alert('Success', 'Tournament brackets generated!');
      setActiveTab('brackets');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CohortStatus.ACTIVE: return Colors.success; // Green
      case CohortStatus.COMPLETE: return Colors.info;  // Blue
      default: return Colors.warning;                  // Orange
    }
  };

  if (!cohort) return null;

  // --- Components ---

  const renderRosterTab = () => (
    <View style={styles.tabContent}>
      {selectedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>Roster Empty</Text>
          <Text style={styles.emptyText}>No players have been added.</Text>
          {cohort.status === CohortStatus.NOT_DEPLOYED && (
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setRosterModalVisible(true)}>
              <Text style={styles.emptyActionBtnText}>Manage Roster</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterCount}>{selectedUsers.length} Players Confirmed</Text>
            {cohort.status === CohortStatus.NOT_DEPLOYED && (
              <TouchableOpacity onPress={() => setRosterModalVisible(true)}>
                <Text style={styles.editLink}>Edit Roster</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {selectedUsers.map((user) => {
            const entryCount = cohort?.userBracketCounts?.[user.id] || user.numBrackets || 1;
            const isLive = isPlayerLiveInCohort(user.id, brackets);

            return (
              <View 
                key={user.id} 
                style={[
                  styles.summaryRow,
                  !isLive && styles.summaryRowEliminated
                ]}
              >
                <View style={styles.summaryAvatar}>
                  <Text style={styles.summaryAvatarText}>{user.name.charAt(0)}</Text>
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryName}>{user.name}</Text>
                  <Text style={styles.summaryStats}>Avg: {user.average} • Hdcp: {user.handicap}</Text>
                </View>
                
                {/* STATUS BADGE */}
                {isLive ? (
                  <View style={styles.entryBadge}>
                     <Text style={styles.entryCount}>{entryCount}</Text>
                     <Text style={styles.entryLabel}>{entryCount === 1 ? 'Entry' : 'Entries'}</Text>
                  </View>
                ) : (
                  <View style={styles.eliminatedBadge}>
                    <Text style={styles.eliminatedText}>Eliminated</Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{height: 100}} /> 
        </>
      )}
    </View>
  );

  const renderBracketsTab = () => (
    <View style={styles.tabContent}>
      {brackets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Tournament Setup</Text>
          <Text style={styles.emptyText}>No brackets generated yet.</Text>
          <TouchableOpacity style={styles.emptyActionBtn} onPress={() => handleTabChange('roster')}>
            <Text style={styles.emptyActionBtnText}>Go to Roster</Text>
          </TouchableOpacity>
        </View>
      ) : (
        brackets.map((bracket) => {
          // Determine completion status:
          const isComplete = bracket.structure.completed || bracket.structure.winner;
          
          return (
            <TouchableOpacity
              key={bracket.id}
              style={styles.bracketCard}
              onPress={() => router.push({
                pathname: '/bracket-edit',
                params: { bracketId: bracket.id, cohortId: cohort.id },
              })}
            >
              <View style={styles.bracketHeader}>
                <View style={styles.bracketTitleRow}>
                  <Text style={styles.bracketIcon}>🏆</Text>
                  <Text style={styles.bracketTitle}>Bracket {bracket.bracketNumber}</Text>
                </View>
                <View style={[
                  styles.statusPill, 
                  isComplete ? styles.statusComplete : styles.statusActive
                ]}>
                  <Text style={styles.statusPillText}>
                    {isComplete ? 'COMPLETE' : 'LIVE'}
                  </Text>
                </View>
              </View>
              <View style={styles.bracketBody}>
                <Text style={styles.bracketDetails}>{bracket.players.length} Players Competing</Text>
                {bracket.structure.winner ? (
                  <View style={styles.winnerRow}>
                    <Text style={styles.winnerLabel}>Winner:</Text>
                    <Text style={styles.winnerText}>{bracket.structure.winner.name}</Text>
                  </View>
                ) : (
                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: '40%' }]} />
                    </View>
                    <Text style={styles.progressText}>In Progress</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
      <View style={{height: 40}} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={cohort.name} />

      <View style={styles.hudContainer}>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>Type</Text>
          <Text style={styles.hudValue}>{cohort.type}</Text>
        </View>
        <View style={styles.hudDivider} />
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>Status</Text>
          <Text style={[styles.hudValue, { color: getStatusColor(cohort.status) }]}>
            {cohort.status ? cohort.status.toUpperCase() : 'UNKNOWN'}
          </Text>
        </View>
        <View style={styles.hudDivider} />
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>Est. Brackets</Text>
          <Text style={styles.hudValue}>{bracketsToGenerate}</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'brackets' && styles.tabActive]} onPress={() => handleTabChange('brackets')}>
          <Text style={[styles.tabText, activeTab === 'brackets' && styles.tabTextActive]}>Brackets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'roster' && styles.tabActive]} onPress={() => handleTabChange('roster')}>
          <Text style={[styles.tabText, activeTab === 'roster' && styles.tabTextActive]}>Roster</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer}>
        {activeTab === 'brackets' ? renderBracketsTab() : renderRosterTab()}
      </ScrollView>

      {activeTab === 'roster' && cohort.status === CohortStatus.NOT_DEPLOYED && selectedUsers.length > 0 && (
        <View style={styles.footerContainer}>
          <View style={styles.footerInfo}>
             <Text style={styles.footerStats}><Text style={{fontWeight: 'bold', color: Colors.white}}>{totalPlayerInstances}</Text> Spots Filled</Text>
             {/* Note: playersNeeded is rough estimate based on next bracket */}
             <Text style={styles.footerSub}>Add {playersNeeded} more for next bracket</Text>
          </View>
          <TouchableOpacity style={[styles.deployBtn, !isDeployable && styles.deployBtnDisabled]} onPress={handleDeploy} disabled={!isDeployable}>
            <Text style={styles.deployBtnText}>Deploy ({bracketsToGenerate})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MANAGE ROSTER MODAL */}
      <Modal visible={rosterModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRosterModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Roster</Text>
            <TouchableOpacity onPress={() => setRosterModalVisible(false)} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBarContainer}>
             <TextInput style={styles.searchInput} placeholder="Search players..." placeholderTextColor={Colors.textLight} value={playerSearch} onChangeText={setPlayerSearch} />
          </View>
          <ScrollView style={styles.modalContent}>
             {allUsersFiltered.map(user => {
               const isSelected = selectedUserIds.includes(user.id);
               // Get current bracket count for this user
               const count = cohort?.userBracketCounts?.[user.id] || user.numBrackets || 1;
               
               return (
                 <View key={user.id} style={[styles.playerRow, isSelected && styles.playerRowSelected]}>
                   <TouchableOpacity 
                     style={styles.playerMainTouch} 
                     onPress={() => toggleUserSelection(user.id)}
                   >
                     <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                       {isSelected && <Text style={styles.checkmark}>✓</Text>}
                     </View>
                     <View style={styles.playerInfo}>
                       <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>{user.name}</Text>
                       <Text style={styles.playerStats}>Avg: {user.average} • Hdcp: {user.handicap}</Text>
                     </View>
                   </TouchableOpacity>

                   {/* TEXT INPUT CONTROLS (Only visible if selected) */}
                   {isSelected && (
                     <View style={styles.inputWrapper}>
                       <Text style={styles.inputLabel}>Brackets:</Text>
                       <TextInput
                          style={styles.bracketInput}
                          value={count.toString()}
                          keyboardType="numeric"
                          onChangeText={(text) => setBracketCount(user.id, text)}
                          selectTextOnFocus={true}
                          maxLength={2}
                       />
                     </View>
                   )}
                 </View>
               );
             })}
             <View style={{height: 40}} />
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // ... (HUD and Tabs styles same as before)
  hudContainer: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, justifyContent: 'space-evenly', alignItems: 'center' },
  hudItem: { alignItems: 'center', flex: 1 },
  hudLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  hudValue: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
  hudDivider: { width: 1, height: '60%', backgroundColor: Colors.border },
  tabContainer: { flexDirection: 'row', margin: 16, backgroundColor: Colors.surface, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: Colors.white, fontWeight: 'bold' },
  contentContainer: { flex: 1 },
  tabContent: { paddingHorizontal: 16 },
  
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  rosterCount: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  editLink: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
  
  summaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  summaryRowEliminated: { opacity: 0.5, backgroundColor: Colors.background },
  summaryAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: Colors.border },
  summaryAvatarText: { color: Colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  summaryInfo: { flex: 1 },
  summaryName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
  summaryStats: { color: Colors.textSecondary, fontSize: 12 },
  
  entryBadge: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', minWidth: 70 },
  entryCount: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  entryLabel: { color: Colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  eliminatedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  eliminatedText: { color: Colors.danger, fontSize: 12, fontWeight: 'bold' },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  doneBtn: { padding: 8 },
  doneBtnText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  modalContent: { flex: 1, padding: 16 },
  searchBarContainer: { padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.white, fontSize: 14 },
  
  // Updated Player Row in Modal
  playerRow: { flexDirection: 'row', backgroundColor: Colors.surface, marginBottom: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', paddingRight: 12 },
  playerRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.surfaceSecondary },
  playerMainTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.textLight, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  playerInfo: { flex: 1 },
  playerName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  playerNameSelected: { color: Colors.primary },
  playerStats: { color: Colors.textSecondary, fontSize: 12 },
  
  // Input Styles
  inputWrapper: { alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  inputLabel: { fontSize: 8, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  bracketInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    width: 40,
    height: 36,
    textAlign: 'center',
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // ... (Empty State & Footer)
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginBottom: 24, lineHeight: 22, paddingHorizontal: 32 },
  emptyActionBtn: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  emptyActionBtnText: { color: Colors.primary, fontWeight: 'bold' },
  
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, elevation: 10 },
  footerInfo: { flex: 1 },
  footerStats: { color: Colors.textSecondary, fontSize: 14 },
  footerSub: { color: Colors.textLight, fontSize: 10, marginTop: 2 },
  deployBtn: { backgroundColor: Colors.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  deployBtnDisabled: { backgroundColor: Colors.border, opacity: 0.5 },
  deployBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  
  bracketCard: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 4 },
  bracketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  bracketTitleRow: { flexDirection: 'row', alignItems: 'center' },
  bracketIcon: { fontSize: 16, marginRight: 8 },
  bracketTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  statusComplete: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusPillText: { fontSize: 10, fontWeight: 'bold', color: Colors.white },
  bracketBody: { padding: 16 },
  bracketDetails: { color: Colors.textSecondary, marginBottom: 12 },
  winnerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  winnerLabel: { color: Colors.accent, fontWeight: 'bold', marginRight: 6 },
  winnerText: { color: Colors.white },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary },
  progressText: { fontSize: 10, color: Colors.textSecondary },
});