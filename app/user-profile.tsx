import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import { Fonts } from '../styles/fonts';
import { getProgressionTier, TierStyles } from '../styles/progression';
import NavigationHeader from '../components/NavigationHeader';

export default function UserProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { users, updateUser } = useApp();

  const [name, setName] = useState('');
  const [average, setAverage] = useState('');
  const [handicap, setHandicap] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const profile = useMemo(() => {
    if (!user) return null;
    return users.find(u =>
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
      u.name.toLowerCase() === user.name.toLowerCase()
    );
  }, [user, users]);

  const tier = useMemo(() => {
    if (!profile) return TierStyles.matte;
    return TierStyles[getProgressionTier(profile.average)];
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Find by email or name
    const profile = users.find(u =>
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
      u.name.toLowerCase() === user.name.toLowerCase()
    );
    if (profile) {
      setProfileId(profile.id);
      setName(profile.name);
      setAverage(profile.average?.toString() || '');
      setHandicap(profile.handicap?.toString() || '');
      setIsEditing(true);
    } else {
      setName(user.name || '');
    }
  }, [user, users]);

  const handleSave = async () => {
    if (!name.trim() || !average || !handicap) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (!isEditing || !profileId) {
      Alert.alert('Request Required', 'Ask admin to approve your player request before creating a profile.');
      return;
    }
    try {
      await updateUser(profileId, {
        name: name.trim(), average: parseInt(average), handicap: parseInt(handicap), email: user?.email,
      });
      Alert.alert('Success', 'Profile updated');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Save failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="My Profile" />
      <ScrollView style={styles.scroll}>
        <View style={styles.form}>
          {!isEditing && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Your player request must be approved before a profile can be edited.</Text>
            </View>
          )}
          {isEditing && profile && (
            <View style={[styles.tierCard, { borderColor: tier.borderColor, borderWidth: tier.borderWidth }]}>
              <Text style={styles.tierLabel}>PROGRESSION TIER</Text>
              <Text style={[styles.tierValue, { color: tier.scoreColor }]}>
                {getProgressionTier(profile.average).toUpperCase()}
              </Text>
              <Text style={styles.tierSub}>
                Average: {profile.average} | {profile.average >= 210 ? 'Elite status' : profile.average >= 180 ? 'Member status' : 'Working toward 180'}
              </Text>
            </View>
          )}
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="Your name" placeholderTextColor={Colors.textLight} />

          <Text style={styles.label}>Average</Text>
          <TextInput style={styles.input} value={average} onChangeText={setAverage}
            placeholder="Your average" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

          <Text style={styles.label}>Handicap</Text>
          <TextInput style={styles.input} value={handicap} onChangeText={setHandicap}
            placeholder="Your handicap" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  form: { padding: 16 },
  notice: {
    backgroundColor: Colors.badgeWarningBg, borderWidth: 1, borderColor: Colors.warning,
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  noticeText: { color: Colors.warning, fontSize: 12, lineHeight: 18, fontFamily: Fonts.bodyRegular },
  label: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.white, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, color: Colors.white, fontSize: 16,
  },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bodySemiBold },
  tierCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  tierValue: {
    fontSize: 24,
    fontFamily: Fonts.scoreBold,
    marginBottom: 4,
  },
  tierSub: {
    fontSize: 12,
    fontFamily: Fonts.bodyRegular,
    color: Colors.textSecondary,
  },
});
