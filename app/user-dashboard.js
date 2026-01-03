import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function UserDashboard() {
  const router = useRouter();
  const { user, signOut, switchToAdmin } = useAuth();
  const { users, addUser } = useApp();
  const [playerRecord, setPlayerRecord] = useState(null);

  // Sync Auth User with App Data User
  useEffect(() => {
    if (user && users.length > 0) {
      // Try to find player by name
      const found = users.find(u => u.name.toLowerCase() === user.name.toLowerCase());
      setPlayerRecord(found);
    }
  }, [user, users]);

  const handleCreateProfile = async () => {
    try {
      const newPlayer = {
        name: user.name,
        average: 200, // Default
        handicap: 0,
        numBrackets: 1
      };
      await addUser(newPlayer);
      Alert.alert("Success", "Player profile created!");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="Player Dashboard" showBack={false} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user.name}</Text>
          
          {!playerRecord ? (
            <TouchableOpacity style={styles.createProfileBtn} onPress={handleCreateProfile}>
              <Text style={styles.createProfileText}>⚠️ Create Player Profile</Text>
            </TouchableOpacity>
          ) : (
             <Text style={styles.playerStats}>
               Avg: {playerRecord.average} • Hdcp: {playerRecord.handicap}
             </Text>
          )}
        </View>

        <View style={styles.grid}>
          <TouchableOpacity 
            style={[styles.card, styles.entryCard]} 
            onPress={() => router.push('/user-entry')}
          >
            <Text style={styles.cardIcon}>🎟️</Text>
            <Text style={styles.cardTitle}>Enter Tournament</Text>
            <Text style={styles.cardSub}>Join upcoming events</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.bracketsCard]} 
            onPress={() => router.push('/user-brackets')}
          >
            <Text style={styles.cardIcon}>🏆</Text>
            <Text style={styles.cardTitle}>My Brackets</Text>
            <Text style={styles.cardSub}>View live results</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.statsCard]} 
            onPress={() => router.push('/user-stats')}
          >
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>My Stats</Text>
            <Text style={styles.cardSub}>P&L and History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.profileCard]} 
            onPress={() => router.push('/user-profile')}
          >
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>My Profile</Text>
            <Text style={styles.cardSub}>Edit details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
             <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminLink} onPress={() => { switchToAdmin(); router.replace('/'); }}>
             <Text style={styles.adminLinkText}>Switch to Admin View</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.headerDark },
  content: { padding: 20 },
  welcomeSection: { marginBottom: 30, alignItems: 'center' },
  welcomeText: { color: Colors.textLight, fontSize: 16 },
  userName: { color: Colors.white, fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  playerStats: { color: Colors.primary, fontWeight: 'bold', fontSize: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  createProfileBtn: { backgroundColor: Colors.warning, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createProfileText: { color: Colors.headerDark, fontWeight: 'bold' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  card: { width: '47%', backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, aspectRatio: 1 },
  cardIcon: { fontSize: 32, marginBottom: 12 },
  cardTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 4, textAlign: 'center' },
  cardSub: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
  
  entryCard: { borderColor: Colors.primary },
  bracketsCard: { borderColor: Colors.success },
  statsCard: { borderColor: Colors.accent },
  profileCard: { borderColor: Colors.textLight },

  footer: { marginTop: 40, alignItems: 'center', gap: 16 },
  signOutBtn: { padding: 12 },
  signOutText: { color: Colors.danger, fontWeight: 'bold' },
  adminLink: { padding: 12 },
  adminLinkText: { color: Colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' }
});