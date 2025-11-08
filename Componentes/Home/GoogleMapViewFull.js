
import { useContext, useEffect, useState, useRef, useMemo, useCallback } from "react"
import { View, Dimensions, StyleSheet, ActivityIndicator } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"

import { UserLocationContext } from "../../App/Context/UserLocationContext"
import PlaceMarker from "./PlaceMarker"
import CategoryFilter from "./CategoryFilter"
import PlaceDetailModal from "./PlaceDetailModal"
import BarStories from "./BarStories"
import Apis from "../../Apis"
export default function GoogleMapViewFull({ placeList, onSearch, selectedPlace, onPlaceSelect }) {
  const [mapRegion, setMapRegion] = useState(null)
  const [initialRegion, setInitialRegion] = useState(null)
  const [temporaryPlace, setTemporaryPlace] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [showStories, setShowStories] = useState(false)
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
    if (mapReady) {
      setTimeout(() => setShowStories(true), 300)
    }
  }, [mapReady])

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

  useEffect(() => {
     console.log("🗺️ GoogleMapViewFull - placeList actualizado:", placeList.length)
   const selectedTypes = onSearch?.selectedTypes || ""
    const filteredPlaces = filterPlacesByType(placeList, selectedTypes)

    console.log("📍 Lugares después de filtrado por tipo:", {
      total: placeList.length,
      filtered: filteredPlaces.length,
      google: filteredPlaces.filter((p) => !p.isLocal).length,
      local: filteredPlaces.filter((p) => p.isLocal).length,
    })

    filteredPlaces.forEach((place, index) => {
      console.log(`📍 Lugar ${index + 1}:`, {
        name: place?.name,
        isLocal: place?.isLocal,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        hasValidCoords: !!(place.geometry?.location?.lat && place.geometry?.location?.lng),
      })
    })
  }, [placeList])

  const onMarkerPress = (place) => {
    try {
      console.log("🎯 onMarkerPress iniciado")
      console.log(
        "Datos del lugar:",
        JSON.stringify({
          name: place?.name,
          isLocal: place?.isLocal,
          hasComercioData: !!place?.comercioData,
        }),
      )

      onPlaceSelect(place)
      console.log("✅ onPlaceSelect ejecutado exitosamente")
    } catch (error) {
      console.error("❌ Error en onMarkerPress:", error)
      console.error("Stack:", error.stack)
    }
  }

  const handleModalClose = () => {
    onPlaceSelect(null)
    setTemporaryPlace(null)
    if (mapRef.current && initialRegion) {
      mapRef.current.animateToRegion(initialRegion, 1000)
    }
  }

  const handleDirectionClick = (place) => {
    console.log("🧭 Direcciones solicitadas para:", place.name)
  }

  const geocodeAddress = async (address) => {
    try {
      const key = process.env.EXPO_PUBLIC_API_KEY
      const encodedAddress = encodeURIComponent(address)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${key}`

      console.log("🗺️ Geocoding address:", address)
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location
        console.log(`✅ Geocoded: "${address}" -> ${location.lat}, ${location.lng}`)
        return {
          lat: location.lat,
          lng: location.lng,
        }
      } else {
        console.warn(`❌ Geocoding failed for: "${address}" - Status: ${data.status}`)
        return {
          lat: location ? location.coords.latitude : -34.6118,
          lng: location ? location.coords.longitude : -58.396,
        }
      }
    } catch (error) {
      console.error("Error geocoding address:", address, error)
      return {
        lat: location ? location.coords.latitude : -34.6118,
        lng: location ? location.coords.longitude : -58.396,
      }
    }
  }

  const handleStoryPress = async (iD_Comercio) => {
    try {
      console.log("🎬 handleStoryPress called with iD_Comercio:", iD_Comercio)
      console.log("📋 placeList length:", placeList.length)

      setTemporaryPlace(null)
      onPlaceSelect(null)

      let place = placeList.find((p) => {
        const isMatch = p.isLocal && p.comercioData?.iD_Comercio === iD_Comercio
        return isMatch
      })

      console.log("🔍 Found place in placeList:", place ? place.name : "NOT FOUND")

      if (!place) {
        console.log("📡 Fetching comercio from API...")
        const response = await Apis.obtenerComercioPorId(iD_Comercio)
        const comercio = response.data

        console.log("✅ Comercio fetched:", comercio.nombre)

        const coordinates = await geocodeAddress(comercio.direccion)
        console.log("📍 Geocoded coordinates:", coordinates)

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
        console.log("📍 Temporary place set for marker")
      }

      if (place && mapRef.current) {
        console.log("✅ Animating to place location")
        const region = {
          latitude: Number(place.geometry.location.lat),
          longitude: Number(place.geometry.location.lng),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }

        mapRef.current.animateToRegion(region, 1000)

        setTimeout(() => {
          console.log("📍 Opening place detail modal")
          onPlaceSelect(place)
        }, 1100)
      }
    } catch (error) {
      console.error("❌ Error en handleStoryPress:", error)
      console.error("Stack:", error.stack)
      setTemporaryPlace(null)
      onPlaceSelect(null)
    }
    }

  const filterPlacesByType = (places, selectedTypes) => {
    if (!selectedTypes || selectedTypes.length === 0) {
      return places
    }

    const typesArray = selectedTypes.split(",").filter((t) => t.trim())

    return places.filter((place) => {
      // Para lugares de Google, usar el array types
      if (!place.isLocal && place.types) {
        // Si solo se seleccionó "bar", excluir night_clubs
        if (typesArray.includes("bar") && !typesArray.includes("night_club")) {
          return place.types.includes("bar") && !place.types.includes("night_club")
        }
        // Si solo se seleccionó "night_club", excluir bars
        if (typesArray.includes("night_club") && !typesArray.includes("bar")) {
        //  return place.types.includes("night_club") && !place.types.includes("bar")
        const hasBarInName = place.name?.toLowerCase().includes("bar")
          const hasBarInTypes = place.types.includes("bar")
          const isNightClub = place.types.includes("night_club")

          // Excluir si tiene "bar" en el nombre O en los tipos, a menos que sea claramente un boliche
          if (hasBarInName || hasBarInTypes) {
            console.log(`🚫 Excluyendo "${place.name}" - contiene "bar"`)
            return false
          }

          return isNightClub
        }
        // Si se seleccionaron ambos, incluir cualquiera
        return place.types.some((type) => typesArray.includes(type))
      }

      // Para comercios locales, ya están filtrados correctamente
      return true
    })
  }

  const markers = useMemo(() => {
   const selectedTypes = onSearch?.selectedTypes || ""
    const filteredPlaces = filterPlacesByType(placeList, selectedTypes)

    return filteredPlaces.map((item, index) => {
      if (!item.geometry || !item.geometry.location || !item.geometry.location.lat || !item.geometry.location.lng) {
        console.warn("⚠️ Lugar sin coordenadas válidas:", item.name)
        return null
      }

      const lat = Number(item.geometry.location.lat)
      const lng = Number(item.geometry.location.lng)

      if (isNaN(lat) || isNaN(lng)) {
        console.warn("⚠️ Coordenadas no numéricas:", item.name, { lat, lng })
        return null
      }

      return (
        <PlaceMarker
          key={item.place_id || `place_${index}`}
          item={item}
          onPress={() => onMarkerPress(item)}
          isSelected={selectedPlace && selectedPlace.place_id === item.place_id}
          
        />
      )
    })
   }, [placeList, selectedPlace, onSearch])

  const handleNavigateToLogin = useCallback(() => {
    console.log("🚪 Usuario navegando al login - limpiando estados")
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
              console.log("✅ Mapa completamente cargado")
              setMapReady(true)
            }}
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

      {showStories && mapReady && (
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
