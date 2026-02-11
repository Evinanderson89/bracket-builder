import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function UserBracketsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { brackets, cohorts, users } = useApp();

  const profile = useMemo(() => {
    if (!user) return null;
    return users.find(u =>
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
      u.name.toLowerCase() === user.name.toLowerCase()
    );
  }, [users, user]);

  const userBrackets = useMemo(() => {
    if (!profile) return [];
    return brackets
      .filter(b => b.players.some(p => p.id === profile.id))
      .map(b => {
        const cohort = cohorts.find(c => c.id === b.cohortId);
        const isActive = !b.structure.completed;
        const isEliminated = b.structure.rounds.some(r =>
          r.some(m => m.completed && (m.player1?.id === profile.id || m.player2?.id === profile.id) && m.winner?.id !== profile.id)
        );
        return { bracket: b, cohort, isActive, isEliminated };
      })
      .sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return (b.bracket.createdAt || '').localeCompare(a.bracket.createdAt || '');
      });
  }, [brackets, cohorts, profile]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="My Brackets" />
        <View style={styles.center}><Text style={styles.emptyText}>Please create a player profile first</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="My Brackets" />
      <ScrollView style={styles.scroll}>
        {userBrackets.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{"You're not in any brackets yet"}</Text>
            <TouchableOpacity style={styles.enterBtn} onPress={() => router.push('/user-entry' as any)}>
              <Text style={styles.enterBtnText}>Enter a Tournament</Text>
            </TouchableOpacity>
          </View>
        ) : userBrackets.map(({ bracket, cohort, isActive, isEliminated }) => (
          <TouchableOpacity key={bracket.id}
            style={[styles.card, !isActive && styles.cardDone, isEliminated && styles.cardElim]}
            onPress={() => router.push({ pathname: '/bracket-edit' as any, params: { bracketId: bracket.id, cohortId: cohort?.id } })}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{cohort?.name || 'Unknown'}</Text>
              <View style={[
                styles.badge,
                isActive && !isEliminated && styles.badgeActive,
                isEliminated && styles.badgeElim,
                !isActive && styles.badgeDone,
              ]}>
                <Text style={styles.badgeText}>
                  {isEliminated ? 'Eliminated' : isActive ? 'Active' : 'Complete'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>Bracket {bracket.bracketNumber} | {cohort?.type || 'Unknown'}</Text>
            {bracket.structure.winner && (
              <View style={styles.winnerInfo}>
                <Text style={styles.winnerLabel}>Winner: </Text>
                <Text style={styles.winnerName}>{bracket.structure.winner.name}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  enterBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  enterBtnText: { color: Colors.white, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  cardDone: { opacity: 0.7 },
  cardElim: { borderColor: Colors.danger, opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, flex: 1 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: 'rgba(59,130,246,0.2)' },
  badgeElim: { backgroundColor: 'rgba(239,68,68,0.2)' },
  badgeDone: { backgroundColor: 'rgba(16,185,129,0.2)' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: Colors.white },
  cardInfo: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  winnerInfo: { flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  winnerLabel: { fontSize: 14, color: Colors.textSecondary },
  winnerName: { fontSize: 14, fontWeight: 'bold', color: Colors.accent },
});
