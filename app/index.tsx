import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/typography';
import NavigationHeader from '../components/NavigationHeader';
import DrawerMenu from '../components/DrawerMenu';
import { CohortStatus, PayoutAmounts, TournamentKind } from '../utils/types';
import type { Bracket, Player } from '../utils/types';

function isPlayerEliminated(bracket: Bracket, playerId: string) {
  return bracket.structure.rounds.some(round => (
    round.some(match => (
      match.completed
      && (match.player1?.id === playerId || match.player2?.id === playerId)
      && match.winner?.id !== playerId
    ))
  ));
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { users, playerRequests, requestPlayerAccess, brackets, cohorts, payouts, loading: appLoading } = useApp();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [playerRecord, setPlayerRecord] = useState<Player | null>(null);
  const [tournamentsOpen, setTournamentsOpen] = useState(true);

  useEffect(() => {
    if (user && users.length > 0) {
      const found = users.find(u => (
        (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
        || u.name.toLowerCase() === user.name.toLowerCase()
      ));
      setPlayerRecord(found ?? null);
    } else {
      setPlayerRecord(null);
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

  const myBrackets = useMemo(() => {
    if (!playerRecord) return [];
    return brackets.filter(b => b.players.some(p => p.id === playerRecord.id));
  }, [brackets, playerRecord]);

  const activeTournaments = useMemo(() => {
    if (!playerRecord) return [];

    return cohorts
      .filter(c => c.status === CohortStatus.ACTIVE)
      .map(cohort => {
        if (cohort.tournamentKind === TournamentKind.SERIES) {
          const inSeries = (cohort.selectedUserIds || []).includes(playerRecord.id)
            || ((cohort.userBracketCounts?.[playerRecord.id] || 0) > 0);
          if (!inSeries) return null;

          const totalCount = cohort.userBracketCounts?.[playerRecord.id] || 1;
          return {
            id: cohort.id,
            name: cohort.name,
            type: `${cohort.tournamentKind} | ${cohort.type}`,
            createdAtLabel: new Date(cohort.createdAt).toLocaleDateString(),
            createdAtTs: new Date(cohort.createdAt).getTime(),
            totalCount,
            liveCount: totalCount,
            aliveCount: totalCount,
          };
        }

        const userCohortBrackets = myBrackets.filter(b => b.cohortId === cohort.id);
        if (!userCohortBrackets.length) return null;

        const liveBrackets = userCohortBrackets.filter(b => !b.structure.completed);
        const aliveCount = liveBrackets.filter(b => !isPlayerEliminated(b, playerRecord.id)).length;

        return {
          id: cohort.id,
          name: cohort.name,
          type: `${cohort.tournamentKind} | ${cohort.type}`,
          createdAtLabel: new Date(cohort.createdAt).toLocaleDateString(),
          createdAtTs: new Date(cohort.createdAt).getTime(),
          totalCount: userCohortBrackets.length,
          liveCount: liveBrackets.length,
          aliveCount,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.createdAtTs - a.createdAtTs);
  }, [cohorts, myBrackets, playerRecord]);

  const participation = useMemo(() => {
    if (!playerRecord) return null;

    const activeBracketCount = myBrackets.filter(b => !b.structure.completed).length;
    const completedBracketCount = myBrackets.length - activeBracketCount;
    const wins = myBrackets.filter(b => b.structure.winner?.id === playerRecord.id).length;

    const upcomingCount = cohorts.filter(c => (
      c.status === CohortStatus.NOT_DEPLOYED
      && (
        (c.selectedUserIds || []).includes(playerRecord.id)
        || ((c.userBracketCounts?.[playerRecord.id] || 0) > 0)
      )
    )).length;

    const winnings = payouts
      .filter(p => p.playerId === playerRecord.id && !p.isOperator)
      .reduce((sum, p) => sum + p.amount, 0);

    const spend = myBrackets.length * PayoutAmounts.ENTRY_FEE;
    const net = winnings - spend;

    return {
      activeBracketCount,
      completedBracketCount,
      upcomingCount,
      wins,
      entries: myBrackets.length,
      net,
    };
  }, [cohorts, myBrackets, payouts, playerRecord]);

  if (authLoading || appLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Not signed in ── */
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
        <NavigationHeader
          title="Bracket Builder"
          showBack={false}
          showHome={false}
          showHamburger
          onHamburgerPress={() => setDrawerOpen(true)}
        />

        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTag}>BRACKET BUILDER</Text>
            <Text style={styles.heroTitle}>Find tournaments and track your brackets.</Text>
            <Text style={styles.heroSub}>
              Sign in to view your active tournaments, bracket standings, and participation stats.
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => router.push('/login' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={16} color={Colors.headerDark} style={{ marginRight: 6 }} />
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </SafeAreaView>
    );
  }

  /* ── Signed in — player dashboard ── */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader
        title="Bracket Builder"
        showBack={false}
        showHome={false}
        showHamburger
        onHamburgerPress={() => setDrawerOpen(true)}
      />

      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbAccent} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Welcome card ── */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTag}>PLAYER SPACE</Text>
          <Text style={styles.userName}>{user.name}</Text>

          {!playerRecord ? (
            <View style={styles.requestWrap}>
              {!pendingRequest ? (
                <TouchableOpacity style={styles.requestBtn} onPress={handleRequestAccess} activeOpacity={0.85}>
                  <Text style={styles.requestBtnText}>Request Player Access</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.pendingText}>Request pending admin approval</Text>
              )}
              {rejectedRequest && (
                <Text style={styles.rejectedText}>A prior request was rejected. You can submit again.</Text>
              )}
            </View>
          ) : (
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatPill}>
                <Text style={styles.quickStatValue}>{participation?.activeBracketCount ?? 0}</Text>
                <Text style={styles.quickStatLabel}>Active Brackets</Text>
              </View>
              <View style={styles.quickStatPill}>
                <Text style={styles.quickStatValue}>{participation?.upcomingCount ?? 0}</Text>
                <Text style={styles.quickStatLabel}>Upcoming</Text>
              </View>
              <View style={styles.quickStatPill}>
                <Text style={[styles.quickStatValue, { color: (participation?.net ?? 0) >= 0 ? Colors.success : Colors.danger }]}>
                  {(participation?.net ?? 0) >= 0 ? '+' : ''}${participation?.net ?? 0}
                </Text>
                <Text style={styles.quickStatLabel}>Net</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Active Tournaments ── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setTournamentsOpen(prev => !prev)}
            activeOpacity={0.85}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Active Tournaments</Text>
            </View>
            <View style={styles.sectionHeaderRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{activeTournaments.length}</Text>
              </View>
              <Ionicons
                name={tournamentsOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {tournamentsOpen && (
            <View style={styles.sectionBody}>
              {!playerRecord ? (
                <Text style={styles.emptyBodyText}>Create a player profile to track your active tournaments.</Text>
              ) : activeTournaments.length === 0 ? (
                <View>
                  <Text style={styles.emptyBodyText}>No active tournaments right now.</Text>
                  <TouchableOpacity
                    style={styles.inlineAction}
                    onPress={() => router.push('/user-entry' as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.inlineActionText}>Browse Upcoming Tournaments</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {activeTournaments.map(t => (
                    <View key={t.id} style={styles.tournamentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tournamentName}>{t.name}</Text>
                        <Text style={styles.tournamentMeta}>{t.type} | {t.createdAtLabel}</Text>
                      </View>
                      <View style={styles.tournamentStats}>
                        <Text style={styles.tournamentStat}>{t.liveCount} live</Text>
                        <Text style={styles.tournamentStat}>{t.aliveCount} alive</Text>
                        <Text style={styles.tournamentStat}>{t.totalCount} total</Text>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.inlineAction}
                    onPress={() => router.push('/user-brackets' as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.inlineActionText}>Open My Brackets</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* ── Participation Snapshot ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Participation Snapshot</Text>
          {!playerRecord ? (
            <Text style={[styles.emptyBodyText, { marginTop: 10 }]}>Metrics appear after your player access is approved.</Text>
          ) : (
            <View style={styles.snapshotGrid}>
              <View style={styles.snapshotCard}>
                <Text style={styles.snapshotValue}>{participation?.entries ?? 0}</Text>
                <Text style={styles.snapshotLabel}>Total Entries</Text>
              </View>
              <View style={styles.snapshotCard}>
                <Text style={styles.snapshotValue}>{participation?.wins ?? 0}</Text>
                <Text style={styles.snapshotLabel}>Bracket Wins</Text>
              </View>
              <View style={styles.snapshotCard}>
                <Text style={styles.snapshotValue}>{participation?.completedBracketCount ?? 0}</Text>
                <Text style={styles.snapshotLabel}>Completed</Text>
              </View>
              <View style={styles.snapshotCard}>
                <Text style={[styles.snapshotValue, { color: (participation?.net ?? 0) >= 0 ? Colors.success : Colors.danger }]}>
                  {(participation?.net ?? 0) >= 0 ? '+' : ''}${participation?.net ?? 0}
                </Text>
                <Text style={styles.snapshotLabel}>Net Position</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bgOrbPrimary: {
    position: 'absolute',
    top: 95,
    right: -95,
    width: 250,
    height: 250,
    borderRadius: 250,
    backgroundColor: Colors.glowPrimary,
  },
  bgOrbAccent: {
    position: 'absolute',
    bottom: 20,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: Colors.glowAccent,
  },
  content: { padding: 18, paddingBottom: 26 },

  /* Welcome card */
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#3A5040',
    borderTopColor: '#4A6050',
    borderLeftColor: '#4A6050',
    borderBottomColor: '#1A261F',
    borderRightColor: '#1A261F',
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTag: { color: Colors.primary, fontSize: 12, fontFamily: Fonts.sansMedium, letterSpacing: 1.1 },
  heroTitle: { color: Colors.white, fontSize: 22, fontFamily: Fonts.serifBold, lineHeight: 28, marginTop: 6 },
  heroSub: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  signInBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  signInBtnText: { color: Colors.headerDark, fontFamily: Fonts.sansBold, fontSize: 14, letterSpacing: 0.3 },
  userName: { color: Colors.textPrimary, fontSize: 30, lineHeight: 35, fontFamily: Fonts.serifBold, marginTop: 2 },

  /* Player access request */
  requestWrap: { marginTop: 14, alignItems: 'flex-start' },
  requestBtn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  requestBtnText: { color: Colors.headerDark, fontFamily: Fonts.sansBold, fontSize: 12, letterSpacing: 0.35 },
  pendingText: {
    color: Colors.warning,
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    backgroundColor: 'rgba(218,165,32,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rejectedText: { color: Colors.danger, fontSize: 12, marginTop: 8 },

  /* Quick stats row */
  quickStatsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatPill: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  quickStatValue: { color: Colors.textPrimary, fontFamily: Fonts.serifBold, fontSize: 17 },
  quickStatLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 2, fontFamily: Fonts.sansMedium },

  /* Section cards */
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopColor: '#2E3F34',
    borderLeftColor: '#2E3F34',
    borderBottomColor: '#1A261F',
    borderRightColor: '#1A261F',
    padding: 14,
    marginTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}22`,
    borderWidth: 1,
    borderColor: `${Colors.primary}55`,
    marginRight: 8,
  },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  countPill: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginRight: 6,
  },
  countPillText: { color: Colors.textPrimary, fontSize: 11, fontFamily: Fonts.sansBold },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontFamily: Fonts.serifBold },
  sectionBody: { marginTop: 10 },
  emptyBodyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },

  /* Tournament rows */
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  tournamentName: { color: Colors.textPrimary, fontSize: 14, fontFamily: Fonts.sansBold },
  tournamentMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  tournamentStats: { alignItems: 'flex-end' },
  tournamentStat: { color: Colors.textSecondary, fontSize: 11, marginVertical: 1 },
  inlineAction: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceSecondary,
  },
  inlineActionText: { color: Colors.textPrimary, fontSize: 12, fontFamily: Fonts.sansBold },

  /* Snapshot grid */
  snapshotGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  snapshotCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopColor: '#2E3F34',
    borderLeftColor: '#2E3F34',
    borderBottomColor: '#1A261F',
    borderRightColor: '#1A261F',
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  snapshotValue: { color: Colors.textPrimary, fontSize: 19, fontFamily: Fonts.serifBold },
  snapshotLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 3, fontFamily: Fonts.sansMedium },
});
