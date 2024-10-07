import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { AntDesign } from '@expo/vector-icons';
import PlaceDetailModal from './../../Componentes/Home/PlaceDetailModal';
import { checkUserAuthentication, showAuthenticationAlert } from './../../Componentes/utils/auth';
export default function Fav() {
  
  const [favorites, setFavorites] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  const loadFavorites = useCallback(async () => {
    try {
      const isAuthenticated = await checkUserAuthentication();
      if (!isAuthenticated) {
        showAuthenticationAlert(navigation);
        //navigation.goBack();
        return;
      }

      const favoritesData = await AsyncStorage.getItem('favorites');
      if (favoritesData !== null) {
        setFavorites(JSON.parse(favoritesData));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const deleteFavorite = async (placeId) => {
    try {
      const isAuthenticated = await checkUserAuthentication();
      if (!isAuthenticated) {
        showAuthenticationAlert();
        return;
      }
      
      const updatedFavorites = favorites.filter(fav => fav.place_id !== placeId);
      await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
    } catch (error) {
      console.error("Error deleting favorite:", error);
      Alert.alert("Error", "No se pudo eliminar el favorito. Por favor, intente de nuevo.");
    }
  };

  const renderRightActions = (placeId) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteFavorite(placeId)}
      >
        <Text style={styles.deleteButtonText}>Borrar</Text>
      </TouchableOpacity>
    );
  };

  const handlePlacePress = (place) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  const renderFavoriteItem = (item) => (
    <Swipeable
      key={item.place_id}
      renderRightActions={() => renderRightActions(item.place_id)}
      overshootRight={false}
    >
      <TouchableOpacity 
        style={styles.favoriteItem}
        onPress={() => handlePlacePress(item)}
      >
        <Image
          source={{ uri: item.photos && item.photos[0] ? 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${item.photos[0].photo_reference}&key=${process.env.EXPO_PUBLIC_API_KEY}` : 
            'https://via.placeholder.com/150' 
          }}
          style={styles.placeImage}
        />
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{item.name}</Text>
          <Text style={styles.placeAddress}>{item.vicinity}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Mis Favoritos</Text>
        {favorites.length > 0 ? (
          favorites.map((item) => renderFavoriteItem(item))
        ) : (
          <Text style={styles.emptyMessage}>No tienes lugares favoritos aún.</Text>
        )}
        <PlaceDetailModal
          place={selectedPlace}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedPlace(null);
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#5c288c',
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeImage: {
    width: 100,
    height: 100,
  },
  placeInfo: {
    flex: 1,
    padding: 15,
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});