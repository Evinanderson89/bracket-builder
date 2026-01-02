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
    // If we have a full bracket, save it and start a new one
    if (currentBracket.length === 8) {
      brackets.push([...currentBracket]);
      currentBracket = [];
      usedUserIdsInCurrentBracket.clear();
    }
    
    // Only add user if their ID hasn't been used in this bracket
    // This ensures each user appears only once per bracket
    if (!usedUserIdsInCurrentBracket.has(user.id)) {
      currentBracket.push(user);
      usedUserIdsInCurrentBracket.add(user.id);
    }
    // If user ID already in bracket, skip this instance
    // (they can appear in other brackets, but not twice in the same one)
  }
  
  // Add the last bracket if it has exactly 8 users
  // Don't add incomplete brackets (less than 8 users)
  if (currentBracket.length === 8) {
    brackets.push(currentBracket);
  }
  
  return brackets;
};

/**
 * Create step ladder bracket structure
 * Ensures no user bowls against themselves
 * Returns bracket with matchups for each round
 */
export const createStepLadderStructure = (users) => {
  // Step ladder: 8 -> 4 -> 2 -> 1
  // Round 1: 8 players, 4 matches
  // Round 2: 4 players, 2 matches
  // Round 3: 2 players, 1 match (final)
  // Winner: 1 player
  
  const rounds = [];
  
  // Round 1: Pair up all 8 players, ensuring no user plays against themselves
  const round1 = [];
  const shuffled = shuffleArray([...users]); // Shuffle to randomize pairings
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      const player1 = shuffled[i];
      const player2 = shuffled[i + 1];
      
      // Double-check: ensure player1 and player2 are different users
      if (player1.id !== player2.id) {
        round1.push({
          player1: player1,
          player2: player2,
          winner: null,
          completed: false,
        });
      } else {
        // If somehow same user, try to find a different pairing
        // This shouldn't happen if createBrackets works correctly, but safety check
        console.warn('Attempted to pair user with themselves, skipping match');
      }
    }
  }
  rounds.push(round1);
  
  // Round 2: Will have 2 matches (4 players)
  rounds.push([]);
  
  // Round 3: Will have 1 match (2 players - final)
  rounds.push([]);
  
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
    return score + handicap;
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
  
  // Mark match as completed and set winner
  rounds[roundIndex][matchIndex].completed = true;
  rounds[roundIndex][matchIndex].winner = winner;
  
  // If not the final round, advance to next round
  if (roundIndex < rounds.length - 1) {
    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);
    
    // Initialize next round if needed
    if (!rounds[nextRoundIndex]) {
      rounds[nextRoundIndex] = [];
    }
    
    // Create or update match in next round
    if (!rounds[nextRoundIndex][nextMatchIndex]) {
      rounds[nextRoundIndex][nextMatchIndex] = {
        player1: null,
        player2: null,
        winner: null,
        completed: false,
      };
    }
    
    // Set winner as player1 or player2 in next match
    // Ensure we don't pair a user with themselves
    if (matchIndex % 2 === 0) {
      // Check if player2 already exists and is the same user
      if (rounds[nextRoundIndex][nextMatchIndex].player2?.id === winner.id) {
        // Swap positions to avoid self-pairing
        rounds[nextRoundIndex][nextMatchIndex].player2 = rounds[nextRoundIndex][nextMatchIndex].player1;
        rounds[nextRoundIndex][nextMatchIndex].player1 = winner;
      } else {
        rounds[nextRoundIndex][nextMatchIndex].player1 = winner;
      }
    } else {
      // Check if player1 already exists and is the same user
      if (rounds[nextRoundIndex][nextMatchIndex].player1?.id === winner.id) {
        // Swap positions to avoid self-pairing
        rounds[nextRoundIndex][nextMatchIndex].player1 = rounds[nextRoundIndex][nextMatchIndex].player2;
        rounds[nextRoundIndex][nextMatchIndex].player2 = winner;
      } else {
        rounds[nextRoundIndex][nextMatchIndex].player2 = winner;
      }
    }
    
    // Final safety check: if both players are the same, log warning
    const nextMatch = rounds[nextRoundIndex][nextMatchIndex];
    if (nextMatch.player1 && nextMatch.player2 && nextMatch.player1.id === nextMatch.player2.id) {
      console.error('Error: Attempted to create match with same user on both sides');
    }
  } else {
    // Final round - set as winner
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

