import { useContext, useEffect, useState, useRef, useMemo, useCallback } from "react"
import { View, Dimensions, StyleSheet, ActivityIndicator } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"

import { UserLocationContext } from "../../App/Context/UserLocationContext"
import PlaceMarker from "./PlaceMarker"
import CategoryFilter from "./CategoryFilter"
import PlaceDetailModal from "../ManagmentModal/PlaceDetailModal"
import BarStories from "../Stories/BarStories"
import Apis from "../../Apis/Apis"


export default function GoogleMapViewFull({ placeList, onSearch, selectedPlace, onPlaceSelect }) {
  const [mapRegion, setMapRegion] = useState(null)
  const [initialRegion, setInitialRegion] = useState(null)
  const [temporaryPlace, setTemporaryPlace] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const { location, setLocation } = useContext(UserLocationContext)
  const mapRef = useRef(null)

  const geocodeCache = useRef(new Map())

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

  const onMarkerPress = useCallback(
    (place) => {
      onPlaceSelect(place)
    },
    [onPlaceSelect],
  )

  const handleModalClose = useCallback(() => {
    onPlaceSelect(null)
    setTemporaryPlace(null)
    if (mapRef.current && initialRegion) {
      mapRef.current.animateToRegion(initialRegion, 1000)
    }
  }, [initialRegion, onPlaceSelect])

  const handleDirectionClick = useCallback((place) => {
    // Direcciones
  }, [])

  const geocodeAddress = useCallback(
    async (address) => {
      if (geocodeCache.current.has(address)) {
        return geocodeCache.current.get(address)
      }

      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL
        const encodedAddress = encodeURIComponent(address)
        const url = `${baseUrl}/api/GooglePlaces/geocode?address=${encodedAddress}`

        const response = await fetch(url)
        const data = await response.json()

        if (data.status === "OK" && data.results.length > 0) {
          const coords = {
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng,
          }
          geocodeCache.current.set(address, coords)
          return coords
        } else {
          const defaultCoords = {
            lat: location ? location.coords.latitude : -34.6118,
            lng: location ? location.coords.longitude : -58.396,
          }
          geocodeCache.current.set(address, defaultCoords)
          return defaultCoords
        }
      } catch (error) {
        const defaultCoords = {
          lat: location ? location.coords.latitude : -34.6118,
          lng: location ? location.coords.longitude : -58.396,
        }
        geocodeCache.current.set(address, defaultCoords)
        return defaultCoords
      }
    },
    [location],
  )

  const handleStoryPress = useCallback(
    async (iD_Comercio) => {
      try {
        setTemporaryPlace(null)
        onPlaceSelect(null)

        let place = placeList.find((p) => p.isLocal && p.comercioData?.iD_Comercio === iD_Comercio)

        if (!place) {
          const response = await Apis.obtenerComercioPorId(iD_Comercio)
          const comercio = response.data

          const coordinates = await geocodeAddress(comercio.direccion)

          place = {
            place_id: `local_${comercio.iD_Comercio}`,
            name: comercio.nombre,
            vicinity: comercio.direccion,
            formatted_address: comercio.direccion,
            geometry: {
              location: {
                lat: coordinates.lat,
                lng: coordinates.lng,
              },
            },
            rating: comercio.rating || 4.0,
            types: comercio.iD_TipoComercio === 1 ? ["bar", "establishment"] : ["night_club", "establishment"],
            opening_hours: {
              open_now: true,
            },
            photos: comercio.foto
              ? [
                  {
                    photo_reference: comercio.foto,
                    isBase64: true,
                  },
                ]
              : null,
            source: "local",
            isLocal: true,
            comercioData: comercio,
            generoMusical: comercio.generoMusical,
            capacidad: comercio.capacidad,
            mesas: comercio.mesas,
            telefono: comercio.telefono,
            correo: comercio.correo,
            hora_ingreso: comercio.hora_ingreso,
            hora_cierre: comercio.hora_cierre,
          }

          setTemporaryPlace(place)
        }

        if (place && mapRef.current) {
          const region = {
            latitude: Number(place.geometry.location.lat),
            longitude: Number(place.geometry.location.lng),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }

          mapRef.current.animateToRegion(region, 1000)

          setTimeout(() => {
            onPlaceSelect(place)
          }, 1100)
        }
      } catch (error) {
        console.error("Error en handleStoryPress:", error)
        setTemporaryPlace(null)
        onPlaceSelect(null)
      }
    },
    [placeList, geocodeAddress, onPlaceSelect],
  )

  const filterPlacesByType = useCallback(
    (places, selectedTypes) => {
      if (!selectedTypes || selectedTypes.length === 0) {
        return places
      }

      const typesArray = selectedTypes.split(",").filter((t) => t.trim())
      const selectedGenres = onSearch?.selectedGenres?.split(",").filter((g) => g.trim()) || []

      return places.filter((place) => {
        if (!place.isLocal && place.types) {
          if (typesArray.includes("bar") && !typesArray.includes("night_club")) {
            return place.types.includes("bar") && !place.types.includes("night_club")
          }

          if (typesArray.includes("night_club") && !typesArray.includes("bar")) {
            const hasBarInName = place.name?.toLowerCase().includes("bar")
            const hasBarInTypes = place.types.includes("bar")
            const isNightClub = place.types.includes("night_club")

            if (place.isLocal && place.generoMusical) {
              return true
            }

            if (selectedGenres && selectedGenres.length > 0) {
              return true
            }

            if (hasBarInName || hasBarInTypes) {
              return false
            }

            return isNightClub
          }

          return place.types.some((type) => typesArray.includes(type))
        }

        return true
      })
    },
    [onSearch?.selectedGenres],
  )

  const markers = useMemo(() => {
    const selectedTypes = onSearch?.selectedTypes || ""
    const filteredPlaces = filterPlacesByType(placeList, selectedTypes)

    return filteredPlaces
      .filter(
        (item) =>
          item.geometry?.location?.lat &&
          item.geometry?.location?.lng &&
          !isNaN(Number(item.geometry.location.lat)) &&
          !isNaN(Number(item.geometry.location.lng)),
      )
      .map((item, index) => (
        <PlaceMarker
          key={item.place_id || `place_${index}`}
          item={item}
          onPress={() => onMarkerPress(item)}
          isSelected={selectedPlace && selectedPlace.place_id === item.place_id}
        />
      ))
  }, [placeList, selectedPlace, onSearch?.selectedTypes, filterPlacesByType, onMarkerPress])

  const handleNavigateToLogin = useCallback(() => {
    setTemporaryPlace(null)
    onPlaceSelect(null)
  }, [onPlaceSelect])

  return (
    <View style={styles.container}>
      {mapRegion ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            initialRegion={mapRegion}
            customMapStyle={mapStyle}
            onMapReady={() => {
              setMapReady(true)
            }}
            moveOnMarkerPress={false}
            loadingEnabled={true}
            loadingIndicatorColor="#5c288c"
            loadingBackgroundColor="#1a1a2e"
          >
            <Marker
              coordinate={{
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
              }}
              title={"Estás aquí"}
              zIndex={0}
              tracksViewChanges={false}
            />

            {markers}

            {temporaryPlace && temporaryPlace.geometry?.location?.lat && temporaryPlace.geometry?.location?.lng && (
              <PlaceMarker
                key={`temp_${temporaryPlace.place_id}`}
                item={temporaryPlace}
                onPress={() => onMarkerPress(temporaryPlace)}
                isSelected={selectedPlace && selectedPlace.place_id === temporaryPlace.place_id}
              />
            )}
          </MapView>

          {!mapReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#5c288c" />
            </View>
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5c288c" />
        </View>
      )}

      <CategoryFilter onSearch={onSearch} />

      <PlaceDetailModal
        place={selectedPlace}
        visible={!!selectedPlace}
        onClose={handleModalClose}
        onDirectionClick={handleDirectionClick}
        onNavigateToLogin={handleNavigateToLogin}
      />

      {mapReady && (
        <View style={styles.storiesContainer}>
          <BarStories onStoryPress={handleStoryPress} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    width: Dimensions.get("screen").width,
    height: Dimensions.get("screen").height,
    zIndex: 1,
  },
   loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(26, 26, 46, 0.7)",
    zIndex: 10,
  },
  storiesContainer: {
   position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0)",
    paddingTop: 5,
    paddingBottom: 5,
    zIndex: 100,

  },
})

const mapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#1a1a2e",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#d1a3ff",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#242440",
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#6b4f80",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#4a336a",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#b380b3",
      },
    ],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [
      {
        color: "#1e1e3d",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [
      {
        color: "#3d285a",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#cc99cc",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#2e1e4a",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#b37ab3",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#4a307d",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#cc99cc",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#5c387d",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#6640a6",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#5233a6",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#cc99cc",
      },
    ],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [
      {
        color: "#5d3d80",
      },
    ],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [
      {
        color: "#5d3d80",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#2e1e6a",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#8c66b3",
      },
    ],
  },
]
