import { View, Text, StyleSheet } from "react-native"
import { Marker, Callout } from "react-native-maps"
import { FontAwesome } from "@expo/vector-icons"

export default function PlaceMarker({ item, onPress, isSelected }) {
  // Validar que el item tenga las propiedades necesarias
  if (!item || !item.geometry || !item.geometry.location) {
    console.warn("⚠️ PlaceMarker: Item inválido", item?.name || "sin nombre")
    return null
  }

  const { lat, lng } = item.geometry.location

  // Validar coordenadas
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    console.warn("⚠️ PlaceMarker: Coordenadas inválidas", { lat, lng, name: item.name })
    return null
  }

  console.log("📍 Renderizando marcador:", item.name, { lat, lng, isLocal: item.isLocal })

  const getMarkerIcon = () => {
    if (item.isLocal) {
      // Para comercios locales, usar el tipo de comercio
      return item.comercioData?.iD_TipoComercio === 1 ? "glass" : "music"
    } else {
      // Para lugares de Google Places
      return item.types?.includes("bar") ? "glass" : "music"
    }
  }

  const getMarkerColor = () => {
    if (item.isLocal) {
      return isSelected ? "#ff4500" : "#00ff00" // Verde para comercios locales
    } else {
      return isSelected ? "#ff4500" : "#e59fe5" // Morado para Google Places
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return ""
    const parts = timeString.split(":")
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return timeString
  }

  return (
    <Marker
      coordinate={{
        latitude: lat,
        longitude: lng,
      }}
      onPress={() => {
        console.log("🎯 Marcador presionado:", item.name)
        onPress(item)
      }}
    >
      <View style={styles.markerContainer}>
        <FontAwesome name={getMarkerIcon()} size={isSelected ? 30 : 24} color={getMarkerColor()} />
        {item.isLocal && (
          <View style={styles.localBadge}>
            <Text style={styles.localBadgeText}>★</Text>
          </View>
        )}
      </View>
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{item.name}</Text>
          <Text style={styles.calloutAddress}>{item.vicinity || item.formatted_address}</Text>

          {/* Información específica para comercios locales */}
          {item.isLocal && (
            <>
              {item.generoMusical && <Text style={styles.calloutGenre}>🎵 {item.generoMusical}</Text>}
              {item.capacidad && <Text style={styles.calloutCapacity}>👥 Cap: {item.capacidad}</Text>}
              {item.hora_ingreso && item.hora_cierre && (
                <Text style={styles.calloutHours}>
                  🕐 {formatTime(item.hora_ingreso)} - {formatTime(item.hora_cierre)}
                </Text>
              )}
              <Text style={styles.calloutSource}>📍 Comercio registrado</Text>
            </>
          )}

          {/* Información para lugares de Google Places */}
          {!item.isLocal && item.plus_code && item.plus_code.compound_code && (
            <Text style={styles.calloutLocation}>{item.plus_code.compound_code.split(" ").slice(1).join(" ")}</Text>
          )}
        </View>
      </Callout>
    </Marker>
  )
}

const styles = StyleSheet.create({
  markerContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  localBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFD700",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  localBadgeText: {
    fontSize: 10,
    color: "#000",
    fontWeight: "bold",
  },
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 6,
    padding: 10,
    width: 220,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  calloutAddress: {
    fontSize: 14,
    marginBottom: 3,
  },
  calloutGenre: {
    fontSize: 12,
    color: "#5c288c",
    fontWeight: "bold",
    marginBottom: 3,
  },
  calloutCapacity: {
    fontSize: 12,
    color: "#333",
    marginBottom: 3,
  },
  calloutHours: {
    fontSize: 12,
    color: "#333",
    marginBottom: 3,
  },
  calloutSource: {
    fontSize: 12,
    color: "#28a745",
    fontStyle: "italic",
    marginBottom: 3,
  },
  calloutLocation: {
    fontSize: 12,
    color: "#666",
  },
})
