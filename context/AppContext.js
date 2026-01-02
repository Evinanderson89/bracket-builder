import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getUsers,
  saveUsers,
  getCohorts,
  saveCohorts,
  getBrackets,
  saveBrackets,
  getGames,
  saveGames,
  getPayouts,
  savePayouts,
  getDeletePassword,
  saveDeletePassword,
} from '../utils/storage';
import { createBrackets, createStepLadderStructure } from '../utils/bracketLogic';
import { CohortStatus, PayoutAmounts } from '../utils/types';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [games, setGames] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, cohortsData, bracketsData, gamesData, payoutsData, passwordData] = await Promise.all([
        getUsers(),
        getCohorts(),
        getBrackets(),
        getGames(),
        getPayouts(),
        getDeletePassword(),
      ]);
      
      setUsers(usersData);
      setCohorts(cohortsData);
      setBrackets(bracketsData);
      setGames(gamesData);
      setPayouts(payoutsData);
      setDeletePassword(passwordData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // User operations
  const addUser = async (user) => {
    // Check for duplicate by name (case-insensitive)
    const nameLower = user.name.trim().toLowerCase();
    const existingUser = users.find(u => u.name.trim().toLowerCase() === nameLower);
    
    if (existingUser) {
      throw new Error(`User "${user.name}" already exists`);
    }

    const newUser = {
      id: Date.now().toString(),
      ...user,
      createdAt: new Date().toISOString(),
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);
    return newUser;
  };

  // Remove duplicate users (keep first occurrence, remove duplicates)
  const removeDuplicateUsers = async () => {
    const seenNames = new Set();
    const uniqueUsers = [];
    const duplicatesRemoved = [];

    users.forEach(user => {
      const nameLower = user.name.trim().toLowerCase();
      if (!seenNames.has(nameLower)) {
        seenNames.add(nameLower);
        uniqueUsers.push(user);
      } else {
        duplicatesRemoved.push(user);
      }
    });

    if (duplicatesRemoved.length > 0) {
      setUsers(uniqueUsers);
      await saveUsers(uniqueUsers);
      return duplicatesRemoved.length;
    }
    return 0;
  };

  const updateUser = async (userId, updates) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);
  };

  const deleteUser = async (userId) => {
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);
  };

  // Cohort operations
  const addCohort = async (cohort) => {
    const newCohort = {
      id: Date.now().toString(),
      ...cohort,
      createdAt: new Date().toISOString(),
      status: CohortStatus.NOT_DEPLOYED,
      selectedUserIds: [], // Track which users are selected for this cohort
      userBracketCounts: {}, // Track numBrackets per user for this cohort: { userId: numBrackets }
    };
    const updatedCohorts = [...cohorts, newCohort];
    setCohorts(updatedCohorts);
    await saveCohorts(updatedCohorts);
    return newCohort;
  };

  const updateCohort = async (cohortId, updates) => {
    const updatedCohorts = cohorts.map(c => c.id === cohortId ? { ...c, ...updates } : c);
    setCohorts(updatedCohorts);
    await saveCohorts(updatedCohorts);
  };

  const deleteCohort = async (cohortId) => {
    // Delete associated brackets
    const updatedBrackets = brackets.filter(b => b.cohortId !== cohortId);
    setBrackets(updatedBrackets);
    await saveBrackets(updatedBrackets);

    // Delete associated games
    const updatedGames = games.filter(g => g.cohortId !== cohortId);
    setGames(updatedGames);
    await saveGames(updatedGames);

    // Delete associated payouts
    const updatedPayouts = payouts.filter(p => p.cohortId !== cohortId);
    setPayouts(updatedPayouts);
    await savePayouts(updatedPayouts);

    // Delete the cohort
    const updatedCohorts = cohorts.filter(c => c.id !== cohortId);
    setCohorts(updatedCohorts);
    await saveCohorts(updatedCohorts);
  };

  const verifyDeletePassword = (password) => {
    return password === deletePassword;
  };

  const setDeletePasswordValue = async (password) => {
    setDeletePassword(password);
    await saveDeletePassword(password);
  };

  const deployCohort = async (cohortId, selectedUsers, userBracketCounts) => {
    if (!selectedUsers || selectedUsers.length === 0) {
      throw new Error('No users selected for deployment');
    }

    // Expand users based on numBrackets from cohort-specific counts
    const expandedUsers = [];
    selectedUsers.forEach(user => {
      const numBrackets = userBracketCounts[user.id] || user.numBrackets || 1;
      for (let i = 0; i < numBrackets; i++) {
        expandedUsers.push({ ...user, bracketInstance: i });
      }
    });

    // Check if we have enough players (at least 8 for one bracket)
    const bracketsPossible = Math.floor(expandedUsers.length / 8);
    if (bracketsPossible < 1) {
      throw new Error('Need at least 8 player instances to create at least one bracket');
    }

    // Create brackets from expanded users (8 users per bracket)
    const bracketGroups = createBrackets(expandedUsers);
    
    // Create bracket structures
    const newBrackets = bracketGroups.map((group, index) => {
      const bracketStructure = createStepLadderStructure(group);
      return {
        id: `${cohortId}_bracket_${index}`,
        cohortId,
        bracketNumber: index + 1,
        players: group,
        structure: bracketStructure,
        createdAt: new Date().toISOString(),
      };
    });

    // Save brackets
    const updatedBrackets = [...brackets, ...newBrackets];
    setBrackets(updatedBrackets);
    await saveBrackets(updatedBrackets);

    // Update cohort status and save selected user IDs and bracket counts
    await updateCohort(cohortId, { 
      status: CohortStatus.ACTIVE,
      selectedUserIds: selectedUsers.map(u => u.id),
      userBracketCounts: userBracketCounts || {},
    });
  };

  // Game operations
  const saveGame = async (game) => {
    const existingIndex = games.findIndex(
      g => g.cohortId === game.cohortId &&
           g.playerId === game.playerId &&
           g.gameNumber === game.gameNumber
    );

    let updatedGames;
    if (existingIndex >= 0) {
      updatedGames = games.map((g, i) => i === existingIndex ? { ...g, ...game } : g);
    } else {
      const newGame = {
        id: Date.now().toString(),
        ...game,
        createdAt: new Date().toISOString(),
      };
      updatedGames = [...games, newGame];
    }

    setGames(updatedGames);
    await saveGames(updatedGames);
  };

  const getPlayerGames = (cohortId, playerId) => {
    return games.filter(
      g => g.cohortId === cohortId && g.playerId === playerId
    ).sort((a, b) => a.gameNumber - b.gameNumber);
  };

  // Bracket operations
  const updateBracket = async (bracketId, updates) => {
    // 1. Calculate the new state for brackets
    const updatedBrackets = brackets.map(b => b.id === bracketId ? { ...b, ...updates } : b);
    
    // 2. Update state and storage
    setBrackets(updatedBrackets);
    await saveBrackets(updatedBrackets);

    // 3. Check for completion using the *fresh* updatedBrackets list
    const bracket = updatedBrackets.find(b => b.id === bracketId);
    if (bracket && bracket.structure.completed && bracket.structure.winner) {
      // Pass the fresh list to ensure cohort completion check is accurate
      await createPayoutsForBracket(bracket, updatedBrackets);
    }
  };

  const createPayoutsForBracket = async (bracket, currentBrackets) => {
    const cohort = cohorts.find(c => c.id === bracket.cohortId);
    if (!cohort) return;

    // Check if payouts already exist for this bracket to avoid duplicates
    // (e.g. if updateBracket is called multiple times on a completed bracket)
    const existingPayouts = payouts.some(p => p.bracketId === bracket.id);
    
    if (!existingPayouts) {
      // Find second place (loser of final match)
      const finalRound = bracket.structure.rounds[bracket.structure.rounds.length - 1];
      const finalMatch = finalRound[0];
      const secondPlace = finalMatch.player1?.id === bracket.structure.winner.id
        ? finalMatch.player2
        : finalMatch.player1;

      const date = new Date().toISOString().split('T')[0];

      // Create payouts
      const newPayouts = [
        {
          id: `${bracket.id}_first`,
          cohortId: bracket.cohortId,
          cohortName: cohort.name,
          playerId: bracket.structure.winner.id,
          playerName: bracket.structure.winner.name,
          amount: PayoutAmounts.FIRST_PLACE,
          position: 1,
          date,
          bracketId: bracket.id,
        },
        {
          id: `${bracket.id}_second`,
          cohortId: bracket.cohortId,
          cohortName: cohort.name,
          playerId: secondPlace?.id,
          playerName: secondPlace?.name,
          amount: PayoutAmounts.SECOND_PLACE,
          position: 2,
          date,
          bracketId: bracket.id,
        },
        {
          id: `${bracket.id}_operator`,
          cohortId: bracket.cohortId,
          cohortName: cohort.name,
          playerId: 'operator',
          playerName: 'Operator',
          amount: PayoutAmounts.OPERATOR_CUT,
          position: 0,
          date,
          bracketId: bracket.id,
          isOperator: true,
        },
      ];

      const updatedPayouts = [...payouts, ...newPayouts];
      setPayouts(updatedPayouts);
      await savePayouts(updatedPayouts);
    }

    // Check if all brackets in cohort are complete
    // Use the passed `currentBrackets` (fresh) or fallback to `brackets` (stale state)
    const bracketList = currentBrackets || brackets;
    const cohortBrackets = bracketList.filter(b => b.cohortId === bracket.cohortId);
    const allComplete = cohortBrackets.every(b => b.structure.completed);
    
    if (allComplete) {
      // Only update if not already complete to save a write
      if (cohort.status !== CohortStatus.COMPLETE) {
        await updateCohort(bracket.cohortId, { status: CohortStatus.COMPLETE });
      }
    }
  };

  // Get brackets for cohort
  const getCohortBrackets = (cohortId) => {
    return brackets.filter(b => b.cohortId === cohortId);
  };

  // Get payouts for player
  const getPlayerPayouts = (playerName, date) => {
    return payouts.filter(p => {
      const matchesName = p.playerName.toLowerCase().includes(playerName.toLowerCase());
      const matchesDate = !date || p.date === date;
      return matchesName && matchesDate && !p.isOperator;
    });
  };

  // Get operator payouts
  const getOperatorPayouts = (date) => {
    return payouts.filter(p => {
      const matchesDate = !date || p.date === date;
      return p.isOperator && matchesDate;
    });
  };

  const value = {
    // State
    users,
    cohorts,
    brackets,
    games,
    payouts,
    loading,
    
    // User operations
    addUser,
    updateUser,
    deleteUser,
    removeDuplicateUsers,
    
    // Cohort operations
    addCohort,
    updateCohort,
    deployCohort,
    
    // Bracket operations
    updateBracket,
    getCohortBrackets,
    
    // Game operations
    saveGame,
    getPlayerGames,
    
    // Payout operations
    getPlayerPayouts,
    getOperatorPayouts,
    
    // Delete password operations
    deletePassword,
    verifyDeletePassword,
    setDeletePasswordValue,
    
    // Cohort deletion
    deleteCohort,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};