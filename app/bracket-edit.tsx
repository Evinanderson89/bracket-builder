import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';
import type { Match } from '../utils/types';

const CARD_H = 70;
const CARD_W = 180;
const CARD_GAP = 20;

export default function BracketEditScreen() {
  const { bracketId, cohortId } = useLocalSearchParams<{ bracketId: string; cohortId: string }>();
  const router = useRouter();
  const { brackets, cohorts, getPlayerGames } = useApp();

  const bracket = brackets.find(b => b.id === bracketId);
  const cohort = cohorts.find(c => c.id === cohortId);

  if (!bracket || !cohort) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationHeader title="Bracket" />
        <View style={styles.center}><Text style={styles.errorText}>Bracket not found</Text></View>
      </SafeAreaView>
    );
  }

  const getScore = (playerId: string, gameNum: number) => {
    if (!cohortId || !playerId) return null;
    const games = getPlayerGames(cohortId, playerId);
    return games.find(g => g.gameNumber === gameNum)?.score ?? null;
  };

  const PlayerRow = ({ player, roundIndex, isWinner, isLoser }: {
    player: any; roundIndex: number; isWinner: boolean; isLoser: boolean;
  }) => {
    const score = player ? getScore(player.id, roundIndex + 1) : null;
    let total = score;
    if (player && score != null && cohort.type === 'Handicap') total = score + (player.handicap || 0);

    return (
      <View style={[styles.playerRow, isWinner && styles.playerRowWin, !player && styles.playerRowEmpty]}>
        <View style={styles.nameWrap}>
          <Text style={[styles.pName, isWinner && styles.textWin, isLoser && styles.textLose]} numberOfLines={1}>
            {player ? player.name : 'TBD'}
          </Text>
          {player && (
            <Text style={styles.pDetail}>
              Avg: {player.average}{cohort.type === 'Handicap' ? ` | Hdcp: ${player.handicap}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.scoreWrap}>
          {score != null ? (
            <View style={styles.scoreBadge}>
              <Text style={[styles.scoreVal, isWinner && styles.textWin]}>{total}</Text>
            </View>
          ) : (
            <Text style={styles.noScore}>-</Text>
          )}
        </View>
      </View>
    );
  };

  const MatchCard = ({ match, roundIndex }: { match: Match; roundIndex: number }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <Text style={styles.matchTitle}>Game {roundIndex + 1}</Text>
      </View>
      <View style={styles.matchBody}>
        <PlayerRow player={match?.player1} roundIndex={roundIndex}
          isWinner={match?.winner?.id === match?.player1?.id} isLoser={match?.completed && match?.winner?.id !== match?.player1?.id && !!match?.player1} />
        <View style={styles.vs} />
        <PlayerRow player={match?.player2} roundIndex={roundIndex}
          isWinner={match?.winner?.id === match?.player2?.id} isLoser={match?.completed && match?.winner?.id !== match?.player2?.id && !!match?.player2} />
      </View>
      {match?.completed && (
        <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>
      )}
    </View>
  );

  const { rounds } = bracket.structure;
  const finalMatch = rounds[rounds.length - 1]?.[0];
  const champion = bracket.structure.winner || finalMatch?.winner;

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={`Bracket ${bracket.bracketNumber}`} />

      <View style={styles.dashboard}>
        <View>
          <Text style={styles.cohortName}>{cohort.name}</Text>
          <Text style={styles.cohortType}>{cohort.type} Tournament</Text>
        </View>
        <TouchableOpacity style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/game-entry' as any, params: { cohortId } })}>
          <Text style={styles.actionBtnText}>Enter Scores</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.canvas} contentContainerStyle={styles.canvasInner}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.bracketPad}>
            <View style={styles.tree}>
              {rounds.map((roundMatches, ri) => {
                const mult = Math.pow(2, ri);
                const gap = (CARD_H + CARD_GAP) * mult;
                const mt = (gap - (CARD_H + CARD_GAP)) / 2;
                const isFinal = ri === rounds.length - 1;

                return (
                  <React.Fragment key={ri}>
                    <View style={[styles.roundCol, { marginTop: ri > 0 ? mt : 0 }]}>
                      <Text style={styles.colHeader}>Round {ri + 1}</Text>
                      {roundMatches.map((match, mi) => (
                        <View key={mi} style={{ marginBottom: gap - CARD_H }}>
                          <MatchCard match={match} roundIndex={ri} />
                        </View>
                      ))}
                    </View>
                    {!isFinal && (
                      <View style={[styles.connCol, { marginTop: ri > 0 ? mt : 0 }]}>
                        {roundMatches.map((_, idx) => {
                          if (idx % 2 !== 0) return null;
                          return (
                            <View key={idx} style={{ height: gap + (gap - CARD_H), justifyContent: 'center' }}>
                              <View style={styles.connector}>
                                <View style={styles.hLine} />
                                <View style={[styles.vLine, { height: gap }]} />
                                <View style={styles.hLine} />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </React.Fragment>
                );
              })}

              {champion && (
                <>
                  <View style={styles.connCol}><View style={styles.finalLine} /></View>
                  <View style={[styles.roundCol, styles.champCol]}>
                    <Text style={styles.champHeader}>CHAMPION</Text>
                    <View style={styles.champCard}>
                      <Text style={styles.champName}>{champion.name}</Text>
                      <Text style={styles.champSub}>WINNER</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textPrimary },
  dashboard: {
    backgroundColor: Colors.surface, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10,
  },
  cohortName: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  cohortType: { fontSize: 12, color: Colors.accent, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  actionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  actionBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  canvas: { flex: 1 },
  canvasInner: { flexGrow: 1, justifyContent: 'center' },
  bracketPad: { padding: 40, minWidth: Dimensions.get('window').width },
  tree: { flexDirection: 'row', alignItems: 'flex-start' },
  roundCol: { width: CARD_W, alignItems: 'center', zIndex: 2 },
  colHeader: { color: Colors.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  connCol: { width: 40, alignItems: 'center', paddingTop: 30 },
  // Match card
  matchCard: { width: CARD_W, height: 90, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  matchHeader: { backgroundColor: Colors.surfaceSecondary, paddingVertical: 2, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  matchTitle: { fontSize: 9, color: Colors.textSecondary, fontWeight: 'bold' },
  matchBody: { flex: 1, justifyContent: 'center' },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, height: 32 },
  playerRowWin: { backgroundColor: 'rgba(16,185,129,0.1)' },
  playerRowEmpty: { opacity: 0.5 },
  nameWrap: { flex: 1 },
  pName: { fontSize: 12, color: Colors.textPrimary, fontWeight: '500' },
  textWin: { color: Colors.success, fontWeight: 'bold' },
  textLose: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  pDetail: { fontSize: 8, color: Colors.textSecondary },
  scoreWrap: { marginLeft: 8, minWidth: 24, alignItems: 'flex-end' },
  scoreBadge: { backgroundColor: Colors.background, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  scoreVal: { fontSize: 11, fontWeight: 'bold', color: Colors.textPrimary },
  noScore: { color: Colors.textLight, fontSize: 12 },
  vs: { height: 1, backgroundColor: Colors.border },
  checkBadge: { position: 'absolute', right: 4, top: 4, backgroundColor: Colors.success, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  checkText: { color: Colors.white, fontSize: 9, fontWeight: 'bold' },
  // Connectors
  connector: { width: '100%', flexDirection: 'row', alignItems: 'center', opacity: 0.5 },
  hLine: { width: 10, height: 2, backgroundColor: Colors.bracketLine },
  vLine: { width: 2, backgroundColor: Colors.bracketLine },
  finalLine: { width: 40, height: 2, backgroundColor: Colors.accent, marginTop: 65 },
  // Champion
  champCol: { justifyContent: 'center' },
  champHeader: { color: Colors.accent, fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  champCard: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.surface,
    borderWidth: 3, borderColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  champName: { fontSize: 14, fontWeight: 'bold', color: Colors.white, textAlign: 'center', paddingHorizontal: 10 },
  champSub: { fontSize: 10, color: Colors.accent, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
});
