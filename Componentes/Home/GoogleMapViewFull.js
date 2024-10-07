import React, { useContext, useEffect, useState, useRef } from 'react'
import { View, Dimensions, StyleSheet } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { UserLocationContext } from '../../App/Context/UserLocationContext'
import PlaceMarker from './PlaceMarker'
import CategoryFilter from './CategoryFilter'
import PlaceDetailModal from './PlaceDetailModal'
import BarStories from './BarStories'

export default function GoogleMapViewFull({ placeList, onSearch, selectedPlace, onPlaceSelect }) {
  const [mapRegion, setMapRegion] = useState(null)
  const [initialRegion, setInitialRegion] = useState(null)
  const { location, setLocation } = useContext(UserLocationContext)
  const mapRef = useRef(null)

  useEffect(() => {
    if (location) {
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
      setMapRegion(region)
      setInitialRegion(region)
    }
  }, [location])

  useEffect(() => {
    if (selectedPlace && mapRef.current) {
      const region = {
        latitude: selectedPlace.geometry.location.lat,
        longitude: selectedPlace.geometry.location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      mapRef.current.animateToRegion(region, 1000)
    }
  }, [selectedPlace])

  const onMarkerPress = (place) => {
    onPlaceSelect(place)
  }

  const handleModalClose = () => {
    onPlaceSelect(null)
    if (mapRef.current && initialRegion) {
      mapRef.current.animateToRegion(initialRegion, 1000)
    }
  }

  return (
    <View style={styles.container}>
      {mapRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          initialRegion={mapRegion}
          customMapStyle={mapStyle}
        >
          <Marker
            coordinate={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            }}
            title={'Estás aquí'}
          />
          {placeList.map((item, index) => (
            <PlaceMarker 
              key={index} 
              item={item} 
              onPress={() => onMarkerPress(item)}
              isSelected={selectedPlace && selectedPlace.place_id === item.place_id}
            />
          ))}
        </MapView>
      )}
      <CategoryFilter onSearch={onSearch} />
      <PlaceDetailModal 
        place={selectedPlace}
        visible={!!selectedPlace}
        onClose={handleModalClose}
      />
      <BarStories />
    </View>
  )
}



const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  },
})
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1a1a2e"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d1a3ff"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#242440"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#6b4f80"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4a336a"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#b380b3"
      }
    ]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1e1e3d"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3d285a"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#cc99cc"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2e1e4a"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#b37ab3"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4a307d"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#cc99cc"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#5c387d"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#6640a6"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#5233a6"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#cc99cc"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#5d3d80"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#5d3d80"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2e1e6a"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8c66b3"
      }
    ]
  }
];