import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../styles/colors';
import NavigationHeader from '../components/NavigationHeader';

export default function UserProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { users, addUser, updateUser } = useApp();
  
  const [name, setName] = useState('');
  const [average, setAverage] = useState('');
  const [handicap, setHandicap] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);

  useEffect(() => {
    // Check if user already has a profile
    if (user?.email) {
      const profile = users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
      if (profile) {
        setExistingProfile(profile);
        setName(profile.name);
        setAverage(profile.average?.toString() || '');
        setHandicap(profile.handicap?.toString() || '');
        setIsEditing(true);
      } else {
        // Pre-fill with Google name
        setName(user.name || '');
      }
    }
  }, [user, users]);

  const handleSave = async () => {
    if (!name.trim() || !average || !handicap) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (isEditing && existingProfile) {
        await updateUser(existingProfile.id, {
          name: name.trim(),
          average: parseInt(average, 10),
          handicap: parseInt(handicap, 10),
          email: user.email,
        });
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        await addUser({
          name: name.trim(),
          average: parseInt(average, 10),
          handicap: parseInt(handicap, 10),
          email: user.email,
          numBrackets: 1,
        });
        Alert.alert('Success', 'Profile created successfully');
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={isEditing ? "Edit Profile" : "Create Profile"} />
      
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Average</Text>
          <TextInput
            style={styles.input}
            value={average}
            onChangeText={setAverage}
            placeholder="Enter your average"
            keyboardType="numeric"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Handicap</Text>
          <TextInput
            style={styles.input}
            value={handicap}
            onChangeText={setHandicap}
            placeholder="Enter your handicap"
            keyboardType="numeric"
            placeholderTextColor={Colors.textLight}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Profile' : 'Create Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
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
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

