// src/screens/EditProfile.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

import { getToken } from '../utils/storage';
import { GlobleInfo } from '../context/GlobleInfoContext';
import { SERVER_API_URL } from '../server/server';

// Same colors as AccountScreen
const GOLD = '#F5B800';
const GOLD_DARK = '#C99700';
const BG = '#f1f3f6';
const TEXT = '#212121';
const GREY = '#878787';

// Note the "/" before "api". Without it the URL becomes wrong.
const UPDATE_USER_URL = `${SERVER_API_URL}/api/update/profile`;

const GENDERS = ['Male', 'Female', 'Other'];

const EditProfile = ({ navigation }) => {
  const { userData, isLoggedIn, loading: userLoading, fetchUser, logout } = useContext(GlobleInfo);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);

  // Show the old user data in the form.
  // "userData" comes from the logedinUser API: { success, message, user }
  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setEmail(userData.email || '');
      setGender(userData.gender || '');
      // dob can come like "1998-05-21T00:00:00.000Z", so we keep only the first 10 letters
      setDob(userData.dob ? String(userData.dob).slice(0, 10) : '');
    }
  }, [userData]);

  // If the user is not logged in, open the login page
  useEffect(() => {
    if (!userLoading && !isLoggedIn) {
      navigation.replace('LoginPage');
    }
  }, [userLoading, isLoggedIn]);

  const save = async () => {
    // Simple checks
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (dob.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      Alert.alert('Invalid date', 'Please enter the date like 1998-05-21 (YYYY-MM-DD).');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();

      // This is the data we send to the server
      const payload = {
        name: name.trim(),
        email: email.trim(),
        gender: gender,
        dob: dob.trim(),
      };

      const res = await axios.patch(UPDATE_USER_URL, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        await fetchUser(); // load the new user data
        Alert.alert('Done', res.data?.message || 'Your profile is updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Could not update your profile.');
      }
    } catch (error) {
      console.log('Update profile error:', error.response?.data || error.message);

      // 401 means the token is expired
      if (error.response?.status === 401) {
        await logout();
        Alert.alert('Session expired', 'Please login again.');
        navigation.replace('LoginPage');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Could not update your profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Wait until the user data is loaded
  if (userLoading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar backgroundColor={GOLD} barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* Avatar */}
          <View style={styles.avatarBox}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PERSONAL INFORMATION</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#b0b0b0"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#b0b0b0"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={String(userData?.mobile_num || '')}
              editable={false}
            />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                // "male", "Male" and "MALE" are all treated the same
                const on = gender.toLowerCase() === g.toLowerCase();
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setGender(g)}
                  >
                    <Ionicons
                      name={on ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={on ? GOLD_DARK : '#bdbdbd'}
                    />
                    <Text style={[styles.chipText, on && { color: TEXT, fontWeight: '700' }]}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={(t) => setDob(t.replace(/[^0-9-]/g, ''))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#b0b0b0"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={save}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={TEXT} /> : <Text style={styles.saveText}>SAVE</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GOLD },
  body: { flex: 1, backgroundColor: BG },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  // top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topTitle: { marginLeft: 16, fontSize: 18, fontWeight: '700', color: TEXT },

  // avatar
  avatarBox: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 24 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // form card
  card: { backgroundColor: '#fff', marginTop: 8, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: GREY, marginBottom: 16 },
  label: { fontSize: 12, color: GREY, marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 15,
    color: TEXT,
    marginBottom: 18,
  },
  inputDisabled: { backgroundColor: '#f3f3f3', color: GREY },

  genderRow: { flexDirection: 'row', marginBottom: 18 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingVertical: 11,
    marginRight: 8,
  },
  chipOn: { backgroundColor: '#FFF8E1', borderColor: GOLD_DARK },
  chipText: { marginLeft: 6, fontSize: 13, color: GREY },

  // save button
  saveBtn: {
    height: 50,
    borderRadius: 4,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    elevation: 2,
  },
  saveText: { fontSize: 16, fontWeight: '800', color: TEXT, letterSpacing: 1 },
});