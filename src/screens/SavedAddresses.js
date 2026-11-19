// src/screens/SavedAddresses.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
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

const EMPTY_ADDRESS = {
  contact_name: '',
  pincode: '',
  phone_number: '',
  address: '',
  city: '',
  state: '',
  landmark: '',
  house_flat_office_no: '',
  address_type: 'home',
};

/* ------------------------------------------------------------------ */
/* Small input box (label + text box)                                  */
/* ------------------------------------------------------------------ */
const Field = ({ label, value, onChangeText, keyboardType, editable = true, maxLength }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, !editable && styles.fieldDisabled]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      editable={editable}
      maxLength={maxLength}
      placeholderTextColor="#b0b0b0"
    />
  </View>
);

// All important fields must be filled
const isFormOk = (a) => {
  if (!a.contact_name?.trim()) return 'Please enter the name';
  if (String(a.pincode ?? '').length !== 6) return 'Please enter a 6-digit pincode';
  if (!a.house_flat_office_no?.trim()) return 'Please enter flat or house number';
  if (!a.address?.trim()) return 'Please enter the address';
  if (!a.city?.trim()) return 'Please enter the city';
  if (!a.state?.trim()) return 'Please enter the state';
  return null;
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
const SavedAddresses = ({ navigation }) => {
  const { userData, isLoggedIn, loading: userLoading, logout } = useContext(GlobleInfo);

  const [addressList, setAddressList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // The address inside the popup. null = popup is closed.
  // If it has "addresses_id" we are editing, if not we are adding a new one.
  const [form, setForm] = useState(null);
  const isEdit = !!form?.addresses_id;

  const mobile = userData?.mobile_num || '';

  // If the user is not logged in, open the login page
  useEffect(() => {
    if (!userLoading && !isLoggedIn) {
      navigation.replace('LoginPage');
    }
  }, [userLoading, isLoggedIn]);

  // Change one field of the popup form
  const setField = (key, value) => setForm({ ...form, [key]: value });

  // Header with the login token
  const authConfig = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // If token is expired (401) logout and open the login page
  const onApiError = async (error, message) => {
    console.log('Address API error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      await logout();
      Alert.alert('Session expired', 'Please login again.');
      navigation.replace('LoginPage');
    } else {
      Alert.alert('Error', error.response?.data?.message || message);
    }
  };

  /* ---------- get all saved addresses ---------- */
  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${SERVER_API_URL}/getalladdressinfo`, await authConfig());
      setAddressList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      await onApiError(error, 'Could not load your addresses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Pull down to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };

  /* ---------- save (add or edit) ---------- */
  const saveAddress = async () => {
    const problem = isFormOk(form);
    if (problem) {
      Alert.alert('Check the form', problem);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        // Edit an old address
        await axios.put(
          `${SERVER_API_URL}/editaddress/${form.addresses_id}`,
          form,
          await authConfig()
        );
      } else {
        // Add a new address
        const res = await axios.post(
          `${SERVER_API_URL}/addaddress`,
          { ...form, mobile_num: mobile },
          await authConfig()
        );
        if (res.status !== 201) {
          Alert.alert('Error', 'Could not save the address.');
          return;
        }
      }

      setForm(null); // close the popup
      fetchAddresses(); // load the list again
    } catch (error) {
      await onApiError(error, 'You can only have up to 10 addresses. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- delete ---------- */
  const deleteAddress = (id) => {
    Alert.alert('Delete address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${SERVER_API_URL}/removeaddress/${id}`, await authConfig());
            fetchAddresses();
          } catch (error) {
            await onApiError(error, 'Could not delete the address.');
          }
        },
      },
    ]);
  };

  /* ---------- one address card ---------- */
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{item.contact_name}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.address_type}</Text>
        </View>
      </View>

      <Text style={styles.phone}>{item.mobile_num}</Text>
      <Text style={styles.addressText}>
        {item.house_flat_office_no}, {item.address}, {item.city}, {item.state} -{' '}
        <Text style={{ fontWeight: '700' }}>{item.pincode}</Text>
      </Text>
      {!!item.landmark && <Text style={styles.landmark}>Landmark: {item.landmark}</Text>}

      {/* Edit and Delete buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setForm(item)}>
          <Ionicons name="create-outline" size={18} color={TEXT} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteAddress(item.addresses_id)}>
          <Ionicons name="trash-outline" size={18} color="#d32f2f" />
          <Text style={[styles.actionText, { color: '#d32f2f' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Shown when there is no saved address
  const renderEmpty = () =>
    loading ? null : (
      <View style={styles.emptyBox}>
        <Ionicons name="location-outline" size={80} color="#c2c2c2" />
        <Text style={styles.emptyTitle}>No saved addresses</Text>
        <Text style={styles.emptySub}>Add an address to get your orders delivered</Text>
      </View>
    );

  /* ---------- screen ---------- */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar backgroundColor={GOLD} barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Saved Addresses</Text>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={addressList}
          keyExtractor={(item) => String(item.addresses_id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.addRow}
              activeOpacity={0.8}
              onPress={() => setForm({ ...EMPTY_ADDRESS })}
            >
              <Ionicons name="add" size={22} color={GOLD_DARK} />
              <Text style={styles.addText}>Add a new address</Text>
            </TouchableOpacity>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        />
      )}

      {/* Add / Edit popup */}
      <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{isEdit ? 'EDIT ADDRESS' : 'ADD A NEW ADDRESS'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 16 }}>
              {form && (
                <View>
                  <Field label="Name" value={form.contact_name} onChangeText={(t) => setField('contact_name', t)} />
                  <Field
                    label="Mobile Number"
                    value={String(isEdit ? form.mobile_num || '' : mobile)}
                    editable={false}
                  />
                  <Field
                    label="Pincode"
                    value={String(form.pincode ?? '')}
                    onChangeText={(t) => setField('pincode', t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Field
                    label="Alternate Phone (Optional)"
                    value={String(form.phone_number ?? '')}
                    onChangeText={(t) => setField('phone_number', t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <Field
                    label="Flat, House No., Building"
                    value={form.house_flat_office_no}
                    onChangeText={(t) => setField('house_flat_office_no', t)}
                  />
                  <Field
                    label="Address (Area and Street)"
                    value={form.address}
                    onChangeText={(t) => setField('address', t)}
                  />
                  <Field label="City / District / Town" value={form.city} onChangeText={(t) => setField('city', t)} />
                  <Field label="State" value={form.state} onChangeText={(t) => setField('state', t)} />
                  <Field
                    label="Landmark (Optional)"
                    value={form.landmark}
                    onChangeText={(t) => setField('landmark', t)}
                  />

                  {/* Home or Work */}
                  <View style={styles.typeRow}>
                    {['home', 'work'].map((type) => {
                      const on = form.address_type === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.typeChip, on && styles.typeChipOn]}
                          onPress={() => setField('address_type', type)}
                        >
                          <Text style={[styles.typeChipText, on && { color: TEXT, fontWeight: '700' }]}>
                            {type === 'home' ? 'Home (All day)' : 'Work (10 AM - 5 PM)'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setForm(null)} disabled={saving}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetSave, saving && { opacity: 0.7 }]}
                onPress={saveAddress}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={TEXT} />
                ) : (
                  <Text style={styles.saveText}>{isEdit ? 'UPDATE' : 'SAVE'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default SavedAddresses;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GOLD },
  list: { flex: 1, backgroundColor: BG },
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

  // add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  addText: { marginLeft: 10, fontSize: 14, fontWeight: '700', color: GOLD_DARK },

  // address card
  card: { backgroundColor: '#fff', marginTop: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  name: { fontSize: 15, fontWeight: '700', color: TEXT },
  typeBadge: {
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: GREY, textTransform: 'uppercase' },
  phone: { fontSize: 13, color: TEXT, marginTop: 6, paddingHorizontal: 16 },
  addressText: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 19, paddingHorizontal: 16 },
  landmark: { fontSize: 12, color: GREY, marginTop: 4, paddingHorizontal: 16 },

  // edit / delete buttons
  actions: { flexDirection: 'row', borderTopWidth: 0.5, borderColor: '#e0e0e0', marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  actionText: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: TEXT },
  divider: { width: 0.5, backgroundColor: '#e0e0e0' },

  // empty state
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginTop: 12 },
  emptySub: { fontSize: 13, color: GREY, marginTop: 6, textAlign: 'center' },

  // popup
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '90%',
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GREY,
    padding: 16,
    borderBottomWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: GREY, marginBottom: 4 },
  fieldInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 14,
    color: TEXT,
  },
  fieldDisabled: { backgroundColor: '#f3f3f3', color: GREY },
  typeRow: { flexDirection: 'row', marginTop: 4 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  typeChipOn: { backgroundColor: '#FFF8E1', borderColor: GOLD_DARK },
  typeChipText: { fontSize: 12, color: GREY },

  sheetActions: { flexDirection: 'row', padding: 12, borderTopWidth: 0.5, borderColor: '#e0e0e0' },
  sheetCancel: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: GOLD_DARK,
    borderRadius: 4,
    marginRight: 8,
  },
  sheetSave: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderRadius: 4,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: GOLD_DARK },
  saveText: { fontSize: 15, fontWeight: '800', color: TEXT, letterSpacing: 0.5 },
});