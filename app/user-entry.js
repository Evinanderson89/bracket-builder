import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import { CohortStatus } from '../utils/types';

export default function UserEntryScreen() {
  const { user } = useAuth();
  const { cohorts, updateCohort, users } = useApp();
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [bracketCount, setBracketCount] = useState('1');
  const [modalVisible, setModalVisible] = useState(false);

  // Filter for OPEN (Not Deployed) tournaments
  const openCohorts = useMemo(() => {
    return cohorts
      .filter(c => c.status === CohortStatus.NOT_DEPLOYED)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [cohorts]);

  const handleJoinPress = (cohort) => {
    setSelectedCohort(cohort);
    setBracketCount('1'); // Reset default
    setModalVisible(true);
  };

  const confirmJoin = async () => {
    if (!selectedCohort || !user) return;

    // Find the real Player ID based on Auth Name
    const player = users.find(u => u.name.toLowerCase() === user.name.toLowerCase());
    
    if (!player) {
      Alert.alert("Profile Not Found", "Please create a player profile on the dashboard first.");
      setModalVisible(false);
      return;
    }

    const count = parseInt(bracketCount);
    if (isNaN(count) || count < 1) {
      Alert.alert("Invalid Entry", "Please enter at least 1 bracket.");
      return;
    }

    try {
      // Add user to selected list if not there
      const currentSelected = selectedCohort.selectedUserIds || [];
      const newSelected = currentSelected.includes(player.id) ? currentSelected : [...currentSelected, player.id];

      // Update the count for this specific user
      const newCounts = { ...selectedCohort.userBracketCounts, [player.id]: count };

      await updateCohort(selectedCohort.id, {
        selectedUserIds: newSelected,
        userBracketCounts: newCounts
      });

      Alert.alert("Success", `You requested ${count} brackets for ${selectedCohort.name}.`);
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Enter Tournament" />
      
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        
        {openCohorts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No upcoming tournaments found.</Text>
            <Text style={styles.emptySub}>Check back later!</Text>
          </View>
        ) : (
          openCohorts.map(cohort => {
            const player = users.find(u => u.name.toLowerCase() === user?.name.toLowerCase());
            const myCount = player && cohort.userBracketCounts?.[player.id] ? cohort.userBracketCounts[player.id] : 0;
            
            return (
              <View key={cohort.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{cohort.name}</Text>
                  <Text style={styles.cardDetail}>{cohort.type} • {new Date(cohort.createdAt).toLocaleDateString()}</Text>
                  
                  {myCount > 0 && (
                     <Text style={styles.joinedBadge}>✅ You have {myCount} brackets requested</Text>
                  )}
                </View>
                
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoinPress(cohort)}>
                  <Text style={styles.joinBtnText}>{myCount > 0 ? 'Update' : 'Join'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Entry Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join {selectedCohort?.name}</Text>
            <Text style={styles.modalSub}>How many brackets do you want to enter?</Text>
            <Text style={styles.costInfo}>$5.00 per bracket</Text>
            
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                value={bracketCount} 
                onChangeText={setBracketCount} 
                keyboardType="numeric" 
                autoFocus 
              />
              <Text style={styles.totalText}>Total: ${(parseInt(bracketCount) || 0) * 5}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmJoin}>
                <Text style={styles.confirmText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  card: { backgroundColor: Colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardDetail: { color: Colors.textSecondary, fontSize: 12 },
  joinedBadge: { color: Colors.success, fontSize: 12, marginTop: 6, fontWeight: 'bold' },
  
  joinBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  joinBtnText: { color: Colors.white, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: Colors.textSecondary, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.surface, width: '85%', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSub: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  costInfo: { color: Colors.primary, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  
  inputContainer: { alignItems: 'center', marginBottom: 24 },
  input: { backgroundColor: Colors.background, width: 80, height: 50, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, color: Colors.white, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  totalText: { color: Colors.white, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontWeight: 'bold' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.success, alignItems: 'center' },
  confirmText: { color: Colors.white, fontWeight: 'bold' }
});