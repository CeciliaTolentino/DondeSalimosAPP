import { useContext, useState } from "react"
import { View, StyleSheet } from "react-native"

import GoogleMapViewFull from "./../../Components/maps&marker/GoogleMapViewFull"
import GlobalApi from "../../Apis/GlobalApi"
import { UserLocationContext } from "../Context/UserLocationContext"

export default function Home() {
  const [placeList, setPlaceList] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const { location } = useContext(UserLocationContext)

  const handleSearch = (type, keyword, filters) => {
    GetNearBySearchPlace(type, keyword, filters)
  }

  const GetNearBySearchPlace = async (type = "", keyword = "", filters = "") => {
    try {
    

      // Obtener lugares de Google Places
      const googlePlaces = await getGooglePlaces(type, keyword, filters)

      // Obtener comercios de nuestra base de datos
      const localComercios = await getLocalComercios(type, keyword, filters)

      // Combinar ambos resultados
      const combinedPlaces = [...googlePlaces, ...localComercios]
      //console.log(" Total de lugares encontrados:", combinedPlaces.length)
     // console.log("- Google Places:", googlePlaces.length)
      //console.log("- Comercios locales:", localComercios.length)

      setPlaceList(combinedPlaces)
    } catch (error) {
      console.error("Error fetching places:", error)
      setPlaceList([])
    }
  }

  const getGooglePlaces = async (type, keyword, filters) => {
    try {
      if (!location) {
        console.log(" No hay ubicación disponible para Google Places")
        return []
      }

      const resp = await GlobalApi.nearByPlace(
        location.coords.latitude,
        location.coords.longitude,
        type,
        keyword,
        filters,
      )

      const results = resp.data.results || []
      console.log("Google Places encontrados:", results.length)

      // Marcar como lugares de Google
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
      console.log("🏪 Buscando comercios locales...")

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/comercios/listado`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.log(" Error al obtener comercios locales")
        return []
      }

      const comercios = await response.json()
      console.log(" Total comercios en BD:", comercios.length)

      // Filtrar solo comercios aprobados
      let filteredComercios = comercios.filter((comercio) => comercio.estado === true)
      console.log("Comercios aprobados:", filteredComercios.length)

      // Aplicar filtros de tipo (bar/boliche)
      if (type) {
        const tipoMap = {
          bar: 1,
          night_club: 2,
        }
        const tipoId = tipoMap[type]
        if (tipoId) {
          filteredComercios = filteredComercios.filter((comercio) => comercio.iD_TipoComercio === tipoId)
          console.log(`Comercios filtrados por tipo ${type}:`, filteredComercios.length)
        }
      }

      // Aplicar filtro de género musical
      if (filters && filters.trim()) {
        const originalCount = filteredComercios.length
        filteredComercios = filteredComercios.filter(
          (comercio) => comercio.generoMusical && comercio.generoMusical.toLowerCase().includes(filters.toLowerCase()),
        )
        console.log(` Comercios filtrados por género "${filters}": ${filteredComercios.length} (de ${originalCount})`)
      }

      if (filteredComercios.length === 0) {
        console.log("No se encontraron comercios que coincidan con los filtros")
        return []
      }

      // Convertir direcciones a coordenadas y formatear como Google Places
      console.log(" Geocodificando direcciones...")
      const comerciosWithCoords = await Promise.all(
        filteredComercios.map(async (comercio) => {
          const coordinates = await geocodeAddress(comercio.direccion)

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
            types: comercio.iD_TipoComercio === 1 ? ["bar", "establishment"] : ["night_club", "establishment"],
            opening_hours: {
              open_now: isCurrentlyOpen(comercio.hora_ingreso, comercio.hora_cierre),
            },
            photos: comercio.foto
              ? [
                  {
                    photo_reference: comercio.foto,
                    isBase64: true,
                  },
                ]
              : null,
            // Datos adicionales de nuestro comercio
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
        }),
      )

      // Filtrar comercios que no pudieron ser geocodificados
      const validComercios = comerciosWithCoords.filter(
        (comercio) => comercio.geometry.location.lat !== 0 && comercio.geometry.location.lng !== 0,
      )

      console.log("📍 Comercios geocodificados exitosamente:", validComercios.length)
      return validComercios
    } catch (error) {
      console.error("Error fetching local comercios:", error)
      return []
    }
  }

  // Función para convertir dirección en coordenadas usando Google Geocoding API
  const geocodeAddress = async (address) => {
    try {
      const key = process.env.EXPO_PUBLIC_API_KEY
      const encodedAddress = encodeURIComponent(address)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${key}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location
        console.log(`Geocodificado: "${address}" -> ${location.lat}, ${location.lng}`)
        return {
          lat: location.lat,
          lng: location.lng,
        }
      } else {
        console.warn(` Geocoding falló para: "${address}" - Status: ${data.status}`)
        // Retornar coordenadas por defecto cerca de la ubicación del usuario
        return {
          lat: location ? location.coords.latitude + (Math.random() - 0.5) * 0.01 : -34.6118,
          lng: location ? location.coords.longitude + (Math.random() - 0.5) * 0.01 : -58.396,
        }
      }
    } catch (error) {
      console.error("Error geocoding address:", address, error)
      return {
        lat: location ? location.coords.latitude + (Math.random() - 0.5) * 0.01 : -34.6118,
        lng: location ? location.coords.longitude + (Math.random() - 0.5) * 0.01 : -58.396,
      }
    }
  }

  // Función para determinar si el comercio está abierto actualmente
  const isCurrentlyOpen = (horaIngreso, horaCierre) => {
    if (!horaIngreso || !horaCierre) return true // Asumir abierto si no hay horarios

    try {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()

      const [ingresoHour, ingresoMin] = horaIngreso.split(":").map(Number)
      const [cierreHour, cierreMin] = horaCierre.split(":").map(Number)

      const ingresoTime = ingresoHour * 60 + ingresoMin
      let cierreTime = cierreHour * 60 + cierreMin

      // Si el horario de cierre es menor que el de ingreso, significa que cierra al día siguiente
      if (cierreTime < ingresoTime) {
        cierreTime += 24 * 60 // Agregar 24 horas

        // Verificar si estamos en el rango que cruza medianoche
        return currentTime >= ingresoTime || currentTime <= cierreTime - 24 * 60
      } else {
        // Horario normal dentro del mismo día
        return currentTime >= ingresoTime && currentTime <= cierreTime
      }
    } catch (error) {
      console.error("Error calculating opening hours:", error)
      return true
    }
  }

  const handlePlaceSelect = (place) => {
    console.log("Lugar seleccionado:", place?.name)
    setSelectedPlace(place)
  }

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
