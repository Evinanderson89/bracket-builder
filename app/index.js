import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function HomeScreen() {
  const router = useRouter();
  const { user, mode, loading, switchToUser } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (mode === 'user' && user) {
        router.replace('/user-dashboard');
      } else if (mode === 'user' && !user) {
        router.replace('/login');
      }
    }
  }, [loading, mode, user, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // If in user mode, this screen shouldn't be shown (redirected in useEffect)
  if (mode === 'user') {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="🏆 Bracket Builder" showBack={false} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Bowling Tournament Management</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/players')}
          >
            <Text style={styles.buttonText}>Manage Players</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/cohorts')}
          >
            <Text style={styles.buttonText}>Manage Cohorts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/game-entry')}
          >
            <Text style={styles.buttonText}>Enter Scores</Text>
          </TouchableOpacity>
          
          {/* REVERTED: PAYOUTS BUTTON RESTORED */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/payout')}
          >
            <Text style={styles.buttonText}>View Payouts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.adminButton]}
            onPress={() => router.push('/admin')}
          >
            <Text style={styles.buttonText}>Admin</Text>
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={[styles.button, styles.switchButton]}
              onPress={async () => {
                await switchToUser();
                router.replace('/user-dashboard');
              }}
            >
              <Text style={styles.buttonText}>👤 Switch to Player View</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.headerDark,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: Colors.accent,
    marginTop: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.headerDark,
  },
  switchButton: {
    backgroundColor: Colors.success,
    marginTop: 12,
  },
});