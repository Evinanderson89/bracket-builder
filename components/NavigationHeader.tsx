import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '../styles/colors';

const BACK_ROUTES: Record<string, string> = {
  '/login': '/',
  '/user-dashboard': '/login',
  '/user-profile': '/user-dashboard',
  '/user-brackets': '/user-dashboard',
  '/user-stats': '/user-dashboard',
  '/user-entry': '/user-dashboard',
  '/cohorts': '/',
  '/cohort-detail': '/cohorts',
  '/bracket-edit': '/cohorts',
  '/game-entry': '/',
  '/admin': '/',
  '/payout': '/',
  '/players': '/',
};

interface Props {
  title: string;
  showBack?: boolean;
  showHome?: boolean;
}

export default function NavigationHeader({ title, showBack = true, showHome = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    if (pathname === '/' || pathname === '/index' || pathname === '') return;
    router.push((BACK_ROUTES[pathname] ?? '/') as any);
  };

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={styles.btn} hitSlop={8}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {showHome ? (
        <TouchableOpacity onPress={() => router.push('/' as any)} style={styles.btn} hitSlop={8}>
          <Text style={styles.btnText}>Home</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.headerDark,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  btn: { paddingHorizontal: 4, minWidth: 50 },
  btnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.white, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  spacer: { minWidth: 50 },
});
