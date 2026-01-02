import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogleDev, switchToAdmin, user } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogleDev(email || undefined, name || undefined);
      router.replace('/user-dashboard');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = async () => {
    await switchToAdmin();
    router.replace('/');
  };

  const handleSwitchToAdmin = async () => {
    await switchToAdmin();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🏆 Bracket Builder</Text>
        <Text style={styles.subtitle}>Sign in to access your brackets</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email (Gmail)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@gmail.com"
            placeholderTextColor={Colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor={Colors.textLight}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In with Google</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.adminButton]}
            onPress={handleAdminAccess}
          >
            <Text style={styles.buttonText}>Admin Access</Text>
          </TouchableOpacity>

          {user && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.button, styles.switchButton]}
                onPress={async () => {
                  await switchToAdmin();
                  router.replace('/');
                }}
              >
                <Text style={styles.buttonText}>⚙️ Switch to Admin View</Text>
              </TouchableOpacity>
            </>
          )}
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
    padding: 24,
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
  form: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.white,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    backgroundColor: Colors.accent,
  },
  switchButton: {
    backgroundColor: Colors.success,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textLight,
    marginHorizontal: 16,
    fontSize: 14,
  },
});

