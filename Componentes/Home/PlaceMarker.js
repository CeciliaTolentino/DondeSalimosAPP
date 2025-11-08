import { View, Text, StyleSheet } from "react-native"
import { Marker } from "react-native-maps"


export default function PlaceMarker({ item, onPress, isSelected }) {
  if (!item || !item.geometry || !item.geometry.location) {
    console.warn("⚠️ PlaceMarker: Item inválido", item?.name || "sin nombre")
    return null
  }

  const { lat, lng } = item.geometry.location

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    console.warn("⚠️ PlaceMarker: Coordenadas inválidas", { lat, lng, name: item.name })
    return null
  }

  console.log("📍 Renderizando marcador:", item.name, { lat, lng, isLocal: item.isLocal })

  const getMarkerEmoji = () => {
    if (item.isLocal) {
      // Para comercios locales, usar el tipo de comercio
      return item.comercioData?.iD_TipoComercio === 1 ? "🍺" : "🪩"
    } else {
      // Para lugares de Google, usar los types
      return item.types?.includes("bar") ? "🍺" : "🪩"
    }
  }

  

  const handlePress = () => {
    try {
      console.log("🎯 Marker.onPress iniciado:", item.name)
      if (onPress && typeof onPress === "function") {
        onPress(item)
        console.log("✅ onPress callback ejecutado")
      }
    } catch (error) {
      console.error("❌ Error en Marker.onPress:", error)
    }
  }

  return (
    <Marker
      coordinate={{
        latitude: lat,
        longitude: lng,
      }}
      onPress={handlePress}
      title={item.name}
      description={item.vicinity || item.formatted_address || ""}
      zIndex={10}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
         <Text style={[styles.markerEmoji, isSelected && styles.markerEmojiSelected]}>{getMarkerEmoji()}</Text>
        {!!item.isLocal && (
          <View style={styles.localBadge}>
            <Text style={styles.localBadgeText}>★</Text>
          </View>
        )}
      </View>
      
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
   markerEmoji: {
    fontSize: 24,
  },
  markerEmojiSelected: {
    fontSize: 30,
  },
  localBadgeText: {
    fontSize: 10,
    color: "#000",
    fontWeight: "bold",
  },
})
