import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../styles/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInDev, switchToAdmin, user } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  const googleConfig = useMemo(() => ({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  }), []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // The hook requires platform client IDs to be defined at init time.
    // We provide safe placeholders to avoid hard crashes and gate usage with `canUseGoogle`.
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

        await signIn({
          id: info.sub || `google_${Date.now()}`,
          email: info.email,
          name: info.name || info.email,
          picture: info.picture || null,
          accessToken,
          provider: 'google',
          emailVerified: !!info.email_verified,
        });
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
      <View style={styles.content}>
        <Text style={styles.title}>Bracket Builder</Text>
        <Text style={styles.subtitle}>Sign in with Google to access your brackets</Text>

        <View style={styles.form}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton, (!request || !canUseGoogle) && styles.disabled]}
            onPress={() => promptAsync()}
            disabled={!request || !canUseGoogle}
          >
            <Text style={styles.buttonText}>Continue with Google</Text>
          </TouchableOpacity>

          {!canUseGoogle && (
            <Text style={styles.helperText}>
              Add the Google OAuth client ID for this platform (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` on web) to enable Gmail login.
            </Text>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>DEV ONLY</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input} value={email} onChangeText={setEmail}
            placeholder="your.email@gmail.com" placeholderTextColor={Colors.textLight}
            keyboardType="email-address" autoCapitalize="none" editable={!devLoading}
          />

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input} value={name} onChangeText={setName}
            placeholder="Your Name" placeholderTextColor={Colors.textLight}
            editable={!devLoading}
          />

          <TouchableOpacity
            style={[styles.button, devLoading && styles.disabled]}
            onPress={handleDevSignIn} disabled={devLoading}
          >
            {devLoading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.buttonText}>Sign In (Dev)</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.accent }]}
            onPress={async () => { await switchToAdmin(); router.replace('/' as any); }}
          >
            <Text style={styles.buttonText}>Admin Access</Text>
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.success, marginTop: 12 }]}
              onPress={async () => { await switchToAdmin(); router.replace('/' as any); }}
            >
              <Text style={styles.buttonText}>Switch to Admin View</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.headerDark },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textLight, marginBottom: 40 },
  form: { width: '100%', maxWidth: 400 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.white, marginBottom: 8, marginTop: 16 },
  helperText: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, color: Colors.white, fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24,
  },
  googleButton: {
    backgroundColor: Platform.OS === 'web' ? '#0f62fe' : '#1f6feb',
    marginTop: 0,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textLight, marginHorizontal: 16 },
});
