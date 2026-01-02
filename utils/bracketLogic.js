// utils/bracketLogic.js

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
 * OPTIMIZED & RANDOMIZED LOGIC:
 * 1. Calculate realistic max brackets (filtering out dead tickets).
 * 2. Sort users by ticket count to ensure heavy users fit.
 * 3. Place users into RANDOM valid brackets (not just the first one).
 */
export const createBrackets = (users) => {
  // 1. Group by User ID and count tickets
  const userMap = new Map();
  users.forEach(u => {
    if (!userMap.has(u.id)) {
      userMap.set(u.id, { ...u, count: 0 });
    }
    userMap.get(u.id).count++;
  });
  
  const uniqueUsers = Array.from(userMap.values());
  
  // 2. Optimization: Calculate realistic max brackets
  let validTickets = users.length;
  let numBrackets = Math.floor(validTickets / 8);
  
  // Iterative adjustment to find true max
  for (let i = 0; i < 5; i++) {
    if (numBrackets === 0) break;
    
    let currentValidCount = 0;
    uniqueUsers.forEach(u => {
      // User can only be in a bracket once
      currentValidCount += Math.min(u.count, numBrackets); 
    });
    
    const newNumBrackets = Math.floor(currentValidCount / 8);
    if (newNumBrackets === numBrackets) break;
    numBrackets = newNumBrackets;
  }
  
  if (numBrackets === 0) return []; 

  // 3. Sort users by ticket count (Highest first)
  uniqueUsers.sort((a, b) => b.count - a.count);

  // 4. Initialize Brackets
  const brackets = Array.from({ length: numBrackets }, (_, i) => ({
    id: i + 1,
    players: []
  }));

  // 5. Fill Logic (Randomized Distribution)
  uniqueUsers.forEach(user => {
    const ticketsToPlace = Math.min(user.count, numBrackets);
    
    // Find ALL brackets where this user can legally go
    const validBrackets = brackets.filter(b => 
      b.players.length < 8 && !b.players.some(p => p.id === user.id)
    );

    // Shuffle the valid options so we pick random ones
    for (let i = validBrackets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validBrackets[i], validBrackets[j]] = [validBrackets[j], validBrackets[i]];
    }

    // Take the first N brackets from the shuffled list
    const selectedBrackets = validBrackets.slice(0, ticketsToPlace);

    // Add user to the selected brackets
    selectedBrackets.forEach(bracket => {
      const { count, ...cleanUser } = user;
      bracket.players.push(cleanUser);
    });
  });

  // 6. Final Shuffle within brackets (Matchup Randomization)
  brackets.forEach(b => {
    const players = b.players;
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  });

  // 7. Return only full brackets
  return brackets
    .filter(b => b.players.length === 8)
    .map(b => b.players);
};

/**
 * Create a full, pre-filled bracket structure (Standard 8-player Single Elimination)
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
 * Calculate total score (score + handicap if handicap type)
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

/**
 * Check if bracket is complete
 */
export const isBracketComplete = (bracket) => {
  return bracket.completed && bracket.winner !== null;
};

/**
 * Check if a player has been eliminated from a specific bracket
 * Returns TRUE if player played a match and lost.
 */
export const isPlayerEliminated = (bracket, playerId) => {
  const structure = bracket.structure || bracket;
  if (!structure || !structure.rounds) return false;

  for (const round of structure.rounds) {
    for (const match of round) {
      if (match.completed) {
         // If player was in this match and did NOT win, they are eliminated
         if (match.player1?.id === playerId && match.winner?.id !== playerId) return true;
         if (match.player2?.id === playerId && match.winner?.id !== playerId) return true;
      }
    }
  }
  return false;
};

/**
 * Check if player is "Live" in the cohort (alive in at least one bracket)
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
  // Game 1 is always relevant
  if (gameNumber === 1) return true;

  // Filter to brackets containing this player
  const playerBrackets = brackets.filter(b => b.players.some(p => p.id === playerId));
  
  if (playerBrackets.length === 0) return false;

  // Check if they are eliminated in ALL brackets before this game
  return playerBrackets.some(bracket => !isEliminatedBeforeGame(bracket, playerId, gameNumber));
};

// Helper: Checks if player lost in any round BEFORE the target game number
const isEliminatedBeforeGame = (bracket, playerId, gameNumber) => {
  const structure = bracket.structure || bracket;
  if (!structure || !structure.rounds) return false; 

  // We check rounds 0 up to gameNumber - 2. 
  // Example: For Game 2 (Round Index 1), we check Round 0.
  const roundsToCheck = gameNumber - 1; 
  
  for (let r = 0; r < roundsToCheck; r++) {
    const round = structure.rounds[r];
    if (!round) continue;
    
    // Find match player was in for this round
    const match = round.find(m => m.player1?.id === playerId || m.player2?.id === playerId);
    
    // If match exists, is completed, and winner is NOT player -> They lost this round.
    if (match && match.completed && match.winner?.id !== playerId) {
      return true; // Eliminated in this bracket before the target game
    }
  }
  return false; // Not eliminated
};