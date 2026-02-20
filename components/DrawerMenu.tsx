import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/typography';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.75, 300);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  action?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleNav = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 80);
  };

  const handleSignOut = () => {
    onClose();
    setTimeout(() => signOut(), 80);
  };

  const sections: MenuSection[] = [
    {
      title: 'MY EVENTS',
      items: [
        { label: 'Home', icon: 'home-outline', route: '/' },
        { label: 'Find Tournaments', icon: 'rocket-outline', route: '/user-entry' },
        { label: 'My Brackets', icon: 'git-network-outline', route: '/user-brackets' },
        { label: 'My Stats', icon: 'stats-chart-outline', route: '/user-stats' },
      ],
    },
    {
      title: 'ORGANIZE EVENTS',
      items: [
        { label: 'Tournaments', icon: 'trophy-outline', route: '/cohorts' },
        { label: 'Manage Players', icon: 'people-outline', route: '/players' },
        { label: 'Enter Scores', icon: 'clipboard-outline', route: '/game-entry' },
        { label: 'Payouts', icon: 'cash-outline', route: '/payout' },
        { label: 'Admin Settings', icon: 'settings-outline', route: '/admin' },
      ],
    },
    {
      title: 'PROFILE',
      items: [
        {
          label: 'My Profile',
          icon: 'person-circle-outline',
          route: user ? '/user-profile' : '/login',
        },
        user
          ? { label: 'Sign Out', icon: 'log-out-outline', action: handleSignOut }
          : { label: 'Sign In', icon: 'log-in-outline', route: '/login' },
      ],
    },
  ];

  const isActive = (route?: string) => {
    if (!route) return false;
    if (route === '/') return pathname === '/' || pathname === '/index' || pathname === '';
    return pathname === route;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayTouch} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Bracket Builder</Text>
        </View>

        {user && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={16} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item) => {
                const active = isActive(item.route);
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.menuItem, active && styles.menuItemActive]}
                    onPress={() => {
                      if (item.action) item.action();
                      else if (item.route) handleNav(item.route);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={active ? Colors.primary : Colors.textSecondary}
                      style={styles.menuIcon}
                    />
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 34,
    backgroundColor: `${Colors.primary}22`,
    borderWidth: 1,
    borderColor: `${Colors.primary}55`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userName: {
    color: Colors.textPrimary,
    fontFamily: Fonts.sansBold,
    fontSize: 14,
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  menuScroll: {
    flex: 1,
  },
  section: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: `${Colors.primary}18`,
  },
  menuIcon: {
    marginRight: 14,
    width: 20,
    textAlign: 'center',
  },
  menuLabel: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  menuLabelActive: {
    fontFamily: Fonts.sansBold,
    color: Colors.primary,
  },
});
