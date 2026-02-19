import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/fonts';
import { getProgressionTier, TierStyles } from '../styles/progression';
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

  const tier = useMemo(() => {
    if (!profile) return TierStyles.matte;
    return TierStyles[getProgressionTier(profile.average)];
  }, [profile]);

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
      {profile && (
        <View style={styles.tierBar}>
          <View style={[styles.tierIndicator, { borderColor: tier.borderColor, backgroundColor: `${tier.borderColor}20` }]}>
            <Text style={[styles.tierText, { color: tier.accentColor }]}>
              {getProgressionTier(profile.average).toUpperCase()} TIER
            </Text>
          </View>
        </View>
      )}
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
            style={[styles.card, { borderColor: tier.borderColor, borderWidth: tier.borderWidth }, !isActive && styles.cardDone, isEliminated && styles.cardElim]}
            onPress={() => router.push({ pathname: '/bracket-edit' as any, params: { bracketId: bracket.id, cohortId: cohort?.id } })}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: tier.scoreColor }]}>{cohort?.name || 'Unknown'}</Text>
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
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, fontFamily: Fonts.bodyRegular },
  enterBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  enterBtnText: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  card: { backgroundColor: Colors.surface, margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  cardDone: { opacity: 0.7 },
  cardElim: { borderColor: Colors.danger, opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontFamily: Fonts.bodySemiBold, color: Colors.white, flex: 1 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: Colors.badgeActiveBg },
  badgeElim: { backgroundColor: Colors.badgeDangerBg },
  badgeDone: { backgroundColor: Colors.badgeSuccessBg },
  badgeText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.white },
  cardInfo: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8, fontFamily: Fonts.bodyRegular },
  winnerInfo: { flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  winnerLabel: { fontSize: 14, color: Colors.textSecondary, fontFamily: Fonts.bodyRegular },
  winnerName: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.accent },
  tierBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tierIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 1.5,
  },
});
