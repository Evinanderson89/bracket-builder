import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
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
        <View style={styles.hud}>
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
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Won</Text><Text style={styles.hudSmVal}>${stats.revenue}</Text></View>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Spent</Text><Text style={styles.hudSmVal}>${stats.cost}</Text></View>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Win Rate</Text><Text style={styles.hudSmVal}>{stats.winRate}%</Text></View>
            <View style={styles.hudItem}><Text style={styles.hudSmLabel}>Active</Text><Text style={styles.hudSmVal}>{activeBracketCount}</Text></View>
          </View>
        </View>

        {/* Chart */}
        {stats.chart.length > 0 && (
          <View style={styles.chartBox}>
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
          </View>
        )}

        {/* History */}
        <View style={styles.histList}>
          <Text style={styles.sectionHeader}>Daily Breakdown</Text>
          {stats.history.map(day => (
            <View key={day.date} style={styles.histRow}>
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
            </View>
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
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  hud: { margin: 16, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  hudMain: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border },
  hudMainItem: { flex: 1, padding: 20, alignItems: 'center' },
  hudMainVal: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  hudLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' },
  hudGrid: { flexDirection: 'row', padding: 16 },
  hudItem: { flex: 1, alignItems: 'center' },
  hudSmLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  hudSmVal: { fontSize: 16, fontWeight: 'bold', color: Colors.white },
  chartBox: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { color: Colors.white, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', fontSize: 14 },
  chartBody: { flexDirection: 'row', height: 160, alignItems: 'flex-end', justifyContent: 'space-around', paddingVertical: 10 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { height: 100, width: 12, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: Colors.textSecondary, marginBottom: 2 },
  barDate: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  histList: { paddingHorizontal: 16 },
  sectionHeader: { color: Colors.textSecondary, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', fontSize: 12 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  histDate: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  histSub: { color: Colors.textSecondary, fontSize: 12 },
  histWon: { color: Colors.success, fontSize: 12, marginBottom: 2 },
  histPnl: { fontWeight: 'bold', fontSize: 16 },
});
