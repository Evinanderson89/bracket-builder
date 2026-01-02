import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="🏆 Bracket Builder" showBack={false} />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Bowling Tournament Management</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.buttonText}>Register Players</Text>
          </TouchableOpacity>
          
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.headerDark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
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
});
