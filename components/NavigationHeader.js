import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '../styles/colors';

// Route mapping for fallback navigation
const routeMap = {
  '/register': '/',
  '/cohorts': '/',
  '/cohort-detail': '/cohorts',
  '/bracket-edit': '/cohorts',
  '/game-entry': '/',
  '/admin': '/',
  '/payout': '/',
};

export default function NavigationHeader({ title, showBack = true, showHome = true }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    // If we're on the home screen, don't do anything
    if (pathname === '/' || pathname === '/index' || pathname === '') {
      return;
    }
    
    // Use route mapping for reliable navigation
    const fallbackRoute = routeMap[pathname];
    if (fallbackRoute) {
      router.push(fallbackRoute);
    } else {
      // Default to home if no mapping exists
      router.push('/');
    }
  };

  return (
    <View style={styles.header}>
      {showBack && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      {!showBack && showHome && <View style={styles.spacer} />}
      
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      
      {showHome && (
        <TouchableOpacity onPress={() => router.push('/')} style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>
      )}
      {!showHome && <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.headerDark,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingRight: 12,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  homeButton: {
    paddingLeft: 12,
  },
  homeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    width: 60,
  },
});


