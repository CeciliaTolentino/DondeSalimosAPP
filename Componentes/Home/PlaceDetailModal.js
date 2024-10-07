import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, ScrollView, Share, Linking,Alert } from 'react-native';
import { AntDesign, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import GlobalApi from './../../App/Servicios/GlobalApi';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkUserAuthentication, showAuthenticationAlert } from './../utils/auth';


const PlaceDetailModal = ({ place, visible, onClose }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [placeDetails, setPlaceDetails] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (place && place.place_id) {
      GlobalApi.getDetallesLugar(place.place_id)
        .then(resp => {
          setPlaceDetails(resp.data.result);
        })
        .catch(error => {
          console.error("Error fetching place details:", error);
        });
      checkIfFavorite();
    }
  }, [place]);

  if (!place) return null;

  const getImageSource = () => {
    if (place?.photos && place.photos[0]?.photo_reference) {
      return {
        uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${process.env.EXPO_PUBLIC_API_KEY}`,
      };
    }
    return require('../../assets/placeholder.jpg');
  };

  const sharePlace = async () => {
    try {
      await Share.share({
        message: `Echa un vistazo a ${place.name} en ${place.vicinity}. ¡Es genial!`,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const getOpeningHours = () => {
    if (place.opening_hours && place.opening_hours.weekday_text) {
      return place.opening_hours.weekday_text.map((day, index) => (
        <Text key={index} style={styles.openingHours}>{day}</Text>
      ));
    }
    return <Text style={styles.openingHours}>Horario no disponible</Text>;
  };

  const checkIfFavorite = async () => {
    try {
      const isAuthenticated = await checkUserAuthentication();
      if (!isAuthenticated) {
        setIsFavorite(false);
        return;
      }
      const favorites = await AsyncStorage.getItem('favorites');
      if (favorites !== null) {
        const favoritesArray = JSON.parse(favorites);
        setIsFavorite(favoritesArray.some(fav => fav.place_id === place.place_id));
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      console.error("Error checking favorites:", error);
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    const isAuthenticated = await checkUserAuthentication();
    if (!isAuthenticated) {
      showAuthenticationAlert(navigation);
      return;
    }
    try {
      let favorites = await AsyncStorage.getItem('favorites');
      let favoritesArray = favorites ? JSON.parse(favorites) : [];

      if (isFavorite) {
        favoritesArray = favoritesArray.filter(fav => fav.place_id !== place.place_id);
      } else {
        favoritesArray.push(place);
      }

      await AsyncStorage.setItem('favorites', JSON.stringify(favoritesArray));
      setIsFavorite(!isFavorite);

      Alert.alert(
        isFavorite ? "Eliminado de favoritos" : "Añadido a favoritos",
        isFavorite ? `${place.name} ha sido eliminado de tus favoritos.` : `${place.name} ha sido añadido a tus favoritos.`
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "No se pudo actualizar los favoritos. Por favor, intente de nuevo.");
    }
  };

  console.log("La información que trae place es: " + JSON.stringify(place));
  console.log("Lo que trae place details es: " + JSON.stringify(placeDetails));
  const isBar = place.types && Array.isArray(place.types) && place.types.includes('bar');
  const canReserve = isBar;
  console.log("canReserve:", canReserve);

  const handleReserve = async () => {
    const isAuthenticated = await checkUserAuthentication();
    if (!isAuthenticated) {
      showAuthenticationAlert(navigation);
      return;
    }
    onClose(); // Cerrar el modal de detalles
    const simplifiedPlace = {
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry?.location,
    };
    navigation.navigate('Reserva', { place: simplifiedPlace, userId: 'user123' });
  };

  if (!place) {
    return <View style={styles.centeredView}><Text>Cargando...</Text></View>;
  }
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <AntDesign name="closecircle" size={30} color="white" />
            </TouchableOpacity>
            <Image
              source={getImageSource()}
              style={styles.image}
              defaultSource={require('../../assets/placeholder.jpg')}
            />
            <View style={styles.contentContainer}>
              <View style={styles.headerContainer}>
                <Text style={styles.name}>{place.name}</Text>
                <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
                  <AntDesign 
                    name={isFavorite ? "heart" : "hearto"} 
                    size={24} 
                    color={isFavorite ? "red" : "black"} 
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.ratingContainer}>
                <AntDesign name="star" size={20} color="#FFD700" />
                <Text style={styles.rating}>{place.rating}</Text>
              </View>
              <Text style={styles.address}>{place.vicinity}</Text>
              {place.opening_hours && (
                <Text style={styles.openNow}>
                  {place.opening_hours.open_now ? "Abierto ahora" : "Cerrado"}
                </Text>
              )}
              {placeDetails && (
                <View>
                  {placeDetails.website && (
                    <Text>Sitio web: {placeDetails.website}</Text>
                  )}
                  {placeDetails.formatted_phone_number && (
                    <Text>Teléfono: {placeDetails.formatted_phone_number}</Text>
                  )}
                </View>
              )}
              <View style={styles.openingHoursContainer}>
                <Text style={styles.openingHoursTitle}>Horario:</Text>
                {getOpeningHours()}
              </View>
              {place.reviews && place.reviews.length > 0 && (
                <View style={styles.reviewsContainer}>
                  <Text style={styles.reviewsTitle}>Reseñas:</Text>
                  {place.reviews.map((review, index) => (
                    <View key={index} style={styles.reviewItem}>
                      <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                      <Text style={styles.reviewText}>{review.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={sharePlace}>
              <FontAwesome name="share" size={24} color="white" />
              <Text style={styles.buttonText}>Compartir</Text>
            </TouchableOpacity>
            {canReserve && (
              <TouchableOpacity style={styles.button} onPress={handleReserve}>
                <MaterialIcons name="book-online" size={24} color="white" />
                <Text style={styles.buttonText}>Reservar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  favoriteButton: {
    padding: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rating: {
    marginLeft: 5,
    fontSize: 16,
  },
  address: {
    fontSize: 16,
    marginBottom: 10,
  },
  openNow: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  openingHoursContainer: {
    marginBottom: 15,
  },
  openingHoursTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  openingHours: {
    fontSize: 14,
    marginBottom: 2,
  },
  reviewsContainer: {
    marginBottom: 15,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reviewItem: {
    marginBottom: 10,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5c288c',
    padding: 10,
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default PlaceDetailModal;