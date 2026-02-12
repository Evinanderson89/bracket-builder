import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import type { Player } from '../utils/types';

type SortKey = 'name' | 'average' | 'payout';

export default function PlayersScreen() {
  const router = useRouter();
  const {
    users, addUser, updateUser, deleteUser, brackets, cohorts, payouts,
    playerRequests, approvePlayerRequest, rejectPlayerRequest,
  } = useApp();

  const [selected, setSelected] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [showForm, setShowForm] = useState<'add' | 'edit' | 'detail-edit' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formAvg, setFormAvg] = useState('');
  const [formHdcp, setFormHdcp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNumBrackets, setFormNumBrackets] = useState('1');
  const [formAliases, setFormAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');

  const getTotalPayout = useCallback((name: string) =>
    payouts.filter(p => p.playerName?.toLowerCase() === name.toLowerCase() && !p.isOperator)
      .reduce((s, p) => s + (p.amount || 0), 0), [payouts]);

  const isInActiveBracket = (uid: string) => {
    const active = cohorts.filter(c => c.status === 'active');
    return brackets.some(b => active.some(c => c.id === b.cohortId) && b.players.some(p => p.id === uid));
  };

  const sorted = useMemo(() => {
    const copy = [...users];
    if (sortBy === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'average') return copy.sort((a, b) => (b.average || 0) - (a.average || 0));
    return copy.sort((a, b) => getTotalPayout(b.name) - getTotalPayout(a.name));
  }, [users, sortBy, getTotalPayout]);

  const pendingRequests = useMemo(() => {
    return playerRequests
      .filter(r => r.status === 'pending')
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [playerRequests]);

  const openAdd = () => { setFormName(''); setFormAvg(''); setFormHdcp(''); setShowForm('add'); };
  const openEdit = (u: Player) => {
    setFormName(u.name); setFormAvg(u.average.toString()); setFormHdcp(u.handicap.toString());
    setSelected(u.id); setShowForm('edit');
  };
  const openDetailEdit = (u: Player) => {
    setFormName(u.name);
    setFormAvg(u.average.toString());
    setFormHdcp(u.handicap.toString());
    setFormEmail(u.email || '');
    setFormNumBrackets(u.numBrackets.toString());
    setFormAliases(u.aliases ? [...u.aliases] : []);
    setNewAlias('');
    setSelected(u.id);
    setShowForm('detail-edit');
  };

  const addAlias = () => {
    const trimmed = newAlias.trim();
    if (!trimmed) return;
    if (formAliases.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This alias already exists');
      return;
    }
    setFormAliases([...formAliases, trimmed]);
    setNewAlias('');
  };

  const removeAlias = (index: number) => {
    setFormAliases(formAliases.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim() || !formAvg || !formHdcp) {
      Alert.alert('Error', 'Name, Average, and Handicap are required'); return;
    }
    try {
      if (showForm === 'add') {
        await addUser({ name: formName.trim(), average: parseInt(formAvg), handicap: parseInt(formHdcp), numBrackets: 1 } as any);
        Alert.alert('Success', 'Player added');
      } else if (selected && showForm === 'detail-edit') {
        await updateUser(selected, {
          name: formName.trim(),
          average: parseInt(formAvg),
          handicap: parseInt(formHdcp),
          email: formEmail.trim() || undefined,
          numBrackets: parseInt(formNumBrackets) || 1,
          aliases: formAliases.length > 0 ? formAliases : undefined,
        });
        Alert.alert('Success', 'Player updated');
      } else if (selected) {
        await updateUser(selected, { name: formName.trim(), average: parseInt(formAvg), handicap: parseInt(formHdcp) });
        Alert.alert('Success', 'Player updated');
      }
      setShowForm(null); setSelected(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Operation failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (isInActiveBracket(deleteTarget.id)) {
      Alert.alert('Cannot Delete', 'Player is in an active bracket');
      setDeleteTarget(null); return;
    }
    try {
      await deleteUser(deleteTarget.id);
      if (selected === deleteTarget.id) setSelected(null);
      Alert.alert('Success', 'Player deleted');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setDeleteTarget(null);
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approvePlayerRequest(requestId);
      Alert.alert('Approved', 'Player was added and request marked approved.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectPlayerRequest(requestId);
      Alert.alert('Rejected', 'Request has been rejected.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject request');
    }
  };

  const selectedUser = users.find(u => u.id === selected);

  // ─── Detail Edit Form View ──────────────────────────────────────────────

  if (showForm === 'detail-edit') {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="Detailed Edit Player" />
        <ScrollView contentContainerStyle={styles.formWrap}>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput style={styles.input} value={formName} onChangeText={setFormName}
              placeholder="Player name" placeholderTextColor={Colors.textLight} />

            <Text style={styles.formLabel}>Email</Text>
            <TextInput style={styles.input} value={formEmail} onChangeText={setFormEmail}
              placeholder="Email address" placeholderTextColor={Colors.textLight}
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.formLabel}>Average</Text>
            <TextInput style={styles.input} value={formAvg} onChangeText={setFormAvg}
              placeholder="Average" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

            <Text style={styles.formLabel}>Handicap</Text>
            <TextInput style={styles.input} value={formHdcp} onChangeText={setFormHdcp}
              placeholder="Handicap" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

            <Text style={styles.formLabel}>Default Brackets</Text>
            <TextInput style={styles.input} value={formNumBrackets} onChangeText={setFormNumBrackets}
              placeholder="Number of brackets" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

            <Text style={styles.formLabel}>Aliases</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={newAlias} onChangeText={setNewAlias}
                placeholder="Add alias..." placeholderTextColor={Colors.textLight}
                onSubmitEditing={addAlias} />
              <TouchableOpacity style={styles.aliasAddBtn} onPress={addAlias}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.aliasChipWrap}>
              {formAliases.map((alias, idx) => (
                <View key={idx} style={styles.aliasChip}>
                  <Text style={styles.aliasChipText}>{alias}</Text>
                  <TouchableOpacity onPress={() => removeAlias(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.aliasChipRemove}>x</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {formAliases.length === 0 && (
                <Text style={{ color: Colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}>No aliases</Text>
              )}
            </View>

            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Simple Form View ─────────────────────────────────────────────────

  if (showForm) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title={showForm === 'add' ? 'Add Player' : 'Edit Player'} />
        <View style={styles.formWrap}>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput style={styles.input} value={formName} onChangeText={setFormName}
              placeholder="Player name" placeholderTextColor={Colors.textLight} />

            <Text style={styles.formLabel}>Average</Text>
            <TextInput style={styles.input} value={formAvg} onChangeText={setFormAvg}
              placeholder="Average" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

            <Text style={styles.formLabel}>Handicap</Text>
            <TextInput style={styles.input} value={formHdcp} onChangeText={setFormHdcp}
              placeholder="Handicap" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{showForm === 'add' ? 'Add' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main View ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Manage Players" />

      <View style={styles.body}>
        {/* Left: Player List */}
        <View style={styles.listCol}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Players ({users.length})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Bar */}
          <View style={styles.sortBar}>
            {(['name', 'average', 'payout'] as SortKey[]).map(k => (
              <TouchableOpacity
                key={k} style={[styles.sortChip, sortBy === k && styles.sortChipActive]}
                onPress={() => setSortBy(k)}
              >
                <Text style={[styles.sortChipText, sortBy === k && styles.sortChipTextActive]}>
                  {k === 'name' ? 'A-Z' : k === 'average' ? 'Avg' : 'Payout'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.list}>
            {pendingRequests.length > 0 && (
              <View style={styles.requestSection}>
                <Text style={styles.requestTitle}>Pending Requests ({pendingRequests.length})</Text>
                {pendingRequests.map(req => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{req.name}</Text>
                      <Text style={styles.requestEmail}>{req.email}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestBtn, styles.requestApprove]}
                        onPress={() => handleApproveRequest(req.id)}
                      >
                        <Text style={styles.requestBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestBtn, styles.requestReject]}
                        onPress={() => handleRejectRequest(req.id)}
                      >
                        <Text style={styles.requestBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {sorted.length === 0 ? (
              <Text style={styles.emptyText}>No players yet</Text>
            ) : sorted.map(u => {
              const bracketCount = brackets.filter(b => b.players.some(p => p.id === u.id)).length;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.listItem, selected === u.id && styles.listItemActive]}
                  onPress={() => setSelected(u.id)}
                >
                  <Text style={[styles.listItemName, selected === u.id && styles.textWhite]}>
                    {u.name}{' '}
                    <Text style={{ fontSize: 12, opacity: 0.7 }}>({bracketCount})</Text>
                  </Text>
                  <Text style={[styles.listItemSub, selected === u.id && { color: 'rgba(255,255,255,0.8)' }]}>
                    Avg: {u.average} | Hdcp: {u.handicap}
                    {sortBy === 'payout' ? ` | $${getTotalPayout(u.name)}` : ''}
                    {u.aliases && u.aliases.length > 0 ? ` | aka: ${u.aliases.join(', ')}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Right: Actions */}
        <View style={styles.actionCol}>
          <Text style={styles.actionTitle}>Actions</Text>
          {selectedUser ? (
            <View style={styles.actions}>
              <View style={styles.infoCard}>
                <Text style={styles.infoName}>{selectedUser.name}</Text>
                <Text style={styles.infoSub}>Avg: {selectedUser.average} | Hdcp: {selectedUser.handicap}</Text>
                {selectedUser.email && <Text style={styles.infoSub}>{selectedUser.email}</Text>}
                {selectedUser.aliases && selectedUser.aliases.length > 0 && (
                  <Text style={styles.infoSub}>aka: {selectedUser.aliases.join(', ')}</Text>
                )}
                {isInActiveBracket(selectedUser.id) && (
                  <Text style={styles.warningText}>In active bracket</Text>
                )}
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(selectedUser)}>
                <Text style={styles.actionBtnText}>Edit Player</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.detailEditBtn]} onPress={() => openDetailEdit(selectedUser)}>
                <Text style={styles.actionBtnText}>Detailed Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn, isInActiveBracket(selectedUser.id) && styles.disabledBtn]}
                onPress={() => setDeleteTarget(selectedUser)}
                disabled={isInActiveBracket(selectedUser.id)}
              >
                <Text style={styles.actionBtnText}>Delete Player</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.payoutBtn]}
                onPress={() => router.push({ pathname: '/payout' as any, params: { searchName: selectedUser.name } })}
              >
                <Text style={styles.actionBtnText}>View Payouts</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Select a player</Text>
            </View>
          )}
        </View>
      </View>

      {/* Delete Modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Delete {deleteTarget?.name}?</Text>
            <Text style={styles.modalSub}>This action cannot be undone.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.danger }]} onPress={confirmDelete}>
                <Text style={styles.saveBtnText}>Delete</Text>
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
  body: { flex: 1, flexDirection: 'row' },
  // List column
  listCol: { flex: 1, borderRightWidth: 1, borderRightColor: Colors.border, backgroundColor: Colors.surface },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.headerDark,
  },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: Colors.white, fontWeight: '600' },
  sortBar: {
    flexDirection: 'row', padding: 10, gap: 6, borderBottomWidth: 1,
    borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary,
  },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortChipText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  sortChipTextActive: { color: Colors.white },
  list: { flex: 1 },
  requestSection: {
    margin: 12, padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.warning, backgroundColor: 'rgba(245,158,11,0.08)',
  },
  requestTitle: { color: Colors.warning, fontWeight: 'bold', marginBottom: 10 },
  requestCard: {
    padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, marginBottom: 8,
  },
  requestInfo: { marginBottom: 8 },
  requestName: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  requestEmail: { color: Colors.textSecondary, fontSize: 12 },
  requestActions: { flexDirection: 'row', gap: 8 },
  requestBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  requestApprove: { backgroundColor: Colors.success },
  requestReject: { backgroundColor: Colors.danger },
  requestBtnText: { color: Colors.white, fontWeight: '600', fontSize: 12 },
  listItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  listItemActive: { backgroundColor: Colors.primary },
  listItemName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  textWhite: { color: Colors.white },
  listItemSub: { fontSize: 12, color: Colors.textSecondary },
  // Action column
  actionCol: { flex: 1, backgroundColor: Colors.background },
  actionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, padding: 16 },
  actions: { padding: 16, gap: 12 },
  infoCard: {
    backgroundColor: Colors.surface, padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  infoName: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  infoSub: { fontSize: 14, color: Colors.textSecondary },
  warningText: { color: Colors.danger, fontSize: 12, fontWeight: '600', marginTop: 8 },
  actionBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  deleteBtn: { backgroundColor: Colors.danger },
  detailEditBtn: { backgroundColor: Colors.accent },
  payoutBtn: { backgroundColor: Colors.success },
  disabledBtn: { opacity: 0.4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: 20 },
  // Form
  formWrap: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  formCard: {
    width: '100%', maxWidth: 500, backgroundColor: Colors.surface, borderRadius: 12,
    padding: 24, borderWidth: 1, borderColor: Colors.border,
  },
  formLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, fontSize: 16, color: Colors.textPrimary,
  },
  formBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textPrimary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontWeight: '600' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 24, width: '85%',
    borderWidth: 1, borderColor: Colors.danger,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.danger, marginBottom: 8 },
  modalSub: { color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  // Alias styles
  aliasAddBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, justifyContent: 'center',
  },
  aliasChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  aliasChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  aliasChipText: { color: Colors.textPrimary, fontSize: 14, marginRight: 8 },
  aliasChipRemove: { color: Colors.danger, fontWeight: 'bold', fontSize: 14 },
});
