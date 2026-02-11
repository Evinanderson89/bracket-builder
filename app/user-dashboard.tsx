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
  const { users, addUser } = useApp();
  const [playerRecord, setPlayerRecord] = useState<Player | null>(null);

  useEffect(() => {
    if (user && users.length > 0) {
      const found = users.find(u => u.name.toLowerCase() === user.name.toLowerCase());
      setPlayerRecord(found ?? null);
    }
  }, [user, users]);

  const handleCreateProfile = async () => {
    if (!user) return;
    try {
      await addUser({ name: user.name, average: 200, handicap: 0, numBrackets: 1, email: user.email } as any);
      Alert.alert('Success', 'Player profile created!');
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
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateProfile}>
              <Text style={styles.createBtnText}>Create Player Profile</Text>
            </TouchableOpacity>
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
  createBtn: { backgroundColor: Colors.warning, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createBtnText: { color: Colors.headerDark, fontWeight: 'bold' },
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
