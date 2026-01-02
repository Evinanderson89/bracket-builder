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

export default function UserBracketsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { brackets, cohorts, users } = useApp();

  // Find the player profile
  const playerProfile = useMemo(() => {
    if (!user?.email) return null;
    return users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
  }, [users, user]);

  // Get user's brackets
  const userBrackets = useMemo(() => {
    if (!playerProfile) return [];
    return brackets
      .filter(b => b.players.some(p => p.id === playerProfile.id))
      .map(bracket => {
        const cohort = cohorts.find(c => c.id === bracket.cohortId);
        const isActive = !bracket.structure.completed;
        const isEliminated = bracket.structure.rounds.some(round =>
          round.some(match =>
            match.completed &&
            (match.player1?.id === playerProfile.id || match.player2?.id === playerProfile.id) &&
            match.winner?.id !== playerProfile.id
          )
        );
        return { bracket, cohort, isActive, isEliminated };
      })
      .sort((a, b) => {
        // Active brackets first, then by completion status
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.bracket.createdAt.localeCompare(a.bracket.createdAt);
      });
  }, [brackets, cohorts, playerProfile]);

  if (!playerProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="My Brackets" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please create a player profile first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="My Brackets" />
      
      <ScrollView style={styles.content}>
        {userBrackets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You're not in any brackets yet</Text>
            <TouchableOpacity
              style={styles.enterButton}
              onPress={() => router.push('/user-entry')}
            >
              <Text style={styles.enterButtonText}>Enter a Tournament</Text>
            </TouchableOpacity>
          </View>
        ) : (
          userBrackets.map(({ bracket, cohort, isActive, isEliminated }) => (
            <TouchableOpacity
              key={bracket.id}
              style={[
                styles.bracketCard,
                !isActive && styles.bracketCardComplete,
                isEliminated && styles.bracketCardEliminated,
              ]}
              onPress={() => router.push({
                pathname: '/bracket-edit',
                params: { bracketId: bracket.id, cohortId: cohort?.id },
              })}
            >
              <View style={styles.bracketHeader}>
                <Text style={styles.bracketTitle}>
                  {cohort?.name || 'Unknown Tournament'}
                </Text>
                <View style={[
                  styles.statusBadge,
                  isActive && !isEliminated && styles.statusBadgeActive,
                  isEliminated && styles.statusBadgeEliminated,
                  !isActive && styles.statusBadgeComplete,
                ]}>
                  <Text style={styles.statusText}>
                    {isEliminated ? 'Eliminated' : isActive ? 'Active' : 'Complete'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.bracketInfo}>
                Bracket {bracket.bracketNumber} • {cohort?.type || 'Unknown'}
              </Text>
              
              {bracket.structure.winner && (
                <View style={styles.winnerInfo}>
                  <Text style={styles.winnerLabel}>Winner: </Text>
                  <Text style={styles.winnerName}>
                    {bracket.structure.winner.name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
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
    marginBottom: 24,
  },
  enterButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  enterButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  bracketCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bracketCardComplete: {
    opacity: 0.7,
  },
  bracketCardEliminated: {
    borderColor: Colors.danger,
    opacity: 0.6,
  },
  bracketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bracketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusBadgeEliminated: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusBadgeComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
  },
  bracketInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  winnerInfo: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  winnerLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.accent,
  },
});

