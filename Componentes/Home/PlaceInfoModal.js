import React from 'react'
import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import { AntDesign, MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import Share from '../../App/Servicios/Share'

const key = process.env.EXPO_PUBLIC_API_KEY

const PlaceItem = ({ place, onPress }) => {
  const getImageSource = () => {
    if (place?.photos && place.photos[0]?.photo_reference) {
      return {
        uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${key}`,
      };
    }
    return require('../../assets/placeholder.jpg');
  };

  return (
    <TouchableOpacity onPress={() => onPress(place)} style={styles.itemContainer}>
      <Image
        source={getImageSource()}
        style={styles.itemImage}
        defaultSource={require('../../assets/placeholder.jpg')}
      />
      <View style={styles.itemInfoContainer}>
        <Text numberOfLines={2} style={styles.itemName}>{place.name}</Text>
        <Text numberOfLines={2} style={styles.itemVicinity}>{place.vicinity}</Text>
        <View style={styles.itemRatingContainer}>
          <AntDesign name="star" size={20} color="#FFD700" />
          <Text style={styles.itemRating}>{place.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PlaceInfoModal({ placeList, visible, onClose, onDirectionClick, onPlaceSelect }) {
  console.log("Valor de placeList en PlaceInfoModal:", placeList);

  if (!placeList || placeList.length === 0) {
    return null;
  }

  const renderPlaceDetails = (place) => {
    if (!place) return null;

    const getImageSource = () => {
      if (place?.photos && place.photos[0]?.photo_reference) {
        return {
          uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${key}`,
        }
      }
      return require('../../assets/placeholder.jpg')
    }

    return (
      <ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <AntDesign name="close" size={24} color="black" />
        </TouchableOpacity>
        <Text numberOfLines={2} style={styles.name}>{place.name || 'Nombre no disponible'}</Text>
        {place.rating && (
          <View style={styles.ratingContainer}>
            <AntDesign name="star" size={20} color="#FFD700" />
            <Text style={styles.rating}>{place.rating}</Text>
          </View>
        )}
        <Image
          source={getImageSource()}
          style={styles.image}
          defaultSource={require('../../assets/placeholder.jpg')}
        />
        <Text style={styles.vicinity}>{place.vicinity || place.formatted_address || 'Dirección no disponible'}</Text>
        {place?.opening_hours && (
          <Text style={styles.openNow}>
            {place.opening_hours.open_now ? "Abierto" : "Cerrado"}
          </Text>
        )}
        {place?.price_level && (
          <Text style={styles.priceLevel}>
            Nivel de precio: {'$'.repeat(place.price_level)}
          </Text>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => onDirectionClick(place)}>
            <MaterialCommunityIcons name="directions" size={24} color="white" />
            <Text style={styles.buttonText}>Dirección</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => Share.SharePlace(place)}>
            <Feather name="share" size={24} color="white" />
            <Text style={styles.buttonText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
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
          {placeList.length > 1 ? (
            <FlatList
              data={placeList}
              renderItem={({ item }) => (
                <PlaceItem
                  place={item}
                  onPress={(selectedPlace) => {
                    onPlaceSelect(selectedPlace);
                    onClose();
                  }}
                />
              )}
              keyExtractor={(item) => (item.place_id || item.id || Math.random().toString()).toString()}
              ListHeaderComponent={
                <Text style={styles.listHeader}>
                  Se encontró {placeList.length} Lugares
                </Text>
              }
            />
          ) : (
            renderPlaceDetails(placeList[0])
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  name: {
    fontSize: 24,
    fontFamily: 'roboto_bold',
    marginBottom: 10,
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
  image: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 10,
  },
  vicinity: {
    fontSize: 16,
    marginBottom: 10,
  },
  openNow: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceLevel: {
    fontSize: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5c288c',
    padding: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
  },
  listHeader: {
    fontSize: 20,
    fontFamily: 'roboto_regular',
    marginTop: 10,
    marginBottom: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5c288c',
    borderRadius: 15,
    marginVertical: 10,
    padding: 10,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 15,
  },
  itemInfoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    fontSize: 18,
    fontFamily: 'roboto_bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  itemVicinity: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  itemRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRating: {
    marginLeft: 5,
    color: '#FFFFFF',
  },
})