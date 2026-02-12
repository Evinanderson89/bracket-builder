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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import { CohortStatus, PayoutAmounts, TournamentKind } from '../utils/types';
import type { Bracket, Player } from '../utils/types';

type UtilityKey = 'entry' | 'brackets' | 'scores' | 'stats' | 'profile';

function isPlayerEliminated(bracket: Bracket, playerId: string) {
  return bracket.structure.rounds.some(round => (
    round.some(match => (
      match.completed
      && (match.player1?.id === playerId || match.player2?.id === playerId)
      && match.winner?.id !== playerId
    ))
  ));
}

export default function UserDashboard() {
  const router = useRouter();
  const { user, signOut, switchToAdmin } = useAuth();
  const { users, playerRequests, requestPlayerAccess, brackets, cohorts, payouts } = useApp();
  const [playerRecord, setPlayerRecord] = useState<Player | null>(null);
  const [tournamentsOpen, setTournamentsOpen] = useState(true);
  const [openUtility, setOpenUtility] = useState<UtilityKey | null>('entry');

  useEffect(() => {
    if (user && users.length > 0) {
      const found = users.find(u => (
        (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
        || u.name.toLowerCase() === user.name.toLowerCase()
      ));
      setPlayerRecord(found ?? null);
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

  const openTournamentCount = useMemo(() => {
    return cohorts.filter(c => c.status === CohortStatus.NOT_DEPLOYED).length;
  }, [cohorts]);

  const scoreEntryCohorts = useMemo(() => {
    if (!user) return [];
    const playerId = playerRecord?.id || null;

    return cohorts.filter(c => {
      if (!(c.status === CohortStatus.ACTIVE || c.status === CohortStatus.COMPLETE)) return false;

      const byCreatorId = !!(c.createdByAuthUserId && c.createdByAuthUserId === user.id);
      const byCreatorEmail = !!(
        c.createdByAuthUserEmail
        && user.email
        && c.createdByAuthUserEmail.toLowerCase() === user.email.toLowerCase()
      );
      if (byCreatorId || byCreatorEmail) return true;

      if (!playerId) return false;
      return (c.scoreEntryUserIds || []).includes(playerId);
    });
  }, [cohorts, playerRecord?.id, user]);

  const utilityItems = useMemo(() => ([
    {
      key: 'entry' as const,
      label: 'Enter',
      icon: 'rocket-outline' as const,
      route: '/user-entry',
      meta: `${openTournamentCount} open tournaments`,
      description: 'Join upcoming tournaments and choose how many brackets you want to enter.',
      cta: 'Open Entry',
    },
    {
      key: 'brackets' as const,
      label: 'Brackets',
      icon: 'git-network-outline' as const,
      route: '/user-brackets',
      meta: `${myBrackets.length} total entries`,
      description: 'See all your active and completed brackets in one place.',
      cta: 'Open My Brackets',
    },
    ...(scoreEntryCohorts.length > 0 ? [{
      key: 'scores' as const,
      label: 'Scores',
      icon: 'clipboard-outline' as const,
      route: '/game-entry',
      meta: `${scoreEntryCohorts.length} tournament${scoreEntryCohorts.length === 1 ? '' : 's'} assigned`,
      description: 'Enter and update game scores for tournaments where you have score-entry rights.',
      cta: 'Open Score Entry',
    }] : []),
    {
      key: 'stats' as const,
      label: 'Stats',
      icon: 'stats-chart-outline' as const,
      route: '/user-stats',
      meta: `${participation?.wins ?? 0} bracket wins`,
      description: 'Review your performance, ROI, and daily payout history.',
      cta: 'Open My Stats',
    },
    {
      key: 'profile' as const,
      label: 'Profile',
      icon: 'person-circle-outline' as const,
      route: '/user-profile',
      meta: user?.email || 'Player account settings',
      description: 'Update account details and keep your player profile current.',
      cta: 'Open Profile',
    },
  ]), [myBrackets.length, openTournamentCount, participation?.wins, scoreEntryCohorts.length, user?.email]);

  const selectedUtility = utilityItems.find(item => item.key === openUtility) || null;

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="Player Dashboard" showBack={false} />

      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbAccent} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTag}>PLAYER SPACE</Text>
          <Text style={styles.userName}>{user.name}</Text>

          {!playerRecord ? (
            <View style={styles.requestWrap}>
              {!pendingRequest ? (
                <TouchableOpacity style={styles.createBtn} onPress={handleRequestAccess} activeOpacity={0.85}>
                  <Text style={styles.createBtnText}>Request Player Access</Text>
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

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Utility Bar</Text>
          <View style={styles.utilityBar}>
            {utilityItems.map(item => {
              const isActive = openUtility === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.utilityTab, isActive && styles.utilityTabActive]}
                  onPress={() => setOpenUtility(prev => (prev === item.key ? null : item.key))}
                  activeOpacity={0.85}
                >
                  <Ionicons name={item.icon} size={14} color={isActive ? Colors.textPrimary : Colors.textSecondary} />
                  <Text style={[styles.utilityTabText, isActive && styles.utilityTabTextActive]}>{item.label}</Text>
                  <Ionicons
                    name={isActive ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={isActive ? Colors.textPrimary : Colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedUtility && (
            <View style={styles.utilityDrawer}>
              <Text style={styles.utilityTitle}>{selectedUtility.label}</Text>
              <Text style={styles.utilityMeta}>{selectedUtility.meta}</Text>
              <Text style={styles.utilityDescription}>{selectedUtility.description}</Text>
              <TouchableOpacity
                style={styles.utilityActionBtn}
                onPress={() => router.push(selectedUtility.route as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.utilityActionText}>{selectedUtility.cta}</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={14} color={Colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminLinkWrap}
            onPress={() => { switchToAdmin(); router.replace('/' as any); }}
            activeOpacity={0.85}
          >
            <Ionicons name="swap-horizontal" size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.adminLink}>Switch to Admin View</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 12,
  },
  welcomeTag: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  userName: { color: Colors.textPrimary, fontSize: 30, lineHeight: 35, fontWeight: '800', marginTop: 2 },
  requestWrap: { marginTop: 14, alignItems: 'flex-start' },
  createBtn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  createBtnText: { color: Colors.headerDark, fontWeight: '800', fontSize: 12, letterSpacing: 0.35 },
  pendingText: {
    color: Colors.warning,
    fontWeight: '800',
    fontSize: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rejectedText: { color: Colors.danger, fontSize: 12, marginTop: 8 },
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
  quickStatValue: { color: Colors.textPrimary, fontWeight: '800', fontSize: 17 },
  quickStatLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 10,
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
  countPillText: { color: Colors.textPrimary, fontSize: 11, fontWeight: '700' },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  sectionBody: { marginTop: 10 },
  emptyBodyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
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
  tournamentName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
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
  inlineActionText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
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
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  snapshotValue: { color: Colors.textPrimary, fontSize: 19, fontWeight: '800' },
  snapshotLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 3 },
  utilityBar: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  utilityTab: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilityTabActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}22`,
  },
  utilityTabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 6,
  },
  utilityTabTextActive: { color: Colors.textPrimary },
  utilityDrawer: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
  },
  utilityTitle: { color: Colors.textPrimary, fontWeight: '800', fontSize: 14 },
  utilityMeta: { color: Colors.primary, fontSize: 12, marginTop: 2, fontWeight: '700' },
  utilityDescription: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 },
  utilityActionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.tabBar,
  },
  utilityActionText: { color: Colors.textPrimary, fontWeight: '700', marginRight: 6, fontSize: 12 },
  footer: { marginTop: 16, alignItems: 'center' },
  signOutBtn: {
    backgroundColor: 'rgba(251,113,133,0.14)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.52)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: Colors.danger, fontWeight: '800' },
  adminLinkWrap: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  adminLink: { color: Colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
});
