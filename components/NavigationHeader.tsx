import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

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

interface HeaderButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function HeaderButton({ icon, label, onPress }: HeaderButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} hitSlop={8} activeOpacity={0.84}>
      <Ionicons name={icon} size={14} color={Colors.primary} />
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function NavigationHeader({ title, showBack = true, showHome = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useAuth();

  const handleBack = () => {
    if (pathname === '/' || pathname === '/index' || pathname === '') return;
    if (pathname === '/game-entry') {
      router.push((mode === 'user' ? '/user-dashboard' : '/') as any);
      return;
    }
    router.push((BACK_ROUTES[pathname] ?? '/') as any);
  };

  return (
    <View style={styles.header}>
      {showBack
        ? <HeaderButton icon="arrow-back" label="Back" onPress={handleBack} />
        : <View style={styles.spacer} />}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {showHome
        ? <HeaderButton icon="home" label="Home" onPress={() => router.push('/' as any)} />
        : <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.headerDark,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 7,
  },
  btn: {
    minWidth: 88,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 5,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    letterSpacing: 0.35,
  },
  spacer: { minWidth: 88 },
});
