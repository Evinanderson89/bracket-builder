import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import { CohortStatus } from '../utils/types';
import type { Cohort } from '../utils/types';

export default function UserEntryScreen() {
  const { user } = useAuth();
  const { cohorts, updateCohort, users } = useApp();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [bracketCount, setBracketCount] = useState('1');
  const [modal, setModal] = useState(false);

  const openCohorts = useMemo(() => {
    return cohorts
      .filter(c => c.status === CohortStatus.NOT_DEPLOYED)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cohorts]);

  const handleJoin = (c: Cohort) => {
    setSelectedCohort(c);
    setBracketCount('1');
    setModal(true);
  };

  const confirmJoin = async () => {
    if (!selectedCohort || !user) return;
    const player = users.find(u => u.name.toLowerCase() === user.name.toLowerCase());
    if (!player) {
      Alert.alert('Profile Not Found', 'Create a player profile first.');
      setModal(false); return;
    }
    const count = parseInt(bracketCount);
    if (isNaN(count) || count < 1) {
      Alert.alert('Invalid', 'Enter at least 1 bracket'); return;
    }
    try {
      const curr = selectedCohort.selectedUserIds || [];
      const next = curr.includes(player.id) ? curr : [...curr, player.id];
      await updateCohort(selectedCohort.id, {
        selectedUserIds: next,
        userBracketCounts: { ...selectedCohort.userBracketCounts, [player.id]: count },
      });
      Alert.alert('Success', `Requested ${count} bracket(s) for ${selectedCohort.name}`);
      setModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Enter Tournament" />
      <ScrollView style={styles.scroll}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {openCohorts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No upcoming tournaments</Text>
            <Text style={styles.emptySub}>Check back later!</Text>
          </View>
        ) : openCohorts.map(c => {
          const player = users.find(u => u.name.toLowerCase() === user?.name?.toLowerCase());
          const myCount = player ? (c.userBracketCounts?.[player.id] || 0) : 0;
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Text style={styles.cardDetail}>{c.type} | {new Date(c.createdAt).toLocaleDateString()}</Text>
                {myCount > 0 && <Text style={styles.joinedBadge}>You have {myCount} bracket(s) requested</Text>}
              </View>
              <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(c)}>
                <Text style={styles.joinBtnText}>{myCount > 0 ? 'Update' : 'Join'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join {selectedCohort?.name}</Text>
            <Text style={styles.modalSub}>How many brackets?</Text>
            <Text style={styles.costInfo}>$5.00 per bracket</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={bracketCount} onChangeText={setBracketCount}
                keyboardType="numeric" autoFocus />
              <Text style={styles.totalText}>Total: ${(parseInt(bracketCount) || 0) * 5}</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmJoin}>
                <Text style={styles.confirmText}>Submit</Text>
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
  scroll: { padding: 16 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  card: {
    backgroundColor: Colors.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardDetail: { color: Colors.textSecondary, fontSize: 12 },
  joinedBadge: { color: Colors.success, fontSize: 12, marginTop: 6, fontWeight: 'bold' },
  joinBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  joinBtnText: { color: Colors.white, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: Colors.textSecondary, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.surface, width: '85%', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSub: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  costInfo: { color: Colors.primary, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  inputWrap: { alignItems: 'center', marginBottom: 24 },
  input: {
    backgroundColor: Colors.background, width: 80, height: 50, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, color: Colors.white,
    fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8,
  },
  totalText: { color: Colors.white, fontWeight: 'bold' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontWeight: 'bold' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.success, alignItems: 'center' },
  confirmText: { color: Colors.white, fontWeight: 'bold' },
});
