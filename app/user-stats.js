import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function UserStatsScreen() {
  const { user } = useAuth();
  const { brackets, cohorts, users, games, getPlayerPayouts } = useApp();

  // Find the player profile
  const playerProfile = useMemo(() => {
    if (!user?.email) return null;
    return users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
  }, [users, user]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!playerProfile) return null;

    const userBrackets = brackets.filter(b =>
      b.players.some(p => p.id === playerProfile.id)
    );

    const userGames = games.filter(g =>
      g.playerId === playerProfile.id
    );

    const completedBrackets = userBrackets.filter(b => b.structure.completed);
    const activeBrackets = userBrackets.filter(b => !b.structure.completed);
    
    const wins = userBrackets.filter(b => 
      b.structure.winner?.id === playerProfile.id
    ).length;

    const payouts = getPlayerPayouts(playerProfile.name, null);
    const totalPayout = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate average score
    const scores = userGames
      .map(g => g.score)
      .filter(s => s != null);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    // Calculate best score
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      totalBrackets: userBrackets.length,
      activeBrackets: activeBrackets.length,
      completedBrackets: completedBrackets.length,
      wins,
      totalPayout,
      totalGames: userGames.length,
      avgScore,
      bestScore,
    };
  }, [playerProfile, brackets, games, getPlayerPayouts]);

  if (!playerProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="My Stats" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please create a player profile first</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="My Stats" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stats available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="My Stats" />
      
      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <Text style={styles.profileName}>{playerProfile.name}</Text>
          <Text style={styles.profileInfo}>
            Average: {playerProfile.average} • Handicap: {playerProfile.handicap}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalBrackets}</Text>
            <Text style={styles.statLabel}>Total Brackets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeBrackets}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${stats.totalPayout}</Text>
            <Text style={styles.statLabel}>Total Payouts</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Statistics</Text>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Games Played:</Text>
            <Text style={styles.statRowValue}>{stats.totalGames}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Average Score:</Text>
            <Text style={styles.statRowValue}>{stats.avgScore || 'N/A'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Best Score:</Text>
            <Text style={styles.statRowValue}>{stats.bestScore || 'N/A'}</Text>
          </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  profileInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
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
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statRowLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

