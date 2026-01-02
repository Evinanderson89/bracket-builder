import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import { PayoutAmounts } from '../utils/types';

export default function PayoutScreen() {
  const { searchName: paramSearchName } = useLocalSearchParams();
  const { getPlayerPayouts, brackets, cohorts, users } = useApp();
  const [searchName, setSearchName] = useState(paramSearchName || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'

  // Auto-search if param is provided
  useEffect(() => {
    if (paramSearchName) {
      if (activeTab === 'completed') {
        const payouts = getPlayerPayouts(paramSearchName.trim(), selectedDate);
        setResults(payouts);
      }
    }
  }, [paramSearchName, selectedDate, activeTab, getPlayerPayouts]);

  const handleSearch = () => {
    if (!searchName.trim()) {
      return;
    }
    if (activeTab === 'completed') {
      const payouts = getPlayerPayouts(searchName.trim(), selectedDate);
      setResults(payouts);
    }
  };

  // Get active brackets for the searched player
  const activeBracketsForPlayer = useMemo(() => {
    if (!searchName.trim()) return [];
    
    const searchLower = searchName.trim().toLowerCase();
    const matchingUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchLower)
    );
    
    if (matchingUsers.length === 0) return [];
    
    const userIds = matchingUsers.map(u => u.id);
    const activeBrackets = brackets.filter(b => 
      !b.structure.completed && 
      b.players.some(p => userIds.includes(p.id))
    );
    
    return activeBrackets.map(bracket => {
      const cohort = cohorts.find(c => c.id === bracket.cohortId);
      const player = bracket.players.find(p => userIds.includes(p.id));
      
      // Find which round the player is currently in
      let currentRound = null;
      let currentMatch = null;
      let potentialPayout = 0;
      let position = null;
      
      for (let roundIndex = 0; roundIndex < bracket.structure.rounds.length; roundIndex++) {
        const round = bracket.structure.rounds[roundIndex];
        for (const match of round) {
          if ((match.player1?.id === player?.id || match.player2?.id === player?.id) && !match.completed) {
            currentRound = roundIndex + 1;
            currentMatch = match;
            break;
          }
        }
        if (currentRound) break;
      }
      
      // Calculate potential payout based on current position
      // If in final round (round 3), could win $25 or $10
      // If in round 2, could win $25 or $10
      // If in round 1, could win $25 or $10
      if (currentRound === 3) {
        // Final round - winner gets $25, loser gets $10
        potentialPayout = PayoutAmounts.FIRST_PLACE; // Could be first or second
        position = 'Final';
      } else if (currentRound === 2) {
        // Semi-final - if they win, could get $25 or $10
        potentialPayout = PayoutAmounts.FIRST_PLACE; // Could be first or second
        position = 'Semi-Final';
      } else if (currentRound === 1) {
        // First round - if they win, could get $25 or $10
        potentialPayout = PayoutAmounts.FIRST_PLACE; // Could be first or second
        position = 'Round 1';
      }
      
      return {
        bracket,
        cohort,
        player,
        currentRound,
        currentMatch,
        potentialPayout,
        position,
      };
    });
  }, [searchName, brackets, cohorts, users]);

  const totalPayout = results.reduce((sum, p) => sum + p.amount, 0);
  const totalPotentialPayout = activeBracketsForPlayer.reduce((sum, b) => sum + b.potentialPayout, 0);

  // Group by cohort
  const payoutsByCohort = results.reduce((acc, payout) => {
    if (!acc[payout.cohortId]) {
      acc[payout.cohortId] = [];
    }
    acc[payout.cohortId].push(payout);
    return acc;
  }, {});

  // Group active brackets by cohort
  const activeBracketsByCohort = activeBracketsForPlayer.reduce((acc, item) => {
    const cohortId = item.bracket.cohortId;
    if (!acc[cohortId]) {
      acc[cohortId] = [];
    }
    acc[cohortId].push(item);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Payout Search" />

      <View style={styles.searchSection}>
        <Text style={styles.label}>Player Name</Text>
        <TextInput
          style={styles.input}
          value={searchName}
          onChangeText={setSearchName}
          placeholder="Enter player name"
          placeholderTextColor={Colors.textLight}
        />

        {activeTab === 'completed' && (
          <>
            <Text style={styles.label}>Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textLight}
            />
          </>
        )}

        {activeTab === 'completed' && (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.buttonText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === 'active' ? (
          <>
            {!searchName.trim() ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Enter a player name to see active brackets</Text>
              </View>
            ) : activeBracketsForPlayer.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No active brackets found for this player</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total Potential Payout</Text>
                  <Text style={styles.summaryAmount}>${totalPotentialPayout.toFixed(2)}</Text>
                  <Text style={styles.summaryCount}>
                    {activeBracketsForPlayer.length} active bracket{activeBracketsForPlayer.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {Object.entries(activeBracketsByCohort).map(([cohortId, items]) => {
                  const cohort = items[0].cohort;
                  const cohortTotal = items.reduce((sum, item) => sum + item.potentialPayout, 0);
                  
                  return (
                    <View key={cohortId} style={styles.cohortCard}>
                      <Text style={styles.cohortName}>{cohort?.name || 'Unknown Cohort'}</Text>
                      <Text style={styles.cohortDate}>Type: {cohort?.type || 'N/A'}</Text>
                      
                      {items.map((item, index) => (
                        <View key={item.bracket.id} style={styles.bracketRow}>
                          <View style={styles.bracketInfo}>
                            <Text style={styles.bracketTitle}>
                              Bracket {item.bracket.bracketNumber}
                            </Text>
                            <Text style={styles.bracketStatus}>
                              Status: {item.position || 'Active'} | Round {item.currentRound || 'N/A'}
                            </Text>
                            <Text style={styles.bracketPotential}>
                              Potential: ${PayoutAmounts.FIRST_PLACE} (1st) or ${PayoutAmounts.SECOND_PLACE} (2nd)
                            </Text>
                          </View>
                          <Text style={styles.potentialAmount}>
                            ${item.potentialPayout.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                      
                      <View style={styles.cohortTotalRow}>
                        <Text style={styles.cohortTotalLabel}>Cohort Potential:</Text>
                        <Text style={styles.cohortTotalAmount}>${cohortTotal.toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <>
            {results.length === 0 && searchName ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No payouts found</Text>
              </View>
            ) : results.length > 0 ? (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total Payout</Text>
                  <Text style={styles.summaryAmount}>${totalPayout.toFixed(2)}</Text>
                  <Text style={styles.summaryCount}>
                    {results.length} payout{results.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {Object.entries(payoutsByCohort).map(([cohortId, payouts]) => {
                  const cohortTotal = payouts.reduce((sum, p) => sum + p.amount, 0);
                  
                  return (
                    <View key={cohortId} style={styles.cohortCard}>
                      <Text style={styles.cohortName}>{payouts[0].cohortName}</Text>
                      <Text style={styles.cohortDate}>Date: {payouts[0].date}</Text>
                      
                      {payouts.map((payout) => (
                        <View key={payout.id} style={styles.payoutRow}>
                          <View style={styles.payoutInfo}>
                            <Text style={styles.payoutPosition}>
                              {payout.position === 1 ? '🥇' : '🥈'} {payout.position === 1 ? '1st Place' : '2nd Place'}
                            </Text>
                            <Text style={styles.payoutBracket}>
                              Bracket {payout.bracketId.split('_').pop()}
                            </Text>
                          </View>
                          <Text style={styles.payoutAmount}>${payout.amount.toFixed(2)}</Text>
                        </View>
                      ))}
                      
                      <View style={styles.cohortTotalRow}>
                        <Text style={styles.cohortTotalLabel}>Cohort Total:</Text>
                        <Text style={styles.cohortTotalAmount}>${cohortTotal.toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Enter a player name and search</Text>
              </View>
            )}
          </>
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
  searchSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.success,
    margin: 16,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: Colors.white,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cohortCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cohortName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cohortDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  bracketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bracketInfo: {
    flex: 1,
  },
  bracketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bracketStatus: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bracketPotential: {
    fontSize: 12,
    color: Colors.info,
    fontStyle: 'italic',
  },
  potentialAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.warning,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutPosition: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  payoutBracket: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  cohortTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  cohortTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  cohortTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
