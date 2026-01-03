import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function HomeScreen() {
  const router = useRouter();
  const { user, mode, loading, switchToUser } = useAuth();

  // REMOVED: The useEffect that auto-redirected users away from this screen.
  // Now, 'index.js' acts as the central hub / Admin View.

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const handlePlayerSwitch = async () => {
    if (user) {
      // If logged in, switch mode and go to dashboard
      await switchToUser();
      router.push('/user-dashboard');
    } else {
      // If not logged in, go to login screen
      router.push('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <NavigationHeader title="🏆 Bracket Builder" showBack={false} />
      
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- PERSONA SWITCHER --- */}
        <View style={styles.personaContainer}>
          <View style={styles.personaTextContainer}>
             <Text style={styles.personaLabel}>Current View</Text>
             <Text style={styles.personaValue}>ADMINISTRATOR</Text>
          </View>
          <TouchableOpacity 
            style={styles.personaButton}
            onPress={handlePlayerSwitch}
          >
            <Text style={styles.personaButtonText}>
              {user ? 'Switch to Player View 👤' : 'Player Login 👤'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        
        <Text style={styles.subtitle}>Tournament Management</Text>
        
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
            <Text style={styles.buttonText}>Admin Settings</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    padding: 20,
  },
  
  // Persona Switcher Styles
  personaContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  personaTextContainer: {
    flex: 1,
  },
  personaLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  personaValue: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  personaButton: {
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personaButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },

  divider: {
    height: 1,
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.border,
    marginBottom: 24,
    opacity: 0.5,
  },

  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 2,
  },
  adminButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 12,
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
});