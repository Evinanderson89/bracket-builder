import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function UserDashboardScreen() {
  const router = useRouter();
  const { user, signOut, switchToAdmin } = useAuth();
  const { brackets, cohorts, users, getPlayerPayouts } = useApp();

  // Find the player profile linked to this user's email
  const playerProfile = useMemo(() => {
    if (!user?.email) return null;
    return users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
  }, [users, user]);

  // Get user's brackets
  const userBrackets = useMemo(() => {
    if (!playerProfile) return [];
    return brackets.filter(b =>
      b.players.some(p => p.id === playerProfile.id)
    ).map(bracket => {
      const cohort = cohorts.find(c => c.id === bracket.cohortId);
      return { bracket, cohort };
    });
  }, [brackets, cohorts, playerProfile]);

  // Get user's payouts
  const userPayouts = useMemo(() => {
    if (!playerProfile) return [];
    return getPlayerPayouts(playerProfile.name, null);
  }, [playerProfile, getPlayerPayouts]);

  const totalPayout = userPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="My Dashboard" showBack={false} />
      
      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {playerProfile ? (
            <View style={styles.statsRow}>
              <Text style={styles.statText}>
                Avg: {playerProfile.average} | Hdcp: {playerProfile.handicap}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createProfileButton}
              onPress={() => router.push('/user-profile')}
            >
              <Text style={styles.createProfileText}>Create Player Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userBrackets.length}</Text>
            <Text style={styles.statLabel}>Active Brackets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalPayout}</Text>
            <Text style={styles.statLabel}>Total Payouts</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {!playerProfile && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/user-profile')}
            >
              <Text style={styles.actionButtonText}>📝 Create Player Profile</Text>
            </TouchableOpacity>
          )}

          {playerProfile && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/user-brackets')}
              >
                <Text style={styles.actionButtonText}>🏆 My Brackets ({userBrackets.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/user-stats')}
              >
                <Text style={styles.actionButtonText}>📊 My Stats</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/user-entry')}
              >
                <Text style={styles.actionButtonText}>➕ Enter Tournament</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.switchButton]}
            onPress={async () => {
              await switchToAdmin();
              router.replace('/');
            }}
          >
            <Text style={styles.actionButtonText}>⚙️ Switch to Admin View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  userCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  statsRow: {
    marginTop: 8,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  createProfileButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  createProfileText: {
    color: Colors.white,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    backgroundColor: Colors.accent,
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: Colors.danger,
    marginTop: 12,
  },
});

