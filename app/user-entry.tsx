import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/fonts';
import { summarizeBowlingCenters } from '../utils/bowlingCenters';
import NavigationHeader from '../components/NavigationHeader';
import { CohortStatus } from '../utils/types';
import { getTournamentDescription } from '../utils/tournamentDescription';
import type { Cohort } from '../utils/types';

export default function UserEntryScreen() {
  const { user } = useAuth();
  const { cohorts, users, queueTournamentEntry } = useApp();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [bracketCount, setBracketCount] = useState('1');
  const [modal, setModal] = useState(false);

  const player = useMemo(() => {
    if (!user) return null;
    return users.find(u => (
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
      || u.name.toLowerCase() === user.name.toLowerCase()
    ));
  }, [user, users]);

  const openCohorts = useMemo(() => {
    return cohorts
      .filter(c => c.status === CohortStatus.NOT_DEPLOYED)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cohorts]);

  const sourceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    cohorts.forEach(c => map.set(c.id, c.name));
    return map;
  }, [cohorts]);

  const handleJoin = (c: Cohort) => {
    setSelectedCohort(c);
    setBracketCount('1');
    setModal(true);
  };

  const confirmJoin = async () => {
    if (!selectedCohort || !user) return;

    if (!player) {
      Alert.alert('Profile Not Found', 'Your player request must be approved before joining tournaments.');
      setModal(false);
      return;
    }

    const count = parseInt(bracketCount, 10);
    if (Number.isNaN(count) || count < 1) {
      Alert.alert('Invalid', 'Enter at least 1 bracket');
      return;
    }

    const latestCohort = cohorts.find(c => c.id === selectedCohort.id) || selectedCohort;
    const paidCount = latestCohort.userBracketCounts?.[player.id] || 0;
    const pendingCount = (latestCohort.pendingEntryRequests || []).find(req => req.playerId === player.id)?.bracketCount || 0;
    const existingTotal = paidCount + pendingCount;

    const submitRequest = async () => {
      try {
        await queueTournamentEntry(latestCohort.id, { id: player.id, name: player.name }, count);
        if (existingTotal > 0) {
          const nextPending = pendingCount + count;
          Alert.alert(
            'Queued',
            `Added ${count} bracket${count !== 1 ? 's' : ''}. Pending payment now: ${nextPending} bracket${nextPending !== 1 ? 's' : ''}.`,
          );
        } else {
          Alert.alert('Queued', `Entry request queued for payment approval (${count} bracket${count !== 1 ? 's' : ''}).`);
        }
        setModal(false);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Unable to queue request');
      }
    };

    if (existingTotal > 0) {
      const details = pendingCount > 0
        ? `${paidCount} paid + ${pendingCount} pending`
        : `${paidCount} paid`;
      Alert.alert(
        'Add to Existing Entry?',
        `You already have ${existingTotal} bracket${existingTotal !== 1 ? 's' : ''} (${details}) in this tournament. Add ${count} more?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Entries', onPress: () => { void submitRequest(); } },
        ],
      );
      return;
    }

    await submitRequest();
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
          const paidCount = player ? (c.userBracketCounts?.[player.id] || 0) : 0;
          const pending = player ? (c.pendingEntryRequests || []).find(req => req.playerId === player.id) : null;
          const pendingCount = pending?.bracketCount || 0;
          const hasEntries = paidCount + pendingCount > 0;
          const sourceName = c.scoreSourceCohortId ? sourceNameMap.get(c.scoreSourceCohortId) : null;
          const description = getTournamentDescription(c, { scoreSourceName: sourceName || null });
          const centerSummary = summarizeBowlingCenters(c.centers || []);

          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Text style={styles.cardDetail}>{c.tournamentKind} | {c.type} | {new Date(c.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.cardCenter}>{centerSummary}</Text>
                <Text style={styles.cardDescription} numberOfLines={3}>{description}</Text>
                {paidCount > 0 && (
                  <Text style={styles.paidBadge}>Paid for {paidCount} bracket{paidCount !== 1 ? 's' : ''}</Text>
                )}
                {!!pending && (
                  <Text style={styles.pendingBadge}>
                    Pending payment for {pendingCount} bracket{pendingCount !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(c)}>
                <Text style={styles.joinBtnText}>{hasEntries ? 'Add Entries' : 'Request Entry'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Entry: {selectedCohort?.name}</Text>
            <Text style={styles.modalSub}>How many brackets are you requesting?</Text>
            <Text style={styles.costInfo}>Request will remain pending until admin marks payment received.</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={bracketCount}
                onChangeText={setBracketCount}
                keyboardType="numeric"
                autoFocus
              />
              <Text style={styles.totalText}>Requested total: ${(parseInt(bracketCount, 10) || 0) * 5}</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmJoin}>
                <Text style={styles.confirmText}>Queue Request</Text>
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
  sectionTitle: { color: Colors.white, fontSize: 18, fontFamily: Fonts.bodyBold, marginBottom: 16 },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bodySemiBold, marginBottom: 4 },
  cardDetail: { color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.bodyRegular },
  cardCenter: { color: Colors.info, fontSize: 12, marginTop: 4, fontFamily: Fonts.bodySemiBold },
  cardDescription: { color: Colors.textPrimary, fontSize: 12, lineHeight: 17, marginTop: 8, fontFamily: Fonts.bodyRegular },
  paidBadge: { color: Colors.success, fontSize: 12, marginTop: 6, fontFamily: Fonts.bodySemiBold },
  pendingBadge: { color: Colors.warning, fontSize: 12, marginTop: 4, fontFamily: Fonts.bodySemiBold },
  joinBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  joinBtnText: { color: Colors.white, fontFamily: Fonts.bodyBold, fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bodyBold },
  emptySub: { color: Colors.textSecondary, fontSize: 14, fontFamily: Fonts.bodyRegular },
  overlay: { flex: 1, backgroundColor: Colors.overlayMedium, justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: Colors.surface,
    width: '85%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { color: Colors.white, fontSize: 20, fontFamily: Fonts.bodyBold, marginBottom: 8, textAlign: 'center' },
  modalSub: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 4, fontFamily: Fonts.bodyRegular },
  costInfo: { color: Colors.primary, textAlign: 'center', marginBottom: 20, fontFamily: Fonts.bodySemiBold, fontSize: 12 },
  inputWrap: { alignItems: 'center', marginBottom: 24 },
  input: {
    backgroundColor: Colors.background,
    width: 80,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.white,
    fontSize: 24,
    fontFamily: Fonts.scoreBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  totalText: { color: Colors.white, fontFamily: Fonts.scoreBold },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: { color: Colors.textSecondary, fontFamily: Fonts.bodyBold },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.success, alignItems: 'center' },
  confirmText: { color: Colors.white, fontFamily: Fonts.bodyBold },
});
