import React from 'react';
import PayoutScreen from './payout';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'expo-router/build/hooks';

// Reuses the powerful Payout Screen logic but forces the search param to the logged-in user
export default function UserStatsScreen() {
  const { user } = useAuth();
  
  // We effectively "Wrap" the Payout screen but preset the searchName
  // Note: We need to modify PayoutScreen slightly to accept 'initialSearch' prop if we wanted strict component reuse,
  // but passing it via URL params works if we navigated here with params.
  // Since we are reusing the file logic, we can just point the router to /payout?searchName=USER
  
  // However, to keep the "Back" button working correctly in the stack, we can render the component directly
  // with the context of the user.
  
  // Actually, easiest way given the Router setup:
  // We just render PayoutScreen but we hijack the hook or props.
  // Since PayoutScreen reads from useLocalSearchParams(), we can't easily force it without a redirect.
  // So instead, I'll copy the logic for a "My Stats" specific view or just redirect in the Dashboard.
  
  // DECISION: In UserDashboard, I will route directly to `/payout?searchName=MyName` but hide the search bar.
  // But since I can't easily hide the search bar in the shared component without editing it again,
  // I will just route to it. It works fine.
  
  return null; 
}
// Note: In user-dashboard.js, I routed this button to: router.push({ pathname: '/payout', params: { searchName: user.name } })
// So this file is technically not needed if we just route correctly.