import { useContext, useState, useRef, useCallback } from "react"
import { View, StyleSheet } from "react-native"

import GoogleMapViewFull from "./../../Components/maps&marker/GoogleMapViewFull"
import GlobalApi from "../../Apis/GlobalApi"
import { UserLocationContext } from "../Context/UserLocationContext"


const geocodeCache = new Map()


let comerciosCache = {
  data: null,
  timestamp: 0,
}
const COMERCIOS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export default function Home() {
  const [placeList, setPlaceList] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const { location } = useContext(UserLocationContext)
  

  const isSearchingRef = useRef(false)
  const lastSearchRef = useRef("")

  const handleSearch = useCallback((type, keyword, filters) => {
 
    const searchKey = `${type}-${keyword}-${filters}`
    if (searchKey === lastSearchRef.current && isSearchingRef.current) {
      return
    }
    lastSearchRef.current = searchKey
    GetNearBySearchPlace(type, keyword, filters)
  }, [location])

  const GetNearBySearchPlace = async (type = "", keyword = "", filters = "") => {
    if (isSearchingRef.current) return
    isSearchingRef.current = true

    try {

      const [googlePlaces, localComercios] = await Promise.all([
        getGooglePlaces(type, keyword, filters),
        getLocalComercios(type, keyword, filters),
      ])

      const combinedPlaces = [...googlePlaces, ...localComercios]
      setPlaceList(combinedPlaces)
    } catch (error) {
      console.error("Error fetching places:", error)
      setPlaceList([])
    } finally {
      isSearchingRef.current = false
    }
  }

  const getGooglePlaces = async (type, keyword, filters) => {
    try {
      if (!location) return []

      const resp = await GlobalApi.nearByPlace(
        location.coords.latitude,
        location.coords.longitude,
        type,
        keyword,
        filters
      )

      const results = resp.data.results || []
      return results.map((place) => ({
        ...place,
        source: "google",
        isLocal: false,
      }))
    } catch (error) {
      console.error("Error fetching Google places:", error)
      return []
    }
  }

  const getLocalComercios = async (type, keyword, filters) => {
    try {
     
      const now = Date.now()
      let comercios

      if (comerciosCache.data && (now - comerciosCache.timestamp) < COMERCIOS_CACHE_DURATION) {
        comercios = comerciosCache.data
        console.log("[Home] Usando caché de comercios:", comercios.length)
      } else {
        // Cargar comercios desde API
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/comercios/listado`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        )

        if (!response.ok) return []

        comercios = await response.json()
        
       
        comerciosCache = { data: comercios, timestamp: now }
        console.log("[Home] Comercios cargados desde API:", comercios.length)
      }

      
      let filteredComercios = comercios.filter((comercio) => comercio.estado === true)

     
      if (type) {
        const tipoMap = { bar: 1, night_club: 2 }
        const tipoId = tipoMap[type]
        if (tipoId) {
          filteredComercios = filteredComercios.filter(
            (comercio) => comercio.iD_TipoComercio === tipoId
          )
        }
      }

      
      if (filters && filters.trim()) {
        filteredComercios = filteredComercios.filter(
          (comercio) =>
            comercio.generoMusical &&
            comercio.generoMusical.toLowerCase().includes(filters.toLowerCase())
        )
      }

      if (filteredComercios.length === 0) return []

      
      const comerciosWithCoords = await geocodeBatch(filteredComercios)

      
      return comerciosWithCoords.filter(
        (comercio) =>
          comercio.geometry.location.lat !== 0 && comercio.geometry.location.lng !== 0
      )
    } catch (error) {
      console.error("Error fetching local comercios:", error)
      return []
    }
  }

  
  const geocodeBatch = async (comercios) => {
    const results = await Promise.all(
      comercios.map(async (comercio) => {
        const coordinates = await geocodeAddressCached(comercio.direccion)

        return {
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
          types:
            comercio.iD_TipoComercio === 1
              ? ["bar", "establishment"]
              : ["night_club", "establishment"],
          opening_hours: {
            open_now: isCurrentlyOpen(comercio.horaIngreso, comercio.horaCierre),
          },
          photos: comercio.foto
            ? [{ photo_reference: comercio.foto, isBase64: true }]
            : null,
          source: "local",
          isLocal: true,
          comercioData: comercio,
          generoMusical: comercio.generoMusical,
          capacidad: comercio.capacidad,
          mesas: comercio.mesas,
          telefono: comercio.telefono,
          correo: comercio.correo,
          hora_ingreso: comercio.horaIngreso,
          hora_cierre: comercio.horaCierre,
        }
      })
    )

    return results
  }

  
  const geocodeAddressCached = async (address) => {
    
    if (geocodeCache.has(address)) {
      return geocodeCache.get(address)
    }

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL
      const encodedAddress = encodeURIComponent(address)
      const url = `${baseUrl}/api/GooglePlaces/geocode?address=${encodedAddress}`

      const response = await fetch(url)
      const data = await response.json()

      let coordinates
      if (data.status === "OK" && data.results.length > 0) {
        coordinates = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        }
      } else {
        
        coordinates = {
          lat: location ? location.coords.latitude + (Math.random() - 0.5) * 0.01 : -34.6118,
          lng: location ? location.coords.longitude + (Math.random() - 0.5) * 0.01 : -58.396,
        }
      }

    
      geocodeCache.set(address, coordinates)
      return coordinates
    } catch (error) {
      console.error("Error geocoding:", address, error)
      const defaultCoords = {
        lat: location ? location.coords.latitude : -34.6118,
        lng: location ? location.coords.longitude : -58.396,
      }
      geocodeCache.set(address, defaultCoords)
      return defaultCoords
    }
  }

  const isCurrentlyOpen = (horaIngreso, horaCierre) => {
    if (!horaIngreso || !horaCierre) return true

    try {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()

      const [ingresoHour, ingresoMin] = horaIngreso.split(":").map(Number)
      const [cierreHour, cierreMin] = horaCierre.split(":").map(Number)

      const ingresoTime = ingresoHour * 60 + ingresoMin
      let cierreTime = cierreHour * 60 + cierreMin

      if (cierreTime < ingresoTime) {
        cierreTime += 24 * 60
        return currentTime >= ingresoTime || currentTime <= cierreTime - 24 * 60
      } else {
        return currentTime >= ingresoTime && currentTime <= cierreTime
      }
    } catch (error) {
      return true
    }
  }

  const handlePlaceSelect = useCallback((place) => {
    setSelectedPlace(place)
  }, [])

  return (
    <View style={styles.container}>
      <GoogleMapViewFull
        placeList={placeList}
        onSearch={handleSearch}
        selectedPlace={selectedPlace}
        onPlaceSelect={handlePlaceSelect}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})