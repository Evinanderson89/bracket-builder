import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

const { width } = Dimensions.get('window');

export default function BracketEditScreen() {
  const { bracketId, cohortId } = useLocalSearchParams();
  const router = useRouter();
  const { brackets, cohorts, getPlayerGames } = useApp();

  const bracket = brackets.find(b => b.id === bracketId);
  const cohort = cohorts.find(c => c.id === cohortId);

  if (!bracket || !cohort) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bracket not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get all players who participated in each round
  const getPlayersInRound = (roundIndex) => {
    // For Round 1 (Game 1), show all 8 players from the bracket
    if (roundIndex === 0) {
      // Return all unique players from bracket.players
      const uniquePlayers = [];
      const seenIds = new Set();
      bracket.players.forEach(player => {
        if (player && !seenIds.has(player.id)) {
          uniquePlayers.push(player);
          seenIds.add(player.id);
        }
      });
      return uniquePlayers;
    }
    
    // For other rounds, get players from matches
    const round = bracket.structure.rounds[roundIndex];
    if (!round || !Array.isArray(round)) return [];
    
    const players = [];
    const seenIds = new Set();
    round.forEach(match => {
      if (match.player1 && !seenIds.has(match.player1.id)) {
        players.push(match.player1);
        seenIds.add(match.player1.id);
      }
      if (match.player2 && !seenIds.has(match.player2.id)) {
        players.push(match.player2);
        seenIds.add(match.player2.id);
      }
    });
    return players;
  };

  // Get player's game score for a specific round
  const getPlayerGameScore = (playerId, gameNumber) => {
    if (!cohortId) return null;
    const games = getPlayerGames(cohortId, playerId);
    const game = games.find(g => g.gameNumber === gameNumber);
    return game?.score;
  };

  const renderPlayerSlot = (player, isWinner, isLoser, score, gameNumber, roundIndex, matchCompleted, hasAdvanced, bothScoresEntered) => {
    const hasScore = score !== undefined && score !== null;
    const totalScore = cohort.type === 'Handicap' && hasScore
      ? score + (player?.handicap || 0)
      : score;

    return (
      <View
        style={[
          styles.playerSlot,
          isWinner && styles.winnerSlot,
          isLoser && styles.loserSlot,
          !player && styles.emptySlot,
        ]}
      >
        {player ? (
          <>
            <View style={styles.playerSlotContent}>
              <View style={styles.playerNameColumn}>
                <Text
                  style={[
                    styles.playerName,
                    isWinner && styles.winnerName,
                    isLoser && styles.loserName,
                  ]}
                  numberOfLines={1}
                >
                  {isLoser && '❌ '}
                  {player.name}
                </Text>
                <Text style={styles.playerInfo}>
                  Avg: {player.average} | Hdcp: {player.handicap}
                </Text>
              </View>
              <View style={styles.playerScoreColumn}>
                {hasScore ? (
                  // Show score calculation when score is entered
                  <Text style={styles.scoreText}>
                    {cohort.type === 'Handicap' ? (
                      <Text>
                        <Text style={styles.scoreValue}>{score}</Text>
                        <Text style={styles.plusSign}>+</Text>
                        <Text style={styles.handicapValue}>{player.handicap || 0}</Text>
                        <Text style={styles.equalsSign}>=</Text>
                        <Text style={[styles.totalValue, isWinner && styles.winnerTotal]}>
                          {totalScore}
                        </Text>
                      </Text>
                    ) : (
                      <Text style={[styles.scoreValue, isWinner && styles.winnerTotal]}>
                        {score}
                      </Text>
                    )}
                  </Text>
                ) : (
                  <Text style={styles.noScoreText}>-</Text>
                )}
              </View>
            </View>
            {isWinner && (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>✓</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.tbdText}>TBD</Text>
        )}
      </View>
    );
  };

  const renderStepLadderBracket = () => {
    const rounds = bracket.structure.rounds;
    const isComplete = bracket.structure.completed;
    const champion = bracket.structure.winner;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        <View style={styles.stepLadderContainer}>
          {/* Round 1 - Leftmost (8 players, 4 matches) */}
          <View style={[styles.roundColumn, { minHeight: 600 }]}>
            <View style={styles.roundHeader}>
              <Text style={styles.roundTitle}>Round 1</Text>
              <Text style={styles.roundSubtitle}>Game 1</Text>
            </View>
            <View style={styles.matchesContainer}>
              {rounds[0] && rounds[0].map((match, index) => {
                const player1IsWinner = match.winner?.id === match.player1?.id;
                const player2IsWinner = match.winner?.id === match.player2?.id;
                const player1IsLoser = match.completed && !player1IsWinner;
                const player2IsLoser = match.completed && !player2IsWinner;
                
                // Check if both scores are entered
                const player1Score = match.player1?.score;
                const player2Score = match.player2?.score;
                const bothScoresEntered = (player1Score !== undefined && player1Score !== null) && 
                                         (player2Score !== undefined && player2Score !== null);

                return (
                  <View key={index} style={styles.matchContainer}>
                    {renderPlayerSlot(
                      match.player1,
                      player1IsWinner,
                      player1IsLoser,
                      player1Score,
                      1,
                      0,
                      match.completed,
                      true,
                      bothScoresEntered
                    )}
                    <View style={styles.vsDivider} />
                    {renderPlayerSlot(
                      match.player2,
                      player2IsWinner,
                      player2IsLoser,
                      player2Score,
                      1,
                      0,
                      match.completed,
                      true,
                      bothScoresEntered
                    )}
                  </View>
                );
              })}
            </View>
            {/* Show all players in Round 1 */}
            <View style={styles.allPlayersInRound}>
              <Text style={styles.allPlayersLabel}>All Players in Game 1:</Text>
              {getPlayersInRound(0).map((player, idx) => {
                const score = getPlayerGameScore(player.id, 1);
                const isWinner = rounds[0]?.some(m => m.winner?.id === player.id);
                return (
                  <View key={idx} style={[styles.playerInRound, isWinner && styles.winnerInRound]}>
                    <Text style={[styles.playerInRoundText, isWinner && styles.winnerInRoundText]}>
                      {isWinner && '🏆 '}
                      {player.name}
                      {score !== undefined && score !== null && (
                        <Text style={styles.playerScore}>
                          {' '}({score}
                          {cohort.type === 'Handicap' && `+${player.handicap || 0}=${score + (player.handicap || 0)}`}
                          )
                        </Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Arrow pointing right */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>→</Text>
          </View>

          {/* Round 2 - Middle (4 players, 2 matches) */}
          <View style={[styles.roundColumn, styles.round2Column, { minHeight: 600 }]}>
            <View style={[styles.roundHeader, styles.round2Header]}>
              <Text style={styles.roundTitle}>Round 2</Text>
              <Text style={styles.roundSubtitle}>Game 2</Text>
            </View>
            <View style={styles.matchesContainer}>
              {rounds[1] && rounds[1].map((match, index) => {
                const player1IsWinner = match.winner?.id === match.player1?.id;
                const player2IsWinner = match.winner?.id === match.player2?.id;
                const player1IsLoser = match.completed && !player1IsWinner;
                const player2IsLoser = match.completed && !player2IsWinner;

                // Check if both scores are entered
                const player1Score = match.player1?.score;
                const player2Score = match.player2?.score;
                const bothScoresEntered = (player1Score !== undefined && player1Score !== null) && 
                                         (player2Score !== undefined && player2Score !== null);

                return (
                  <View key={index} style={styles.matchContainer}>
                    {renderPlayerSlot(
                      match.player1,
                      player1IsWinner,
                      player1IsLoser,
                      player1Score,
                      2,
                      1,
                      match.completed,
                      true,
                      bothScoresEntered
                    )}
                    <View style={styles.vsDivider} />
                    {renderPlayerSlot(
                      match.player2,
                      player2IsWinner,
                      player2IsLoser,
                      player2Score,
                      2,
                      1,
                      match.completed,
                      true,
                      bothScoresEntered
                    )}
                  </View>
                );
              })}
            </View>
            {/* Show all players in Round 2 */}
            <View style={styles.allPlayersInRound}>
              <Text style={styles.allPlayersLabel}>All Players in Game 2:</Text>
              {getPlayersInRound(1).map((player, idx) => {
                const score = getPlayerGameScore(player.id, 2);
                const isWinner = rounds[1]?.some(m => m.winner?.id === player.id);
                return (
                  <View key={player.id || idx} style={[styles.playerInRound, isWinner && styles.winnerInRound]}>
                    <Text style={[styles.playerInRoundText, isWinner && styles.winnerInRoundText]}>
                      {isWinner && '🏆 '}
                      {player.name}
                      {score !== undefined && score !== null && (
                        <Text style={styles.playerScore}>
                          {' '}({score}
                          {cohort.type === 'Handicap' && `+${player.handicap || 0}=${score + (player.handicap || 0)}`}
                          )
                        </Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Arrow pointing right */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>→</Text>
          </View>

          {/* Round 3 - Final (2 players, 1 match) */}
          <View style={[styles.roundColumn, styles.round3Column, { minHeight: 600 }]}>
            <View style={[styles.roundHeader, styles.round3Header]}>
              <Text style={styles.roundTitle}>Final</Text>
              <Text style={styles.roundSubtitle}>Game 3</Text>
            </View>
            <View style={styles.matchesContainer}>
              {rounds[2] && rounds[2].map((match, index) => {
                const player1IsWinner = match.winner?.id === match.player1?.id;
                const player2IsWinner = match.winner?.id === match.player2?.id;
                const player1IsLoser = match.completed && !player1IsWinner;
                const player2IsLoser = match.completed && !player2IsWinner;

                // Check if both scores are entered
                const player1Score = match.player1?.score;
                const player2Score = match.player2?.score;
                const bothScoresEntered = (player1Score !== undefined && player1Score !== null) && 
                                         (player2Score !== undefined && player2Score !== null);

                return (
                  <View key={index} style={styles.matchContainer}>
                    {renderPlayerSlot(
                      match.player1,
                      player1IsWinner,
                      player1IsLoser,
                      player1Score,
                      3,
                      2,
                      match.completed,
                      true,
                      bothScoresEntered
                    )}
                    <View style={styles.vsDivider} />
                    {renderPlayerSlot(
                      match.player2,
                      player2IsWinner,
                      player2IsLoser,
                      player2Score,
                      3,
                      2,
                      match.completed,
                      true,
                      bothScoresEntered
                    )}
                  </View>
                );
              })}
            </View>
            {/* Show all players in Round 3 */}
            <View style={styles.allPlayersInRound}>
              <Text style={styles.allPlayersLabel}>All Players in Game 3:</Text>
              {getPlayersInRound(2).map((player, idx) => {
                const score = getPlayerGameScore(player.id, 3);
                const isWinner = rounds[2]?.some(m => m.winner?.id === player.id);
                return (
                  <View key={player.id || idx} style={[styles.playerInRound, isWinner && styles.winnerInRound]}>
                    <Text style={[styles.playerInRoundText, isWinner && styles.winnerInRoundText]}>
                      {isWinner && '🏆 '}
                      {player.name}
                      {score !== undefined && score !== null && (
                        <Text style={styles.playerScore}>
                          {' '}({score}
                          {cohort.type === 'Handicap' && `+${player.handicap || 0}=${score + (player.handicap || 0)}`}
                          )
                        </Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Arrow pointing right */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>→</Text>
          </View>

          {/* Champion - Rightmost */}
          <View style={[styles.championColumn, { minHeight: 600 }]}>
            <View style={styles.championHeader}>
              <Text style={styles.championTitle}>🏆</Text>
              <Text style={styles.championLabel}>CHAMPION</Text>
            </View>
            {isComplete && champion ? (
              <View style={styles.championCard}>
                <Text style={styles.championName}>{champion.name}</Text>
                <Text style={styles.championSubtext}>Winner</Text>
              </View>
            ) : (
              <View style={styles.championCard}>
                <Text style={styles.tbdText}>TBD</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={`Bracket ${bracket.bracketNumber}`} />
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>{cohort.name}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{cohort.type}</Text>
        </View>
        <TouchableOpacity
          style={styles.editScoresButton}
          onPress={() => router.push({
            pathname: '/game-entry',
            params: { cohortId: cohortId }
          })}
        >
          <Text style={styles.editScoresButtonText}>Edit Scores</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.bracketWrapper}>
          {renderStepLadderBracket()}
        </View>

        <View style={styles.allPlayersSection}>
          <Text style={styles.allPlayersTitle}>👥 All Players in Bracket</Text>
          <View style={styles.playersGrid}>
            {bracket.players.map((player) => {
              const isChampion = bracket.structure.completed && 
                bracket.structure.winner?.id === player.id;
              return (
                <View
                  key={player.id}
                  style={[
                    styles.playerChip,
                    isChampion && styles.championChip,
                  ]}
                >
                  <Text style={[styles.playerChipText, isChampion && styles.championChipText]}>
                    {isChampion && '👑 '}
                    {player.name}
                  </Text>
                  <Text style={styles.playerChipInfo}>
                    Hdcp: {player.handicap}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subtitleContainer: {
    backgroundColor: Colors.surface,
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  editScoresButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  editScoresButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  typeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  bracketWrapper: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    minHeight: 400,
  },
  horizontalScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepLadderContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: width * 4.5,
  },
  roundColumn: {
    minWidth: 280,
    maxWidth: 280,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  round2Column: {
    paddingTop: 120, // Move down to align with top two matchups from Round 1
  },
  round3Column: {
    paddingTop: 200, // Move down to align with the matchup from Round 2
  },
  roundHeader: {
    backgroundColor: Colors.headerDark,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  round2Header: {
    marginBottom: 20, // Extra spacing for Round 2
  },
  round3Header: {
    marginBottom: 40, // Double spacing for Game 3
  },
  roundTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 2,
  },
  roundSubtitle: {
    fontSize: 10,
    color: Colors.textLight,
  },
  matchesContainer: {
    width: '100%',
    gap: 6,
    marginBottom: 8,
    flex: 1,
    justifyContent: 'space-between',
  },
  matchContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playerSlot: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 3,
    minHeight: 55,
    maxHeight: 65,
    justifyContent: 'center',
    position: 'relative',
  },
  playerSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  playerNameColumn: {
    flex: 1,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  playerScoreColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  winnerSlot: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    borderWidth: 3,
  },
  loserSlot: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.6,
    borderColor: Colors.danger,
    borderWidth: 2,
  },
  emptySlot: {
    backgroundColor: Colors.background,
    borderStyle: 'dashed',
  },
  playerName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'left',
    marginBottom: 2,
  },
  playerInfo: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'left',
  },
  winnerName: {
    color: Colors.white,
    fontSize: 12,
  },
  loserName: {
    color: Colors.danger,
    textDecorationLine: 'line-through',
    textDecorationColor: Colors.danger,
    opacity: 0.7,
  },
  handicapText: {
    fontSize: 9,
    color: Colors.info,
    fontWeight: '600',
    textAlign: 'right',
  },
  scoreText: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  noScoreText: {
    fontSize: 9,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  scoreValue: {
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontSize: 10,
  },
  plusSign: {
    color: Colors.textSecondary,
    fontSize: 8,
  },
  handicapValue: {
    color: Colors.info,
    fontSize: 8,
  },
  equalsSign: {
    color: Colors.textSecondary,
    fontSize: 8,
  },
  totalValue: {
    fontWeight: 'bold',
    color: Colors.primary,
    fontSize: 10,
  },
  winnerTotal: {
    color: Colors.white,
  },
  gameLabel: {
    fontSize: 8,
    color: Colors.textLight,
    marginTop: 1,
  },
  winnerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerBadgeText: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 11,
  },
  tbdText: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  vsDivider: {
    height: 1.5,
    backgroundColor: Colors.border,
    marginVertical: 3,
    borderRadius: 1,
  },
  allPlayersInRound: {
    width: '100%',
    backgroundColor: Colors.surfaceSecondary,
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 120,
  },
  allPlayersLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  playerInRound: {
    padding: 3,
    marginBottom: 2,
    borderRadius: 3,
    backgroundColor: Colors.background,
  },
  winnerInRound: {
    backgroundColor: Colors.success,
  },
  playerInRoundText: {
    fontSize: 9,
    color: Colors.textPrimary,
  },
  winnerInRoundText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  playerScore: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  arrowContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  arrowText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  championColumn: {
    minWidth: 260,
    maxWidth: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 200, // Center with Round 3 matchup
  },
  championHeader: {
    backgroundColor: Colors.success,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  championTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  championLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  championCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.success,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  championName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  championSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  allPlayersSection: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  allPlayersTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  playerChip: {
    backgroundColor: Colors.background,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  championChip: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
    borderWidth: 2,
  },
  playerChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  championChipText: {
    color: Colors.white,
  },
  playerChipInfo: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
});
