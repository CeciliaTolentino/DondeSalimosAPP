import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import PlaceDetailModal from './../../Componentes/Home/PlaceDetailModal';
import { AuthContext } from '../../AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

export default function Fav() {
  const [favorites, setFavorites] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const loadFavorites = useCallback(async () => {
    try {
      if (user && user.iD_Usuario) {
        const response = await fetch(`${API_BASE_URL}/api/favoritos/usuario/${user.iD_Usuario}`);
        if (!response.ok) {
          throw new Error('Error al cargar favoritos');
        }
        const favoritesData = await response.json();
        setFavorites(favoritesData);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      Alert.alert("Error", "No se pudieron cargar los favoritos. Por favor, intente de nuevo.");
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const deleteFavorite = async (favoriteId) => {
    try {
      if (!user) {
        Alert.alert("Acceso Restringido", "Debes iniciar sesión para eliminar favoritos.");
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/favoritos/${favoriteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar favorito');
      }

      await loadFavorites();
    } catch (error) {
      console.error("Error deleting favorite:", error);
      Alert.alert("Error", "No se pudo eliminar el favorito. Por favor, intente de nuevo.");
    }
  };

  const renderRightActions = (favoriteId) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteFavorite(favoriteId)}
      >
        <Text style={styles.deleteButtonText}>Borrar</Text>
      </TouchableOpacity>
    );
  };

  const handlePlacePress = (place) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  const renderFavoriteItem = ({ item }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.iD_Favorito)}
      overshootRight={false}
    >
      <TouchableOpacity 
        style={styles.favoriteItem}
        onPress={() => handlePlacePress(item)}
      >
        <Image
          source={{ uri: item.fotoReferencia ? 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${item.fotoReferencia}&key=${process.env.EXPO_PUBLIC_API_KEY}` : 
            'https://via.placeholder.com/150' 
          }}
          style={styles.placeImage}
        />
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{item.nombreLugar}</Text>
          <Text style={styles.placeAddress}>{item.direccion}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Mis Favoritos</Text>
        {!user ? (
          <Text style={styles.loginMessage}>Inicia sesión para ver y gestionar tus favoritos.</Text>
        ) : favorites.length > 0 ? (
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.iD_Favorito.toString()}
          />
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
  loginMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontWeight: 'bold',
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