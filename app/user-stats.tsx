import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/fonts';
import { getProgressionTier, TierStyles } from '../styles/progression';
import NavigationHeader from '../components/NavigationHeader';
import WoodCard from '../components/WoodCard';
import { PayoutAmounts } from '../utils/types';

const ENTRY_FEE = PayoutAmounts.ENTRY_FEE;

export default function UserStatsScreen() {
  const { user } = useAuth();
  const { brackets, cohorts, users, payouts } = useApp();

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

  const stats = useMemo(() => {
    if (!profile) return null;
    let entries = 0, cost = 0, revenue = 0, cashes = 0, wins = 0;
    const daily: Record<string, { date: string; entries: number; cost: number; revenue: number }> = {};

    brackets.forEach(b => {
      if (!b.players.some(p => p.id === profile.id)) return;
      const cohort = cohorts.find(c => c.id === b.cohortId);
      if (!cohort) return;
      const d = new Date(cohort.createdAt).toISOString().split('T')[0];
      if (!daily[d]) daily[d] = { date: d, entries: 0, cost: 0, revenue: 0 };
      daily[d].entries++; daily[d].cost += ENTRY_FEE;
      entries++; cost += ENTRY_FEE;
      if (b.structure.winner?.id === profile.id) wins++;
    });

    payouts.forEach(p => {
      if (p.playerId !== profile.id || p.isOperator) return;
      if (!daily[p.date]) daily[p.date] = { date: p.date, entries: 0, cost: 0, revenue: 0 };
      daily[p.date].revenue += p.amount;
      revenue += p.amount; cashes++;
    });

    const pnl = revenue - cost;
    const roi = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : '0.0';
    const winRate = entries > 0 ? ((wins / entries) * 100).toFixed(1) : '0.0';
    const history = Object.values(daily).map(d => ({ ...d, pnl: d.revenue - d.cost })).sort((a, b) => b.date.localeCompare(a.date));
    const chart = [...history].reverse();

    return { entries, cost, revenue, pnl, roi, winRate, wins, history, chart };
  }, [profile, brackets, cohorts, payouts]);

  const activeBracketCount = useMemo(() => {
    if (!profile) return 0;
    return brackets.filter(b => !b.structure.completed && b.players.some(p => p.id === profile.id)).length;
  }, [profile, brackets]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="My Stats" />
        <View style={styles.center}><Text style={styles.emptyText}>Please create a player profile first</Text></View>
      </SafeAreaView>
    );
  }

  if (!stats || stats.entries === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="My Stats" />
        <View style={styles.center}><Text style={styles.emptyText}>No tournament history yet</Text></View>
      </SafeAreaView>
    );
  }

  const maxVal = Math.max(...stats.chart.map(d => Math.abs(d.pnl)), 10);

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="My Stats" />
      <ScrollView style={styles.scroll}>
        {/* Summary */}
        <WoodCard style={[styles.hud, { borderColor: tier.borderColor, borderWidth: tier.borderWidth }]} padding={0} grainOpacity={tier.grainOpacity}>
          <View style={styles.hudMain}>
            <View style={styles.hudMainItem}>
              <Text style={styles.hudLabel}>Net P/L</Text>
              <Text style={[styles.hudMainVal, { color: stats.pnl >= 0 ? Colors.success : Colors.danger }]}>
                {stats.pnl >= 0 ? '+' : ''}${stats.pnl}
              </Text>
            </View>
            <View style={[styles.hudMainItem, { borderLeftWidth: 1, borderColor: Colors.border }]}>
              <Text style={styles.hudLabel}>R.O.I.</Text>
              <Text style={[styles.hudMainVal, { color: parseFloat(stats.roi) >= 0 ? Colors.success : Colors.danger }]}>
                {parseFloat(stats.roi) >= 0 ? '+' : ''}{stats.roi}%
              </Text>
            </View>
          </View>
          <View style={styles.hudGrid}>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Won</Text><Text style={[styles.hudSmVal, { color: tier.scoreColor }]}>${stats.revenue}</Text></View>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Spent</Text><Text style={[styles.hudSmVal, { color: tier.scoreColor }]}>${stats.cost}</Text></View>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Win Rate</Text><Text style={[styles.hudSmVal, { color: tier.scoreColor }]}>{stats.winRate}%</Text></View>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Active</Text><Text style={[styles.hudSmVal, { color: tier.scoreColor }]}>{activeBracketCount}</Text></View>
          </View>
        </WoodCard>

        {/* Chart */}
        {stats.chart.length > 0 && (
          <WoodCard style={[styles.chartBox, { borderColor: tier.borderColor }]} padding={16} grainOpacity={tier.grainOpacity}>
            <Text style={styles.chartTitle}>Daily Performance</Text>
            <View style={styles.chartBody}>
              {stats.chart.map(day => {
                const pct = (Math.abs(day.pnl) / maxVal) * 100;
                const isUp = day.pnl >= 0;
                return (
                  <View key={day.date} style={styles.barCol}>
                    <Text style={[styles.barLabel, { opacity: isUp ? 1 : 0 }]}>+${day.pnl}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${Math.max(pct, 8)}%`, backgroundColor: isUp ? Colors.success : Colors.danger }]} />
                    </View>
                    <Text style={[styles.barLabel, { opacity: !isUp ? 1 : 0 }]}>-${Math.abs(day.pnl)}</Text>
                    <Text style={styles.barDate}>{day.date.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
          </WoodCard>
        )}

        {/* History */}
        <View style={styles.histList}>
          <Text style={styles.sectionHeader}>Daily Breakdown</Text>
          {stats.history.map(day => (
            <WoodCard key={day.date} style={styles.histRow} padding={16}>
              <View>
                <Text style={styles.histDate}>{day.date}</Text>
                <Text style={styles.histSub}>{day.entries} {day.entries === 1 ? 'Entry' : 'Entries'} (${day.cost})</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.histWon}>Won: ${day.revenue}</Text>
                <Text style={[styles.histPnl, { color: day.pnl >= 0 ? Colors.success : Colors.danger }]}>
                  {day.pnl >= 0 ? '+' : ''}{day.pnl}
                </Text>
              </View>
            </WoodCard>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', fontFamily: Fonts.bodyRegular },
  hud: { margin: 16, overflow: 'hidden' },
  hudMain: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border },
  hudMainItem: { flex: 1, padding: 20, alignItems: 'center' },
  hudMainVal: { fontSize: 28, fontFamily: Fonts.scoreBold, marginTop: 4 },
  hudLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', fontFamily: Fonts.bodySemiBold },
  hudGrid: { flexDirection: 'row', padding: 16 },
  hudItem: { flex: 1, alignItems: 'center' },
  hudSmLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4, fontFamily: Fonts.bodyRegular },
  hudSmVal: { fontSize: 16, fontFamily: Fonts.scoreBold, color: Colors.white },
  chartBox: { marginHorizontal: 16, marginBottom: 16 },
  chartTitle: { color: Colors.white, fontFamily: Fonts.bodySemiBold, marginBottom: 16, textAlign: 'center', fontSize: 14 },
  chartBody: { flexDirection: 'row', height: 160, alignItems: 'flex-end', justifyContent: 'space-around', paddingVertical: 10 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { height: 100, width: 12, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: Colors.textSecondary, marginBottom: 2, fontFamily: Fonts.bodyRegular },
  barDate: { fontSize: 9, color: Colors.textSecondary, marginTop: 4, fontFamily: Fonts.bodyRegular },
  histList: { paddingHorizontal: 16 },
  sectionHeader: { color: Colors.textSecondary, fontFamily: Fonts.bodySemiBold, marginBottom: 12, textTransform: 'uppercase', fontSize: 12 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  histDate: { color: Colors.white, fontFamily: Fonts.bodySemiBold, fontSize: 16 },
  histSub: { color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.bodyRegular },
  histWon: { color: Colors.success, fontSize: 12, marginBottom: 2, fontFamily: Fonts.bodyRegular },
  histPnl: { fontFamily: Fonts.scoreBold, fontSize: 16 },
});
