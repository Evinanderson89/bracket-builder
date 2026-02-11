import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading: authLoading, switchToUser } = useAuth();
  const { cohorts, brackets, loading: appLoading } = useApp();

  if (authLoading || appLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const activeCohorts = cohorts.filter(c => c.status === 'active').length;
  const totalPlayers = new Set(brackets.flatMap(b => b.players.map(p => p.id))).size;

  const handlePlayerSwitch = async () => {
    if (user) {
      await switchToUser();
      router.push('/user-dashboard' as any);
    } else {
      router.push('/login' as any);
    }
  };

  const navItems = [
    { label: 'Manage Players', route: '/players', color: Colors.primary },
    { label: 'Tournaments', route: '/cohorts', color: Colors.primary },
    { label: 'Enter Scores', route: '/game-entry', color: Colors.primary },
    { label: 'View Payouts', route: '/payout', color: Colors.primary },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="Bracket Builder" showBack={false} showHome={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Role Banner */}
        <View style={styles.roleBanner}>
          <View>
            <Text style={styles.roleLabel}>ADMINISTRATOR</Text>
            <Text style={styles.roleSub}>
              {activeCohorts} active tournament{activeCohorts !== 1 ? 's' : ''} · {totalPlayers} players
            </Text>
          </View>
          <TouchableOpacity style={styles.switchBtn} onPress={handlePlayerSwitch}>
            <Text style={styles.switchBtnText}>{user ? 'Player View' : 'Player Login'}</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Grid */}
        <View style={styles.grid}>
          {navItems.map(item => (
            <TouchableOpacity
              key={item.route}
              style={styles.navCard}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={styles.navCardText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Admin Settings */}
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => router.push('/admin' as any)}
        >
          <Text style={styles.adminBtnText}>Admin Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.headerDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, alignItems: 'center' },
  roleBanner: {
    width: '100%', maxWidth: 500, backgroundColor: Colors.surface,
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  roleLabel: { color: Colors.accent, fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  roleSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  switchBtn: {
    backgroundColor: Colors.surfaceSecondary, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  switchBtnText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  grid: { width: '100%', maxWidth: 500, gap: 12, marginBottom: 24 },
  navCard: {
    backgroundColor: Colors.primary, padding: 18, borderRadius: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 2,
  },
  navCardText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  adminBtn: {
    width: '100%', maxWidth: 500, backgroundColor: Colors.surface, padding: 18,
    borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  adminBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
});
