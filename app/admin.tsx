import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function AdminScreen() {
  const { getOperatorPayouts, cohorts, deletePassword, setDeletePasswordValue, removeDuplicateUsers, users } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const ops = getOperatorPayouts(selectedDate);
  const totalCut = ops.reduce((s, p) => s + p.amount, 0);

  const handleSavePw = async () => {
    if (!newPw.trim()) { Alert.alert('Error', 'Password cannot be empty'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error', 'Passwords do not match'); return; }
    await setDeletePasswordValue(newPw.trim());
    Alert.alert('Success', 'Password updated');
    setNewPw(''); setConfirmPw(''); setShowPwForm(false);
  };

  const handleRemoveDups = () => {
    Alert.alert('Remove Duplicates', 'This removes users with the same name, keeping the first.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const n = await removeDuplicateUsers();
        Alert.alert(n > 0 ? 'Success' : 'Info', n > 0 ? `Removed ${n} duplicate(s)` : 'No duplicates found');
      }},
    ]);
  };

  const byCohort = ops.reduce<Record<string, typeof ops>>((acc, p) => {
    (acc[p.cohortId] ??= []).push(p); return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Admin Settings" />

      <View style={styles.section}>
        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={selectedDate} onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textLight} />
      </View>

      <View style={styles.section}>
        <TouchableOpacity onPress={() => setShowPwForm(!showPwForm)}>
          <Text style={styles.toggle}>{showPwForm ? '▼' : '▶'} Delete Password</Text>
        </TouchableOpacity>
        {showPwForm && (
          <View style={styles.pwForm}>
            <Text style={styles.pwInfo}>Current: {deletePassword ? '********' : 'Not set'}</Text>
            <Text style={styles.label}>New Password</Text>
            <TextInput style={styles.input} value={newPw} onChangeText={setNewPw}
              secureTextEntry placeholder="New password" placeholderTextColor={Colors.textLight} />
            <Text style={styles.label}>Confirm</Text>
            <TextInput style={styles.input} value={confirmPw} onChangeText={setConfirmPw}
              secureTextEntry placeholder="Confirm" placeholderTextColor={Colors.textLight} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePw}>
              <Text style={styles.saveBtnText}>Save Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Management</Text>
        <Text style={styles.info}>Total Users: {users.length}</Text>
        <TouchableOpacity style={styles.warnBtn} onPress={handleRemoveDups}>
          <Text style={styles.warnBtnText}>Remove Duplicate Users</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Operator Cut</Text>
          <Text style={styles.summaryAmt}>${totalCut.toFixed(2)}</Text>
          <Text style={styles.summarySub}>{ops.length} bracket{ops.length !== 1 ? 's' : ''}</Text>
        </View>

        {Object.keys(byCohort).length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No operator cuts for this date</Text></View>
        ) : Object.entries(byCohort).map(([cid, payouts]) => {
          const c = cohorts.find(c => c.id === cid);
          const total = payouts.reduce((s, p) => s + p.amount, 0);
          return (
            <View key={cid} style={styles.card}>
              <Text style={styles.cardTitle}>{c?.name || 'Unknown'}</Text>
              <Text style={styles.cardAmt}>${total.toFixed(2)}</Text>
              <Text style={styles.cardSub}>{payouts.length} bracket{payouts.length !== 1 ? 's' : ''}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { backgroundColor: Colors.surface, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: Colors.textPrimary },
  toggle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  pwForm: { paddingTop: 16 },
  pwInfo: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12 },
  info: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  warnBtn: { backgroundColor: Colors.warning, padding: 16, borderRadius: 8, alignItems: 'center' },
  warnBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  summaryCard: { backgroundColor: Colors.accent, margin: 16, padding: 20, borderRadius: 8, alignItems: 'center' },
  summaryLabel: { fontSize: 16, color: Colors.white, marginBottom: 8 },
  summaryAmt: { fontSize: 32, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  summarySub: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: Colors.surface, margin: 16, marginTop: 0, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  cardAmt: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  cardSub: { fontSize: 14, color: Colors.textSecondary },
});
