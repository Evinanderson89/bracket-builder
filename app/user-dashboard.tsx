import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import type { Player } from '../utils/types';

export default function UserDashboard() {
  const router = useRouter();
  const { user, signOut, switchToAdmin } = useAuth();
  const { users, playerRequests, requestPlayerAccess } = useApp();
  const [playerRecord, setPlayerRecord] = useState<Player | null>(null);

  useEffect(() => {
    if (user && users.length > 0) {
      const found = users.find(u =>
        (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
        u.name.toLowerCase() === user.name.toLowerCase(),
      );
      setPlayerRecord(found ?? null);
    }
  }, [user, users]);

  const pendingRequest = user
    ? playerRequests.find(r => r.email.toLowerCase() === user.email.toLowerCase() && r.status === 'pending')
    : null;
  const rejectedRequest = user
    ? playerRequests.find(r => r.email.toLowerCase() === user.email.toLowerCase() && r.status === 'rejected')
    : null;

  const handleRequestAccess = async () => {
    if (!user) return;
    try {
      await requestPlayerAccess(user);
      Alert.alert('Request Sent', 'Your request has been sent to the admin for approval.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (!user) return null;

  const navItems = [
    { label: 'Enter Tournament', sub: 'Join upcoming events', route: '/user-entry', color: Colors.primary },
    { label: 'My Brackets', sub: 'View live results', route: '/user-brackets', color: Colors.success },
    { label: 'My Stats', sub: 'P&L and history', route: '/user-stats', color: Colors.accent },
    { label: 'My Profile', sub: 'Edit details', route: '/user-profile', color: Colors.textLight },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="Player Dashboard" showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcome}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user.name}</Text>
          {!playerRecord ? (
            <View style={styles.requestWrap}>
              {!pendingRequest ? (
                <TouchableOpacity style={styles.createBtn} onPress={handleRequestAccess}>
                  <Text style={styles.createBtnText}>Request Player Access</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.pendingText}>Request pending admin approval</Text>
              )}
              {rejectedRequest && (
                <Text style={styles.rejectedText}>
                  A prior request was rejected. You can submit again.
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.playerStats}>Avg: {playerRecord.average} | Hdcp: {playerRecord.handicap}</Text>
          )}
        </View>

        <View style={styles.grid}>
          {navItems.map(item => (
            <TouchableOpacity key={item.route} style={[styles.card, { borderColor: item.color }]}
              onPress={() => router.push(item.route as any)}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { switchToAdmin(); router.replace('/' as any); }}>
            <Text style={styles.adminLink}>Switch to Admin View</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.headerDark },
  content: { padding: 20 },
  welcome: { marginBottom: 30, alignItems: 'center' },
  welcomeText: { color: Colors.textLight, fontSize: 16 },
  userName: { color: Colors.white, fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  playerStats: {
    color: Colors.primary, fontWeight: 'bold', fontSize: 14,
    backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  requestWrap: { alignItems: 'center', gap: 8 },
  createBtn: { backgroundColor: Colors.warning, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createBtnText: { color: Colors.headerDark, fontWeight: 'bold' },
  pendingText: {
    color: Colors.warning, fontWeight: 'bold', fontSize: 13,
    backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  rejectedText: { color: Colors.danger, fontSize: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  card: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, aspectRatio: 1.2,
    justifyContent: 'center',
  },
  cardTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 4, textAlign: 'center' },
  cardSub: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
  footer: { marginTop: 40, alignItems: 'center', gap: 16 },
  signOutBtn: { padding: 12 },
  signOutText: { color: Colors.danger, fontWeight: 'bold' },
  adminLink: { color: Colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
});
