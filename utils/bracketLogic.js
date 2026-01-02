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
 * PRIORITY LOGIC:
 * 1. Ensure every unique user gets into at least 1 bracket if possible.
 * 2. Fill remaining spots with duplicate entries (if user bought multiple).
 * 3. Enforce constraint: No user can be in the same bracket twice.
 */
export const createBrackets = (users) => {
  // 1. Separate entries into Primary (1st ticket) and Secondary (extra tickets)
  const distinctUsers = new Map(); // id -> user object
  const userCounts = new Map(); // id -> count
  
  users.forEach(u => {
    if (!distinctUsers.has(u.id)) {
      distinctUsers.set(u.id, u);
    }
    userCounts.set(u.id, (userCounts.get(u.id) || 0) + 1);
  });

  const primaryEntries = [];
  const secondaryEntries = [];

  distinctUsers.forEach((user, id) => {
    primaryEntries.push(user);
    const count = userCounts.get(id);
    for (let i = 1; i < count; i++) {
      secondaryEntries.push(user);
    }
  });

  // 2. Shuffle both groups independently to ensure randomness within priority tiers
  const shuffledPrimary = shuffleArray(primaryEntries);
  const shuffledSecondary = shuffleArray(secondaryEntries);

  // 3. Combine with Primary first (Priority Queue)
  // This ensures we try to place every unique user BEFORE placing 2nd/3rd entries
  const priorityQueue = [...shuffledPrimary, ...shuffledSecondary];

  // 4. Initialize Brackets
  const totalSlots = priorityQueue.length;
  // We can only make full brackets of 8
  const numBrackets = Math.floor(totalSlots / 8);
  const brackets = Array.from({ length: numBrackets }, () => []);

  // 5. Distribute greedily
  for (const user of priorityQueue) {
    // Find the first bracket that:
    // a) Has space (< 8 players)
    // b) Does NOT already have this user (Constraint: Unique per bracket)
    const targetBracket = brackets.find(b => 
      b.length < 8 && !b.some(u => u.id === user.id)
    );

    if (targetBracket) {
      targetBracket.push(user);
    }
    // If no suitable bracket found, this entry is effectively "leftover" and refunded/ignored
  }

  // 6. Return only full brackets (size 8)
  // Partial brackets are discarded as they cannot form a valid tournament tree
  return brackets.filter(b => b.length === 8);
};

/**
 * Create a full, pre-filled bracket structure (Standard 8-player Single Elimination)
 * Pre-filling ensures the visual tree is fully rendered with empty slots.
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
 * It is relevant if the player has NOT been eliminated prior to this round
 * in at least one of the brackets they are entered in.
 */
export const isScoreRelevant = (playerId, gameNumber, brackets) => {
  // Game 1 is always relevant
  if (gameNumber === 1) return true;

  // Filter to brackets containing this player
  const playerBrackets = brackets.filter(b => b.players.some(p => p.id === playerId));
  
  if (playerBrackets.length === 0) return false;

  // Check if they are eliminated in ALL brackets before this game
  // If there is ANY bracket where they are NOT eliminated before this game, it's relevant.
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
  return false; // Not eliminated (either won all previous, or previous rounds pending)
};