import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInDev, switchToAdmin, user } = useAuth();
  const { ensurePlayerForAuthUser } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [devLoading, setDevLoading] = useState(false);
  const [showDevForm, setShowDevForm] = useState(false);

  const googleConfig = useMemo(() => ({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  }), []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: googleConfig.expoClientId || '__missing_expo_client_id__',
    iosClientId: googleConfig.iosClientId || '__missing_ios_client_id__',
    androidClientId: googleConfig.androidClientId || '__missing_android_client_id__',
    webClientId: googleConfig.webClientId || '__missing_web_client_id__',
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    const run = async () => {
      if (response?.type !== 'success') return;
      try {
        const accessToken = response.authentication?.accessToken;
        if (!accessToken) throw new Error('Missing Google access token');

        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const info = await infoRes.json();
        if (!infoRes.ok) throw new Error(info?.error_description || 'Failed to fetch Google profile');
        if (!info?.email_verified) throw new Error('Google account email is not verified');

        const authUser = await signIn({
          id: info.sub || `google_${Date.now()}`,
          email: info.email,
          name: info.name || info.email,
          picture: info.picture || null,
          accessToken,
          provider: 'google',
          emailVerified: !!info.email_verified,
        });

        // Auto-create player record for Google-authenticated users
        try {
          await ensurePlayerForAuthUser(authUser);
        } catch (e) {
          console.warn('Auto-create player failed:', e);
        }

        router.replace('/user-dashboard' as any);
      } catch (e: any) {
        Alert.alert('Google Sign-In Failed', e.message || 'Unable to authenticate with Google');
      }
    };
    run();
  }, [response, router, signIn]);

  const handleDevSignIn = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    setDevLoading(true);
    try {
      await signInDev(email || undefined, name || undefined);
      router.replace('/user-dashboard' as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Sign-in failed');
    } finally {
      setDevLoading(false);
    }
  };

  const canUseGoogle = Platform.select({
    web: !!googleConfig.webClientId,
    ios: !!(googleConfig.iosClientId || googleConfig.expoClientId),
    android: !!(googleConfig.androidClientId || googleConfig.expoClientId),
    default: !!googleConfig.expoClientId,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerDark} />
      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbAccent} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>BRACKET BUILDER</Text>
          <Text style={styles.title}>Tournament play with a clean, focused interface.</Text>
          <Text style={styles.subtitle}>
            Sign in to enter tournaments, track bracket progress, and view your running stats.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Ionicons name="shield-checkmark" size={17} color={Colors.success} />
            <Text style={styles.formHeaderText}>Secure sign in</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.googleButton, (!request || !canUseGoogle) && styles.disabled]}
            onPress={() => promptAsync()}
            disabled={!request || !canUseGoogle}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Continue with Google</Text>
          </TouchableOpacity>

          {!canUseGoogle && (
            <Text style={styles.helperText}>
              Google sign-in is not configured yet. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and restart the app.
            </Text>
          )}

          {__DEV__ && (
            <View style={styles.devWrap}>
              <TouchableOpacity style={styles.devToggle} onPress={() => setShowDevForm(v => !v)}>
                <Text style={styles.devToggleText}>{showDevForm ? 'Hide' : 'Show'} Developer Options</Text>
              </TouchableOpacity>

              {showDevForm && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@gmail.com"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!devLoading}
                  />

                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your Name"
                    placeholderTextColor={Colors.textLight}
                    editable={!devLoading}
                  />

                  <TouchableOpacity
                    style={[styles.button, devLoading && styles.disabled]}
                    onPress={handleDevSignIn}
                    disabled={devLoading}
                    activeOpacity={0.85}
                  >
                    {devLoading
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.buttonText}>Sign In (Dev)</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.adminButton]}
            onPress={async () => { await switchToAdmin(); router.replace('/' as any); }}
            activeOpacity={0.85}
          >
            <Ionicons name="settings" size={16} color={Colors.white} style={{ marginRight: 7 }} />
            <Text style={styles.buttonText}>Admin Access</Text>
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={[styles.button, styles.switchButton]}
              onPress={async () => { await switchToAdmin(); router.replace('/' as any); }}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Switch to Admin View</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgOrbPrimary: {
    position: 'absolute',
    top: 10,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: Colors.glowPrimary,
  },
  bgOrbAccent: {
    position: 'absolute',
    bottom: -30,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: Colors.glowAccent,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 26,
  },
  heroCard: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 8,
    padding: 18,
  },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  title: { color: Colors.white, fontSize: 26, lineHeight: 31, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
  form: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  formHeaderText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14, marginLeft: 7 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  helperText: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  input: {
    backgroundColor: Colors.tabBar,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    color: Colors.white,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primaryDark,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: Platform.OS === 'web' ? '#0f62fe' : '#1f6feb',
    marginTop: 0,
  },
  adminButton: { backgroundColor: Colors.accent },
  switchButton: { backgroundColor: Colors.success, marginTop: 10 },
  devWrap: {
    marginTop: 16,
    paddingTop: 12,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  devToggle: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  devToggleText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
