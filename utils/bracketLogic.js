// Bracket logic utilities

/**
 * Randomly shuffle an array using Fisher-Yates algorithm
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Create brackets from users (8 users per bracket)
 */
export const createBrackets = (users) => {
  const brackets = [];
  const shuffledUsers = shuffleArray(users);
  
  let currentBracket = [];
  const usedUserIdsInCurrentBracket = new Set();
  
  for (const user of shuffledUsers) {
    if (currentBracket.length === 8) {
      brackets.push([...currentBracket]);
      currentBracket = [];
      usedUserIdsInCurrentBracket.clear();
    }
    
    if (!usedUserIdsInCurrentBracket.has(user.id)) {
      currentBracket.push(user);
      usedUserIdsInCurrentBracket.add(user.id);
    }
  }
  
  if (currentBracket.length === 8) {
    brackets.push(currentBracket);
  }
  
  return brackets;
};

/**
 * Create a full, pre-filled bracket structure
 */
export const createStepLadderStructure = (users) => {
  const rounds = [];
  
  // --- Round 1 (Quarter-Finals) ---
  const round1 = [];
  const shuffled = shuffleArray([...users]); 
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      round1.push({
        id: `r1_m${i/2}`,
        player1: shuffled[i],
        player2: shuffled[i+1],
        winner: null,
        completed: false,
      });
    }
  }
  rounds.push(round1);
  
  // --- Round 2 (Semi-Finals) ---
  const round2 = [];
  for (let i = 0; i < 2; i++) {
    round2.push({
      id: `r2_m${i}`,
      player1: null,
      player2: null,
      winner: null,
      completed: false,
    });
  }
  rounds.push(round2);
  
  // --- Round 3 (Finals) ---
  const round3 = [];
  round3.push({
    id: `r3_m0`,
    player1: null,
    player2: null,
    winner: null,
    completed: false,
  });
  rounds.push(round3);
  
  return {
    rounds,
    winner: null,
    completed: false,
  };
};

/**
 * Calculate total score
 */
export const calculateTotalScore = (score, handicap, isHandicap) => {
  if (isHandicap) {
    return score + (handicap || 0);
  }
  return score;
};

/**
 * Advance winner in bracket
 */
export const advanceWinner = (bracket, roundIndex, matchIndex, winner) => {
  const updatedBracket = JSON.parse(JSON.stringify(bracket));
  const structure = updatedBracket.structure || updatedBracket;
  const rounds = structure.rounds || structure;
  
  if (rounds[roundIndex] && rounds[roundIndex][matchIndex]) {
    rounds[roundIndex][matchIndex].completed = true;
    rounds[roundIndex][matchIndex].winner = winner;
  }
  
  if (roundIndex < rounds.length - 1) {
    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);
    
    if (!rounds[nextRoundIndex]) rounds[nextRoundIndex] = [];
    if (!rounds[nextRoundIndex][nextMatchIndex]) {
       rounds[nextRoundIndex][nextMatchIndex] = {
         player1: null, player2: null, winner: null, completed: false
       };
    }
    
    const nextMatch = rounds[nextRoundIndex][nextMatchIndex];

    if (matchIndex % 2 === 0) {
      if (nextMatch.player2?.id === winner.id) {
         nextMatch.player2 = nextMatch.player1; 
         nextMatch.player1 = winner;
      } else {
         nextMatch.player1 = winner;
      }
    } else {
      if (nextMatch.player1?.id === winner.id) {
        nextMatch.player1 = nextMatch.player2; 
        nextMatch.player2 = winner;
      } else {
        nextMatch.player2 = winner;
      }
    }
    
  } else {
    // Final Round Completed
    structure.winner = winner;
    structure.completed = true;
  }
  
  return updatedBracket;
};

export const isBracketComplete = (bracket) => {
  return bracket.completed && bracket.winner !== null;
};

/**
 * Check if a player has been eliminated from a specific bracket
 */
export const isPlayerEliminated = (bracket, playerId) => {
  const structure = bracket.structure || bracket;
  if (!structure || !structure.rounds) return false;

  for (const round of structure.rounds) {
    for (const match of round) {
      if (match.completed) {
         if (match.player1?.id === playerId && match.winner?.id !== playerId) return true;
         if (match.player2?.id === playerId && match.winner?.id !== playerId) return true;
      }
    }
  }
  return false;
};

/**
 * Check if player is "Live" in the cohort
 */
export const isPlayerLiveInCohort = (playerId, cohortBrackets) => {
  const playerBrackets = cohortBrackets.filter(b => 
    b.players.some(p => p.id === playerId)
  );
  if (playerBrackets.length === 0) return true; 
  return playerBrackets.some(b => !isPlayerEliminated(b, playerId));
};

/**
 * Check if a specific game number is relevant for a player.
 */
export const isScoreRelevant = (playerId, gameNumber, brackets) => {
  if (gameNumber === 1) return true;

  const playerBrackets = brackets.filter(b => b.players.some(p => p.id === playerId));
  if (playerBrackets.length === 0) return false;

  // Check if they are NOT eliminated in at least one bracket before this game
  return playerBrackets.some(bracket => !isEliminatedBeforeGame(bracket, playerId, gameNumber));
};

// Helper: Checks if player lost in any round BEFORE the target game number
const isEliminatedBeforeGame = (bracket, playerId, gameNumber) => {
  const structure = bracket.structure || bracket;
  if (!structure || !structure.rounds) return false; // Safety check

  const roundsToCheck = gameNumber - 1; 
  
  for (let r = 0; r < roundsToCheck; r++) {
    const round = structure.rounds[r];
    if (!round) continue;
    
    // Find match player was in for this round
    const match = round.find(m => m.player1?.id === playerId || m.player2?.id === playerId);
    
    // If match exists, is completed, and winner is NOT player -> They lost this round.
    if (match && match.completed && match.winner?.id !== playerId) {
      return true; 
    }
  }
  return false; 
};