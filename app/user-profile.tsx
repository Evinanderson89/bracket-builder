import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
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
    backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: Colors.warning,
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  noticeText: { color: Colors.warning, fontSize: 12, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.white, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, color: Colors.white, fontSize: 16,
  },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
