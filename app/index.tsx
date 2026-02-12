import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    {
      label: 'Manage Players',
      sub: 'Roster updates and player access',
      route: '/players',
      icon: 'people-outline' as const,
      tint: Colors.primary,
    },
    {
      label: 'Tournaments',
      sub: 'Create, launch, and manage events',
      route: '/cohorts',
      icon: 'trophy-outline' as const,
      tint: Colors.info,
    },
    {
      label: 'Enter Scores',
      sub: 'Live game updates and results',
      route: '/game-entry',
      icon: 'clipboard-outline' as const,
      tint: Colors.success,
    },
    {
      label: 'View Payouts',
      sub: 'Track payouts and player performance',
      route: '/payout',
      icon: 'cash-outline' as const,
      tint: Colors.accent,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="Bracket Builder" showBack={false} showHome={false} />

      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbAccent} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>LIVE OPERATIONS</Text>
          <Text style={styles.heroTitle}>Run tournaments with a clean control center.</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{activeCohorts}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{totalPlayers}</Text>
              <Text style={styles.statLabel}>Players</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{brackets.length}</Text>
              <Text style={styles.statLabel}>Brackets</Text>
            </View>
          </View>
        </View>

        <View style={styles.roleBanner}>
          <View style={styles.roleIconWrap}>
            <Ionicons name="sparkles" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleLabel}>Administrator Mode</Text>
            <Text style={styles.roleSub}>Switch to player view to review the app exactly as participants see it.</Text>
          </View>
          <TouchableOpacity style={styles.switchBtn} onPress={handlePlayerSwitch} activeOpacity={0.85}>
            <Text style={styles.switchBtnText}>{user ? 'Player View' : 'Player Login'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionList}>
          {navItems.map(item => (
            <TouchableOpacity
              key={item.route}
              style={styles.actionCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.86}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${item.tint}30` }]}>
                <Ionicons name={item.icon} size={16} color={item.tint} />
              </View>
              <View style={styles.actionBody}>
                <Text style={styles.actionTitle}>{item.label}</Text>
                <Text style={styles.actionSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin' as any)} activeOpacity={0.86}>
          <View style={styles.adminBtnIcon}>
            <Ionicons name="settings" size={16} color={Colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminBtnTitle}>Admin Settings</Text>
            <Text style={styles.adminBtnSub}>Authentication, data controls, and system tools</Text>
          </View>
          <Ionicons name="open-outline" size={17} color={Colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bgOrbPrimary: {
    position: 'absolute',
    top: 45,
    right: -95,
    width: 250,
    height: 250,
    borderRadius: 250,
    backgroundColor: Colors.glowPrimary,
  },
  bgOrbAccent: {
    position: 'absolute',
    bottom: 20,
    left: -110,
    width: 270,
    height: 270,
    borderRadius: 270,
    backgroundColor: Colors.glowAccent,
  },
  content: { padding: 18, alignItems: 'center', paddingBottom: 28 },
  heroCard: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 8,
  },
  heroKicker: { color: Colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1.2 },
  heroTitle: { color: Colors.white, fontSize: 24, fontWeight: '800', lineHeight: 29, marginTop: 6 },
  heroStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    minWidth: 88,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statValue: { color: Colors.white, fontWeight: '800', fontSize: 19 },
  statLabel: { color: 'rgba(234, 242, 255, 0.84)', fontSize: 11, marginTop: 2 },
  roleBanner: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  roleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 34,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}22`,
    borderWidth: 1,
    borderColor: `${Colors.primary}55`,
  },
  roleLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  roleSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 1, lineHeight: 16 },
  switchBtn: {
    marginLeft: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  switchBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 12 },
  sectionTitle: {
    width: '100%',
    maxWidth: 640,
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  actionList: { width: '100%', maxWidth: 640 },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  actionBody: { flex: 1, paddingHorizontal: 10 },
  actionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  actionSub: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16, marginTop: 3 },
  adminBtn: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.tabBar,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  adminBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 10,
  },
  adminBtnTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  adminBtnSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
});
