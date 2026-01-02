import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

const CARD_HEIGHT = 70;
const CARD_WIDTH = 180;
const CARD_GAP = 20; // Vertical gap between cards in the first round

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

  // --- Helper Functions ---

  const getPlayerGameScore = (playerId, gameNumber) => {
    if (!cohortId || !playerId) return null;
    const games = getPlayerGames(cohortId, playerId);
    const game = games.find(g => g.gameNumber === gameNumber);
    return game?.score;
  };

  // --- Components ---

  const MatchCard = ({ match, roundIndex, matchIndex }) => {
    const gameNumber = roundIndex + 1;
    
    // Helper to render a single player row within the card
    const PlayerRow = ({ player, opponent, isTop }) => {
      const score = player ? getPlayerGameScore(player.id, gameNumber) : null;
      
      const isWinner = match?.winner?.id === player?.id;
      const isLoser = match?.completed && !isWinner && player;
      
      // Calculate display score (with handicap)
      let totalScore = score;
      if (player && score !== null && score !== undefined && cohort.type === 'Handicap') {
         totalScore = score + (player.handicap || 0);
      }
      
      const hasScore = score !== null && score !== undefined;

      return (
        <View style={[
          styles.playerRow, 
          isWinner && styles.playerRowWinner,
          !player && styles.playerRowEmpty
        ]}>
          <View style={styles.nameContainer}>
            <Text style={[
              styles.playerName, 
              isWinner && styles.textWinner,
              isLoser && styles.textLoser
            ]} numberOfLines={1}>
              {player ? player.name : 'TBD'}
            </Text>
            {player && (
              <Text style={styles.playerDetails}>
                Avg: {player.average} {cohort.type === 'Handicap' ? `| Hdcp: ${player.handicap}` : ''}
              </Text>
            )}
          </View>
          
          <View style={styles.scoreContainer}>
            {hasScore ? (
              <View style={styles.scoreBadge}>
                <Text style={[styles.scoreText, isWinner && styles.textWinner]}>
                  {totalScore}
                </Text>
              </View>
            ) : (
              <Text style={styles.noScore}>-</Text>
            )}
          </View>
        </View>
      );
    };

    return (
      <View style={styles.matchCardContainer}>
        <View style={styles.matchCardHeader}>
          <Text style={styles.matchCardTitle}>Game {gameNumber}</Text>
        </View>
        <View style={styles.matchCardContent}>
          <PlayerRow player={match?.player1} opponent={match?.player2} isTop={true} />
          <View style={styles.vsDivider} />
          <PlayerRow player={match?.player2} opponent={match?.player1} isTop={false} />
        </View>
        {match?.completed && (
          <View style={styles.matchStatusIcon}>
             <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBracketTree = () => {
    const rounds = bracket.structure.rounds;
    
    // Logic to detect champion:
    // Either the bracket is explicitly marked complete...
    // OR the final match in the final round has a winner.
    const finalRound = rounds[rounds.length - 1];
    const finalMatch = finalRound && finalRound[0];
    const hasChampion = bracket.structure.completed || (finalMatch && finalMatch.winner);
    const championUser = bracket.structure.winner || (finalMatch && finalMatch.winner);

    return (
      <View style={styles.treeContainer}>
        {rounds.map((roundMatches, roundIndex) => {
          // Calculate layout constants for this round
          // The vertical spacing grows exponentially: 0->1x, 1->2x, 2->4x
          const spacingMultiplier = Math.pow(2, roundIndex);
          const roundGap = (CARD_HEIGHT + CARD_GAP) * spacingMultiplier;
          const marginTop = ((roundGap - (CARD_HEIGHT + CARD_GAP)) / 2);

          const isFinalRound = roundIndex === rounds.length - 1;

          return (
            <React.Fragment key={`round-${roundIndex}`}>
              {/* MATCH COLUMN */}
              <View style={[styles.roundColumn, { marginTop: roundIndex > 0 ? marginTop : 0 }]}>
                <Text style={styles.columnHeader}>Round {roundIndex + 1}</Text>
                {roundMatches.map((match, matchIndex) => (
                  <View 
                    key={`match-${roundIndex}-${matchIndex}`} 
                    style={{ marginBottom: roundGap - CARD_HEIGHT }} // Dynamic spacing
                  >
                    <MatchCard 
                      match={match} 
                      roundIndex={roundIndex} 
                      matchIndex={matchIndex} 
                    />
                  </View>
                ))}
              </View>

              {/* CONNECTOR COLUMN (Draw lines to next round) */}
              {!isFinalRound && (
                <View style={[styles.connectorColumn, { marginTop: roundIndex > 0 ? marginTop : 0 }]}>
                  {roundMatches.map((_, index) => {
                     // We only draw connectors for every PAIR of matches
                     if (index % 2 !== 0) return null;
                     
                     // Height covers the distance between this match and the next one
                     const connectorHeight = roundGap; 
                     
                     return (
                       <View key={`conn-${roundIndex}-${index}`} style={{ height: connectorHeight + (roundGap - CARD_HEIGHT), justifyContent: 'center' }}>
                          <View style={styles.bracketConnector}>
                              <View style={styles.connectorHorizontal} />
                              <View style={[styles.connectorVertical, { height: connectorHeight }]} />
                              <View style={styles.connectorHorizontal} />
                          </View>
                       </View>
                     );
                  })}
                </View>
              )}
            </React.Fragment>
          );
        })}

        {/* CHAMPION COLUMN */}
        {hasChampion && championUser && (
          <>
            <View style={styles.connectorColumn}>
               <View style={styles.finalConnector} />
            </View>
            <View style={[styles.roundColumn, styles.championColumn]}>
              <Text style={styles.championHeader}>🏆 CHAMPION</Text>
              <View style={styles.championCard}>
                <Text style={styles.championEmoji}>👑</Text>
                <Text style={styles.championName}>{championUser.name}</Text>
                <Text style={styles.championSub}>WINNER</Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={`Bracket ${bracket.bracketNumber}`} />
      
      {/* Subheader / Dashboard */}
      <View style={styles.dashboard}>
        <View>
          <Text style={styles.cohortName}>{cohort.name}</Text>
          <Text style={styles.bracketType}>{cohort.type} Tournament</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push({
            pathname: '/game-entry',
            params: { cohortId: cohortId }
          })}
        >
          <Text style={styles.actionButtonText}>Enter Scores</Text>
        </TouchableOpacity>
      </View>

      {/* Main Bracket Canvas */}
      <ScrollView 
        style={styles.canvas} 
        contentContainerStyle={styles.canvasContent}
        maximumZoomScale={2.0}
        minimumZoomScale={0.5}
        indicatorStyle="white"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.bracketPadding}>
             {renderBracketTree()}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dashboard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  cohortName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  bracketType: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Canvas
  canvas: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  canvasContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bracketPadding: {
    padding: 40,
    minWidth: Dimensions.get('window').width,
  },
  treeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  // Columns
  roundColumn: {
    width: CARD_WIDTH,
    alignItems: 'center',
    zIndex: 2,
  },
  connectorColumn: {
    width: 40, // Space for lines
    alignItems: 'center',
    paddingTop: 30, // Align with center of cards roughly if needed, usually managed by flex
  },
  columnHeader: {
    color: Colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },

  // Match Card
  matchCardContainer: {
    width: CARD_WIDTH,
    height: 90, // Slightly taller for header
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  matchCardHeader: {
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  matchCardTitle: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  matchCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 32,
  },
  playerRowWinner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Very faint green tint
  },
  playerRowEmpty: {
    opacity: 0.5,
  },
  nameContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  textWinner: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  textLoser: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  playerDetails: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  scoreContainer: {
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'flex-end',
  },
  scoreBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  noScore: {
    color: Colors.textLight,
    fontSize: 12,
  },
  vsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
  },
  matchStatusIcon: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: Colors.success,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Connectors
  bracketConnector: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.5,
  },
  connectorHorizontal: {
    width: 10,
    height: 2,
    backgroundColor: Colors.bracketLine,
  },
  connectorVertical: {
    width: 2,
    backgroundColor: Colors.bracketLine,
    height: '100%',
  },
  finalConnector: {
    width: 40,
    height: 2,
    backgroundColor: Colors.accent,
    marginTop: 65, // Adjust based on alignment
  },
  
  // Champion
  championColumn: {
    marginTop: 'auto',
    marginBottom: 'auto',
    justifyContent: 'center',
  },
  championHeader: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: Colors.accent,
    textShadowRadius: 10,
  },
  championCard: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  championEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  championName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  championSub: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.textPrimary,
  }
});