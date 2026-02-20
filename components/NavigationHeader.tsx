import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/typography';

const BACK_ROUTES: Record<string, string> = {
  '/login': '/',
  '/user-profile': '/',
  '/user-brackets': '/',
  '/user-stats': '/',
  '/user-entry': '/',
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
  showHamburger?: boolean;
  onHamburgerPress?: () => void;
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

export default function NavigationHeader({
  title,
  showBack = true,
  showHome = true,
  showHamburger = false,
  onHamburgerPress,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    if (pathname === '/' || pathname === '/index' || pathname === '') return;
    router.push((BACK_ROUTES[pathname] ?? '/') as any);
  };

  const renderLeft = () => {
    if (showHamburger && onHamburgerPress) {
      return (
        <TouchableOpacity onPress={onHamburgerPress} style={styles.hamburger} hitSlop={8} activeOpacity={0.84}>
          <Ionicons name="menu" size={22} color={Colors.primary} />
        </TouchableOpacity>
      );
    }
    if (showBack) {
      return <HeaderButton icon="arrow-back" label="Back" onPress={handleBack} />;
    }
    return <View style={styles.spacer} />;
  };

  return (
    <View style={styles.header}>
      {renderLeft()}

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
  hamburger: {
    minWidth: 88,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  btnText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    letterSpacing: 0.3,
    marginLeft: 5,
  },
  title: {
    fontSize: 17,
    fontFamily: Fonts.serifBold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  spacer: { minWidth: 88 },
});
