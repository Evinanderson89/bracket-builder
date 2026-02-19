import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/fonts';
import NavigationHeader from '../components/NavigationHeader';
import WoodCard from '../components/WoodCard';
import { PayoutAmounts } from '../utils/types';

const ENTRY_FEE = PayoutAmounts.ENTRY_FEE;

export default function PayoutScreen() {
  const { searchName: param } = useLocalSearchParams<{ searchName: string }>();
  const { brackets, cohorts, users, payouts } = useApp();

  const [searchName, setSearchName] = useState(param || '');
  const [activeTab, setActiveTab] = useState<'stats' | 'active'>('stats');

  useEffect(() => { if (param) setSearchName(param); }, [param]);

  const targetUser = useMemo(() => {
    if (!searchName.trim()) return null;
    return users.find(u => u.name.toLowerCase().trim() === searchName.toLowerCase().trim());
  }, [searchName, users]);

  const activeBrackets = useMemo(() => {
    if (!targetUser) return [];
    return brackets
      .filter(b => !b.structure.completed && b.players.some(p => p.id === targetUser.id))
      .map(b => {
        const cohort = cohorts.find(c => c.id === b.cohortId);
        let currentRound = 0;
        for (let i = 0; i < b.structure.rounds.length; i++) {
          if (b.structure.rounds[i].find(m => (m.player1?.id === targetUser.id || m.player2?.id === targetUser.id) && !m.completed)) {
            currentRound = i + 1; break;
          }
        }
        return { id: b.id, bracketNum: b.bracketNumber, cohortName: cohort?.name, currentRound };
      });
  }, [targetUser, brackets, cohorts]);

  const stats = useMemo(() => {
    if (!targetUser) return null;
    let entries = 0, cost = 0, revenue = 0, cashes = 0;
    const daily: Record<string, { date: string; entries: number; cost: number; revenue: number }> = {};

    brackets.forEach(b => {
      if (!b.players.some(p => p.id === targetUser.id)) return;
      const cohort = cohorts.find(c => c.id === b.cohortId);
      if (!cohort) return;
      const d = new Date(cohort.createdAt).toISOString().split('T')[0];
      if (!daily[d]) daily[d] = { date: d, entries: 0, cost: 0, revenue: 0 };
      daily[d].entries++; daily[d].cost += ENTRY_FEE;
      entries++; cost += ENTRY_FEE;
    });

    payouts.forEach(p => {
      if (p.playerId !== targetUser.id || p.isOperator) return;
      if (!daily[p.date]) daily[p.date] = { date: p.date, entries: 0, cost: 0, revenue: 0 };
      daily[p.date].revenue += p.amount;
      revenue += p.amount; cashes++;
    });

    const pnl = revenue - cost;
    const roi = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : '0.0';
    const winRate = entries > 0 ? ((cashes / entries) * 100).toFixed(1) : '0.0';
    const history = Object.values(daily).map(d => ({ ...d, pnl: d.revenue - d.cost })).sort((a, b) => b.date.localeCompare(a.date));
    const chart = [...history].reverse();

    return { entries, cost, revenue, pnl, roi, winRate, history, chart };
  }, [targetUser, brackets, cohorts, payouts]);

  const renderChart = () => {
    if (!stats || stats.chart.length === 0) return null;
    const maxVal = Math.max(...stats.chart.map(d => Math.abs(d.pnl)), 10);
    return (
      <WoodCard style={styles.chartBox} padding={16}>
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Player Stats" />

      <View style={styles.searchBox}>
        <Text style={styles.label}>Player Name</Text>
        <TextInput style={styles.input} value={searchName} onChangeText={setSearchName}
          placeholder="Search player..." placeholderTextColor={Colors.textLight} autoCorrect={false} />
      </View>

      <View style={styles.tabBar}>
        {(['stats', 'active'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'stats' ? 'Stats & History' : 'Active Brackets'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll}>
        {!targetUser ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{searchName ? 'Player not found' : 'Enter a name to search'}</Text>
          </View>
        ) : (
          <>
            {activeTab === 'active' && (
              activeBrackets.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No active brackets</Text></View>
              ) : (
                <>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Potential Winnings</Text>
                    <Text style={styles.summaryAmt}>${activeBrackets.length * PayoutAmounts.FIRST_PLACE}</Text>
                    <Text style={styles.summarySub}>{activeBrackets.length} Active</Text>
                  </View>
                  {activeBrackets.map(b => (
                    <WoodCard key={b.id} style={styles.card} padding={16}>
                      <View style={styles.cardRow}><Text style={styles.cardTitle}>{b.cohortName}</Text><Text style={styles.cardSub}>Bracket {b.bracketNum}</Text></View>
                      <View style={styles.cardRow}><Text style={styles.cardDetail}>Round {b.currentRound}</Text><Text style={[styles.cardDetail, { color: Colors.success }]}>Potential: $25</Text></View>
                    </WoodCard>
                  ))}
                </>
              )
            )}

            {activeTab === 'stats' && stats && (
              stats.history.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No history found</Text></View>
              ) : (
                <>
                  {/* HUD */}
                  <WoodCard style={styles.hud} padding={0}>
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
                    </View>
                  </WoodCard>

                  {renderChart()}

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
                </>
              )
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBox: { padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border },
  label: { color: Colors.textSecondary, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', fontFamily: Fonts.bodySemiBold },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.white, fontSize: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, padding: 16, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontFamily: Fonts.bodySemiBold },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontFamily: Fonts.bodyRegular },
  summaryCard: { backgroundColor: Colors.primary, margin: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
  summaryLabel: { color: Colors.warmWhite80, fontSize: 14, marginBottom: 4, fontFamily: Fonts.bodyRegular },
  summaryAmt: { color: Colors.white, fontSize: 32, fontFamily: Fonts.scoreBold },
  summarySub: { color: Colors.warmWhite80, fontSize: 12, marginTop: 4, fontFamily: Fonts.bodyRegular },
  card: { marginHorizontal: 16, marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { color: Colors.white, fontFamily: Fonts.bodySemiBold, fontSize: 16 },
  cardSub: { color: Colors.textSecondary, fontFamily: Fonts.bodyRegular },
  cardDetail: { color: Colors.textSecondary, fontSize: 14, fontFamily: Fonts.bodyRegular },
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
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  histDate: { color: Colors.white, fontFamily: Fonts.bodySemiBold, fontSize: 16 },
  histSub: { color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.bodyRegular },
  histWon: { color: Colors.success, fontSize: 12, marginBottom: 2, fontFamily: Fonts.bodyRegular },
  histPnl: { fontFamily: Fonts.scoreBold, fontSize: 16 },
});
