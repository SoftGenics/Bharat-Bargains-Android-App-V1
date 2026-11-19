// src/screens/Wishlist.js
import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { GlobleInfo } from '../context/GlobleInfoContext';
import { SERVER_API_URL } from '../server/server';
import { finalPriceOf } from '../components/ProductTile';

// Same colors as AccountScreen
const GOLD = '#F5B800';
const GOLD_DARK = '#C99700';
const BG = '#f1f3f6';
const TEXT = '#212121';
const GREY = '#878787';
const GREEN = '#388e3c';

const Wishlist = ({ navigation }) => {
  const { updateCounts } = useContext(GlobleInfo);
  const [items, setItems] = useState([]);

  // Read the wishlist from phone storage every time this screen opens
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const saved = await AsyncStorage.getItem('wishlist');
          setItems(saved ? JSON.parse(saved) : []);
        } catch (error) {
          console.log('Wishlist read error:', error.message);
          setItems([]);
        }
      })();
    }, [])
  );

  // Remove one product from the wishlist
  const removeItem = async (productId) => {
    const updated = items.filter((i) => i.product_id !== productId);
    setItems(updated);
    try {
      await AsyncStorage.setItem('wishlist', JSON.stringify(updated));
      updateCounts && updateCounts(); // update the wishlist number
    } catch (error) {
      console.log('Wishlist save error:', error.message);
    }
  };

  // Open the product page
  const openProduct = (item) => {
    navigation.navigate('ProductDetail', {
      id: item.product_id,
      mainCategory: item.main_category,
    });
  };

  // One product card
  const renderItem = ({ item }) => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discount_percent) || 0;

    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => openProduct(item)} style={styles.cardTop}>
          <Image
            source={{ uri: `${SERVER_API_URL}/${item.thumbnail_url}` }}
            style={styles.image}
            resizeMode="contain"
          />

          <View style={styles.details}>
            <Text style={styles.name} numberOfLines={2}>
              {item.product_name}
            </Text>
            {!!item.material_type && (
              <Text style={styles.sub} numberOfLines={1}>
                {item.material_type}
              </Text>
            )}

            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{finalPriceOf(item).toFixed(0)}</Text>
              {discount > 0 && (
                <>
                  <Text style={styles.mrp}>₹{price}</Text>
                  <Text style={styles.off}>{discount}% off</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Remove button */}
        <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.product_id)}>
          <Ionicons name="trash-outline" size={18} color={TEXT} />
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Shown when there is nothing in the wishlist
  const renderEmpty = () => (
    <View style={styles.emptyBox}>
      <Ionicons name="heart-outline" size={80} color="#c2c2c2" />
      <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
      <Text style={styles.emptySub}>Tap the heart on any product to save it here</Text>

      <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={() => navigation.goBack()}>
        <Text style={styles.emptyBtnText}>Shop now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar backgroundColor={GOLD} barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>My Wishlist</Text>
        {items.length > 0 && <Text style={styles.topCount}>({items.length})</Text>}
      </View>

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item, index) => `${item.product_id}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default Wishlist;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GOLD },
  list: { flex: 1, backgroundColor: BG },

  // top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topTitle: { marginLeft: 16, fontSize: 18, fontWeight: '700', color: TEXT },
  topCount: { marginLeft: 6, fontSize: 14, color: '#3d3d3d' },

  // product card
  card: { backgroundColor: '#fff', marginTop: 8 },
  cardTop: { flexDirection: 'row', padding: 12 },
  image: { width: 100, height: 100 },
  details: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '700', color: TEXT },
  sub: { fontSize: 12, color: GREY, marginTop: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  price: { fontSize: 17, fontWeight: '700', color: TEXT },
  mrp: { fontSize: 12, color: GREY, textDecorationLine: 'line-through', marginLeft: 8 },
  off: { fontSize: 12, fontWeight: '700', color: GREEN, marginLeft: 8 },

  // remove button
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderTopWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  removeText: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: TEXT },

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
  emptyBtn: {
    marginTop: 20,
    backgroundColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 4,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: TEXT },
});