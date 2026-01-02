import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import { PayoutAmounts } from '../utils/types';

const ENTRY_FEE = 5;

export default function PayoutScreen() {
  const { searchName: paramSearchName } = useLocalSearchParams();
  const { brackets, cohorts, users, payouts } = useApp();
  
  const [searchName, setSearchName] = useState(paramSearchName || '');
  // CHANGED: Default tab is now 'completed' to show stats/history first
  const [activeTab, setActiveTab] = useState('completed'); 

  useEffect(() => {
    if (paramSearchName) {
      setSearchName(paramSearchName);
    }
  }, [paramSearchName]);

  // --- 1. FIND USER ID ---
  const targetUser = useMemo(() => {
    if (!searchName.trim()) return null;
    return users.find(u => u.name.toLowerCase().trim() === searchName.toLowerCase().trim());
  }, [searchName, users]);

  // --- 2. ACTIVE BRACKETS (Live Status) ---
  const activeBracketsForPlayer = useMemo(() => {
    if (!targetUser) return [];
    
    const active = brackets.filter(b => 
      !b.structure.completed && 
      b.players.some(p => p.id === targetUser.id)
    );
    
    return active.map(bracket => {
      const cohort = cohorts.find(c => c.id === bracket.cohortId);
      
      let currentRound = 0;
      for (let i = 0; i < bracket.structure.rounds.length; i++) {
        const round = bracket.structure.rounds[i];
        const match = round.find(m => 
          (m.player1?.id === targetUser.id || m.player2?.id === targetUser.id) && !m.completed
        );
        if (match) {
          currentRound = i + 1;
          break;
        }
      }
      
      return {
        id: bracket.id,
        bracketNum: bracket.bracketNumber,
        cohortName: cohort?.name,
        cohortType: cohort?.type,
        currentRound,
        potential: PayoutAmounts.FIRST_PLACE
      };
    });
  }, [targetUser, brackets, cohorts]);

  // --- 3. ADVANCED STATS AGGREGATION ---
  const playerStats = useMemo(() => {
    if (!targetUser) return null;

    let totalEntries = 0;
    let totalCost = 0;
    let totalRevenue = 0;
    let totalCashes = 0;
    const dailyMap = {};

    // A. Calculate Costs & Entries
    brackets.forEach(bracket => {
      if (bracket.players.some(p => p.id === targetUser.id)) {
        const cohort = cohorts.find(c => c.id === bracket.cohortId);
        if (!cohort) return;

        const dateKey = new Date(cohort.createdAt).toISOString().split('T')[0];
        
        // Update Daily
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, entries: 0, cost: 0, revenue: 0 };
        dailyMap[dateKey].entries += 1;
        dailyMap[dateKey].cost += ENTRY_FEE;

        // Update Totals
        totalEntries += 1;
        totalCost += ENTRY_FEE;
      }
    });

    // B. Calculate Revenue & Cashes
    payouts.forEach(p => {
      if (p.playerId === targetUser.id && !p.isOperator) {
        const dateKey = p.date;
        
        // Update Daily
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, entries: 0, cost: 0, revenue: 0 };
        dailyMap[dateKey].revenue += p.amount;

        // Update Totals
        totalRevenue += p.amount;
        totalCashes += 1;
      }
    });

    // C. Derived Stats
    const netPnL = totalRevenue - totalCost;
    const roi = totalCost > 0 ? ((netPnL / totalCost) * 100).toFixed(1) : '0.0';
    const winRate = totalEntries > 0 ? ((totalCashes / totalEntries) * 100).toFixed(1) : '0.0';

    // D. Final Daily List (Sorted Newest to Oldest for List, Oldest to Newest for Chart)
    const dailyList = Object.values(dailyMap).map(d => ({
      ...d,
      pnl: d.revenue - d.cost
    }));
    
    const chartData = [...dailyList].sort((a, b) => new Date(a.date) - new Date(b.date));
    const historyData = [...dailyList].sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      totalEntries,
      totalCost,
      totalRevenue,
      netPnL,
      roi,
      winRate,
      chartData,
      historyData
    };
  }, [targetUser, brackets, cohorts, payouts]);

  // --- CHART RENDERER ---
  const renderPnLChart = () => {
    if (!playerStats || playerStats.chartData.length === 0) return null;

    const data = playerStats.chartData;
    const maxVal = Math.max(...data.map(d => Math.abs(d.pnl)), 10);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Performance Trend</Text>
        <View style={styles.chartBody}>
          {data.map((day) => {
             const heightPercent = (Math.abs(day.pnl) / maxVal) * 100;
             const isProfit = day.pnl >= 0;
             const barColor = isProfit ? Colors.success : Colors.danger;
             const displayHeight = Math.max(heightPercent, 8); // Min height

             return (
               <View key={day.date} style={styles.barColumn}>
                 <Text style={[styles.barLabel, { opacity: isProfit ? 1 : 0 }]}>+${day.pnl}</Text>
                 <View style={styles.barTrack}>
                   <View style={[styles.barFill, { height: `${displayHeight}%`, backgroundColor: barColor }]} />
                 </View>
                 <Text style={[styles.barLabel, { opacity: !isProfit ? 1 : 0 }]}>-${Math.abs(day.pnl)}</Text>
                 <Text style={styles.barDate}>{day.date.slice(5)}</Text>
               </View>
             );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Player Search" />

      <View style={styles.searchSection}>
        <Text style={styles.label}>Player Name</Text>
        <TextInput
          style={styles.input}
          value={searchName}
          onChangeText={setSearchName}
          placeholder="Enter player name..."
          placeholderTextColor={Colors.textLight}
          autoCorrect={false}
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Stats & History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active Brackets
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {!targetUser ? (
          <View style={styles.emptyState}>
             {searchName ? <Text style={styles.emptyText}>User not found.</Text> : <Text style={styles.emptyText}>Enter a name to search.</Text>}
          </View>
        ) : (
          <>
            {/* ---------------- ACTIVE TAB ---------------- */}
            {activeTab === 'active' && (
              <>
                {activeBracketsForPlayer.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active brackets for {targetUser.name}.</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryTitle}>Potential Winnings</Text>
                      <Text style={styles.summaryAmount}>${activeBracketsForPlayer.length * PayoutAmounts.FIRST_PLACE}</Text>
                      <Text style={styles.summaryCount}>{activeBracketsForPlayer.length} Active Brackets</Text>
                    </View>
                    
                    {activeBracketsForPlayer.map(b => (
                      <View key={b.id} style={styles.card}>
                        <View style={styles.cardRow}>
                          <Text style={styles.cardTitle}>{b.cohortName}</Text>
                          <Text style={styles.cardSub}>Bracket {b.bracketNum}</Text>
                        </View>
                        <View style={styles.cardRow}>
                          <Text style={styles.cardDetail}>Round {b.currentRound}</Text>
                          <Text style={[styles.cardDetail, {color: Colors.success}]}>Potential: $25</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ---------------- COMPLETED (STATS) TAB ---------------- */}
            {activeTab === 'completed' && playerStats && (
              <>
                {playerStats.historyData.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No history found for {targetUser.name}.</Text>
                  </View>
                ) : (
                  <>
                    {/* --- ADVANCED STATS HUD --- */}
                    <View style={styles.hudContainer}>
                      {/* Main P&L Row */}
                      <View style={styles.hudMainRow}>
                        <View style={styles.hudMainItem}>
                           <Text style={styles.hudLabel}>Net Profit / Loss</Text>
                           <Text style={[
                             styles.hudMainValue, 
                             { color: playerStats.netPnL >= 0 ? Colors.success : Colors.danger }
                           ]}>
                             {playerStats.netPnL >= 0 ? '+' : ''}${playerStats.netPnL}
                           </Text>
                        </View>
                        <View style={[styles.hudMainItem, { borderLeftWidth: 1, borderColor: Colors.border }]}>
                           <Text style={styles.hudLabel}>R.O.I.</Text>
                           <Text style={[
                             styles.hudMainValue, 
                             { color: parseFloat(playerStats.roi) >= 0 ? Colors.success : Colors.danger }
                           ]}>
                             {parseFloat(playerStats.roi) >= 0 ? '+' : ''}{playerStats.roi}%
                           </Text>
                        </View>
                      </View>

                      {/* Secondary Stats Row */}
                      <View style={styles.hudGrid}>
                        <View style={styles.hudItem}>
                          <Text style={styles.hudLabelSmall}>Total Won</Text>
                          <Text style={styles.hudValueSmall}>${playerStats.totalRevenue}</Text>
                        </View>
                        <View style={styles.hudItem}>
                          <Text style={styles.hudLabelSmall}>Total Spent</Text>
                          <Text style={styles.hudValueSmall}>${playerStats.totalCost}</Text>
                        </View>
                        <View style={styles.hudItem}>
                          <Text style={styles.hudLabelSmall}>Win Rate</Text>
                          <Text style={styles.hudValueSmall}>{playerStats.winRate}%</Text>
                        </View>
                      </View>
                    </View>

                    {/* CHART */}
                    {renderPnLChart()}

                    {/* HISTORY LIST */}
                    <View style={styles.listContainer}>
                      <Text style={styles.sectionHeader}>Daily Breakdown</Text>
                      {playerStats.historyData.map((day) => (
                        <View key={day.date} style={styles.historyRow}>
                          <View>
                            <Text style={styles.historyDate}>{day.date}</Text>
                            <Text style={styles.historySub}>
                              {day.entries} {day.entries === 1 ? 'Entry' : 'Entries'} (${day.cost})
                            </Text>
                          </View>
                          
                          <View style={styles.historyRight}>
                             <Text style={styles.historyWon}>Won: ${day.revenue}</Text>
                             <Text style={[
                               styles.historyPnL, 
                               { color: day.pnl >= 0 ? Colors.success : Colors.danger }
                             ]}>
                               {day.pnl >= 0 ? '+' : ''}{day.pnl}
                             </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchSection: { padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border },
  label: { color: Colors.textSecondary, fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.white, fontSize: 16 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, padding: 16, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  
  scrollView: { flex: 1 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary },

  summaryCard: { backgroundColor: Colors.primary, margin: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  summaryAmount: { color: Colors.white, fontSize: 32, fontWeight: 'bold' },
  summaryCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },

  card: { backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  cardSub: { color: Colors.textSecondary },
  cardDetail: { color: Colors.textSecondary, fontSize: 14 },

  // --- STATS HUD STYLES ---
  hudContainer: { margin: 16, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  hudMainRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border },
  hudMainItem: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  hudMainValue: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  hudLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' },
  
  hudGrid: { flexDirection: 'row', padding: 16 },
  hudItem: { flex: 1, alignItems: 'center' },
  hudLabelSmall: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  hudValueSmall: { fontSize: 16, fontWeight: 'bold', color: Colors.white },

  // CHART
  chartContainer: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { color: Colors.white, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', fontSize: 14 },
  chartBody: { flexDirection: 'row', height: 160, alignItems: 'flex-end', justifyContent: 'space-around', paddingVertical: 10 },
  barColumn: { alignItems: 'center', flex: 1 },
  barTrack: { height: 100, width: 12, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: Colors.textSecondary, marginBottom: 2 },
  barDate: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  
  // HISTORY LIST
  listContainer: { paddingHorizontal: 16 },
  sectionHeader: { color: Colors.textSecondary, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', fontSize: 12 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 8, marginBottom: 8, borderBottomWidth: 1, borderColor: Colors.border },
  historyDate: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  historySub: { color: Colors.textSecondary, fontSize: 12 },
  historyRight: { alignItems: 'flex-end' },
  historyWon: { color: Colors.success, fontSize: 12, marginBottom: 2 },
  historyPnL: { fontWeight: 'bold', fontSize: 16 },
});