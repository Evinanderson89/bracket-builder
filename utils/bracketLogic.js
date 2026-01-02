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
 * Ensures each user (by ID) appears only once per bracket
 * Returns array of brackets, each containing 8 unique users
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
 * Create a full, pre-filled bracket structure (Standard 8-player Single Elimination)
 * Pre-filling ensures the visual tree is fully rendered with empty slots.
 */
export const createStepLadderStructure = (users) => {
  // Standard 8-player Single Elimination
  // Round 1: 4 matches
  // Round 2: 2 matches
  // Round 3: 1 match (Final)
  
  const rounds = [];
  
  // --- Round 1 (Quarter-Finals) ---
  // Pair up all 8 players
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
  // Pre-fill with 2 empty matches
  const round2 = [];
  for (let i = 0; i < 2; i++) {
    round2.push({
      id: `r2_m${i}`,
      player1: null, // TBD
      player2: null, // TBD
      winner: null,
      completed: false,
    });
  }
  rounds.push(round2);
  
  // --- Round 3 (Finals) ---
  // Pre-fill with 1 empty match
  const round3 = [];
  round3.push({
    id: `r3_m0`,
    player1: null, // TBD
    player2: null, // TBD
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
  
  // 1. Mark current match as completed
  if (rounds[roundIndex] && rounds[roundIndex][matchIndex]) {
    rounds[roundIndex][matchIndex].completed = true;
    rounds[roundIndex][matchIndex].winner = winner;
  }
  
  // 2. Advance to next round if applicable
  if (roundIndex < rounds.length - 1) {
    const nextRoundIndex = roundIndex + 1;
    // Determine next match index: (0,1) -> 0; (2,3) -> 1
    const nextMatchIndex = Math.floor(matchIndex / 2);
    
    // Safety check: ensure next round/match exists (it should with pre-filled structure)
    if (!rounds[nextRoundIndex]) rounds[nextRoundIndex] = [];
    if (!rounds[nextRoundIndex][nextMatchIndex]) {
       rounds[nextRoundIndex][nextMatchIndex] = {
         player1: null, player2: null, winner: null, completed: false
       };
    }
    
    const nextMatch = rounds[nextRoundIndex][nextMatchIndex];

    // Determine slot based on current match index (even -> Top/Player1, odd -> Bottom/Player2)
    if (matchIndex % 2 === 0) {
      // Coming from Top (e.g., Match 0 or 2) -> Player 1 slot
      
      // Self-pairing check: If Player 2 is already this user, swap them to avoid P1 vs P1
      if (nextMatch.player2?.id === winner.id) {
         nextMatch.player2 = nextMatch.player1; // Swap out
         nextMatch.player1 = winner;
      } else {
         nextMatch.player1 = winner;
      }
    } else {
      // Coming from Bottom (e.g., Match 1 or 3) -> Player 2 slot
      
      // Self-pairing check
      if (nextMatch.player1?.id === winner.id) {
        nextMatch.player1 = nextMatch.player2; // Swap out
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