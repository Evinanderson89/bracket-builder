import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { CohortStatus, CohortType } from '../utils/types';
import type { Cohort, CohortTypeValue } from '../utils/types';
import NavigationHeader from '../components/NavigationHeader';

type TabKey = 'active' | 'setup' | 'history';

export default function CohortsScreen() {
  const router = useRouter();
  const { cohorts, addCohort, deleteCohort } = useApp();

  const [tab, setTab] = useState<TabKey>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CohortTypeValue>(CohortType.SCRATCH);
  const [deleteTarget, setDeleteTarget] = useState<Cohort | null>(null);

  const filtered = useMemo(() => {
    const statusMap: Record<TabKey, string> = {
      active: CohortStatus.ACTIVE,
      setup: CohortStatus.NOT_DEPLOYED,
      history: CohortStatus.COMPLETE,
    };
    return cohorts.filter(c => c.status === statusMap[tab]);
  }, [cohorts, tab]);

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Required', 'Enter a tournament name'); return; }
    await addCohort({ name: newName.trim(), type: newType });
    setNewName(''); setShowCreate(false); setTab('setup');
    Alert.alert('Success', 'Tournament created');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCohort(deleteTarget.id);
      Alert.alert('Deleted', `"${deleteTarget.name}" removed`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setDeleteTarget(null);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'setup', label: 'Setup' },
    { key: 'history', label: 'History' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Tournaments" />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            {tab === t.key && <View style={styles.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tab === 'active' ? 'No active tournaments' : tab === 'setup' ? 'No tournaments in setup' : 'No completed tournaments'}
            </Text>
            {tab === 'setup' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyBtnText}>Create One</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filtered.map(c => (
          <TouchableOpacity
            key={c.id} style={[styles.card, tab === 'active' && styles.cardActive]}
            onPress={() => router.push({ pathname: '/cohort-detail' as any, params: { cohortId: c.id } })}
          >
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardType}>{c.type}</Text>
                {c.status === CohortStatus.ACTIVE && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardName}>{c.name}</Text>
              <Text style={styles.cardDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.openBtn}
                onPress={() => router.push({ pathname: '/cohort-detail' as any, params: { cohortId: c.id } })}>
                <Text style={styles.openBtnText}>Open Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delIcon} onPress={() => setDeleteTarget(c)}>
                <Text style={styles.delIconText}>X</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+ New</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Tournament</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Text style={styles.closeText}>X</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName}
              placeholder="e.g. Thursday League" placeholderTextColor={Colors.textLight} autoFocus />
            <Text style={styles.label}>Format</Text>
            <View style={styles.typeRow}>
              {[CohortType.SCRATCH, CohortType.HANDICAP].map(t => (
                <TouchableOpacity key={t} style={[styles.typeBtn, newType === t && styles.typeBtnActive]}
                  onPress={() => setNewType(t)}>
                  <Text style={[styles.typeBtnText, newType === t && styles.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { borderColor: Colors.danger }]}>
            <Text style={[styles.modalTitle, { color: Colors.danger }]}>Delete Tournament?</Text>
            <Text style={styles.deleteSub}>
              Delete {`"${deleteTarget?.name}"`}? All brackets, games, and payouts will be permanently removed.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelBtn} onPress={confirmDelete}>
                <Text style={styles.confirmDelBtnText}>Delete</Text>
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
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', position: 'relative' },
  tabActive: { backgroundColor: Colors.surfaceSecondary },
  tabText: { color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: 'bold' },
  tabLine: { position: 'absolute', bottom: 0, height: 3, width: '100%', backgroundColor: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 16, marginBottom: 16 },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: Colors.white, fontWeight: 'bold' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, borderWidth: 1,
    borderColor: Colors.border, overflow: 'hidden',
  },
  cardActive: { borderColor: Colors.primary, borderWidth: 2 },
  cardBody: { padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardType: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.danger, marginRight: 4 },
  liveText: { color: Colors.danger, fontSize: 10, fontWeight: 'bold' },
  cardName: { fontSize: 20, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  cardDate: { color: Colors.textSecondary, fontSize: 12 },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  openBtn: { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  openBtnText: { color: Colors.primary, fontWeight: 'bold' },
  delIcon: { padding: 12, width: 50, alignItems: 'center', justifyContent: 'center' },
  delIconText: { color: Colors.danger, fontWeight: 'bold' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, backgroundColor: Colors.success,
    paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30,
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, elevation: 8,
  },
  fabText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  closeText: { fontSize: 20, color: Colors.textSecondary, fontWeight: 'bold' },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.white, marginBottom: 20 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.background },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(59,130,246,0.1)' },
  typeBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.primary, fontWeight: 'bold' },
  submitBtn: { backgroundColor: Colors.success, padding: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  deleteSub: { color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.textPrimary, fontWeight: '600' },
  confirmDelBtn: { flex: 1, backgroundColor: Colors.danger, padding: 12, borderRadius: 8, alignItems: 'center' },
  confirmDelBtnText: { color: Colors.white, fontWeight: 'bold' },
});
