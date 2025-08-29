import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking } from "react-native"
import { AntDesign, MaterialCommunityIcons, Feather } from "@expo/vector-icons"

const key = process.env.EXPO_PUBLIC_API_KEY

const PlaceDetailModal = ({ place, visible, onClose, onDirectionClick }) => {
  console.log("🔍 PlaceDetailModal - visible:", visible, "place:", place?.name)

  if (!visible || !place) return null

  const getImageSource = () => {
    console.log("🖼️ Obteniendo imagen para:", place.name, "isLocal:", place.isLocal)

    if (place.isLocal && place.comercioData?.foto) {
      // Para comercios locales con imagen base64
      console.log("📸 Usando imagen base64 del comercio local")
      return {
        uri: `data:image/jpeg;base64,${place.comercioData.foto}`,
      }
    } else if (place.isLocal && place.photos && place.photos[0]?.photo_reference && place.photos[0]?.isBase64) {
      // Alternativa: si la foto está en el array photos como base64
      console.log("📸 Usando imagen base64 del array photos")
      return {
        uri: `data:image/jpeg;base64,${place.photos[0].photo_reference}`,
      }
    } else if (place?.photos && place.photos[0]?.photo_reference && !place.photos[0]?.isBase64) {
      // Para lugares de Google Places
      console.log("📸 Usando imagen de Google Places")
      return {
        uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${key}`,
      }
    }

    console.log("📸 Usando imagen placeholder")
    return require("../../assets/placeholder.jpg")
  }

  const formatTime = (timeString) => {
    if (!timeString) return ""
    const parts = timeString.split(":")
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return timeString
  }

  const SharePlace = (place) => {
    // Implementar función de compartir
    console.log("📤 Compartiendo lugar:", place.name)
  }

  const handleClose = () => {
    console.log("❌ Cerrando modal")
    onClose()
  }

  const renderPlaceDetails = (place) => {
    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <View style={styles.closeButtonContainer}>
            <AntDesign name="close" size={24} color="black" />
          </View>
        </TouchableOpacity>

        <Text numberOfLines={2} style={styles.name}>
          {place.name || "Nombre no disponible"}
        </Text>

        {place.rating && (
          <View style={styles.ratingContainer}>
            <AntDesign name="star" size={20} color="#FFD700" />
            <Text style={styles.rating}>{place.rating}</Text>
          </View>
        )}

        <Image
          source={getImageSource()}
          style={styles.image}
          defaultSource={require("../../assets/placeholder.jpg")}
          onError={(error) => {
            console.log("❌ Error cargando imagen:", error.nativeEvent.error)
          }}
          onLoad={() => {
            console.log("✅ Imagen cargada exitosamente")
          }}
        />

        <Text style={styles.vicinity}>{place.vicinity || place.formatted_address || "Dirección no disponible"}</Text>

        {/* Información específica para comercios locales */}
        {place.isLocal && (
          <View style={styles.localInfoContainer}>
            {place.generoMusical && <Text style={styles.genreText}>🎵 #{place.generoMusical}</Text>}
            {place.capacidad && <Text style={styles.capacityText}>👥 Capacidad: {place.capacidad} personas</Text>}
            {place.mesas && <Text style={styles.capacityText}>🪑 Mesas: {place.mesas}</Text>}
            {place.hora_ingreso && place.hora_cierre && (
              <Text style={styles.hoursText}>
                🕐 {formatTime(place.hora_ingreso)} - {formatTime(place.hora_cierre)}
              </Text>
            )}
            {place.telefono && <Text style={styles.contactText}>📞 {place.telefono}</Text>}
            {place.correo && <Text style={styles.contactText}>📧 {place.correo}</Text>}
            <View style={styles.localBadgeContainer}>
              <Text style={styles.localBadgeText}>⭐ Comercio Registrado</Text>
            </View>
          </View>
        )}

        {/* Información para lugares de Google Places */}
        {!place.isLocal && (
          <>
            {place?.opening_hours && (
              <Text style={[styles.openNow, { color: place.opening_hours.open_now ? "green" : "red" }]}>
                {place.opening_hours.open_now ? "🟢 Abierto" : "🔴 Cerrado"}
              </Text>
            )}
            {place?.price_level && (
              <Text style={styles.priceLevel}>💰 Nivel de precio: {"$".repeat(place.price_level)}</Text>
            )}
          </>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => onDirectionClick(place)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="directions" size={24} color="white" />
            <Text style={styles.buttonText}>Dirección</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => SharePlace(place)} activeOpacity={0.8}>
            <Feather name="share" size={24} color="white" />
            <Text style={styles.buttonText}>Compartir</Text>
          </TouchableOpacity>

          {place.isLocal && place.telefono && (
            <TouchableOpacity
              style={[styles.button, styles.callButton]}
              onPress={() => Linking.openURL(`tel:${place.telefono}`)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="phone" size={24} color="white" />
              <Text style={styles.buttonText}>Llamar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Espacio adicional al final para scroll */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    )
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>{renderPlaceDetails(place)}</View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxHeight: "85%",
  },
  scrollView: {
    width: "100%",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
    padding: 10,
  },
  closeButtonContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
    textAlign: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  rating: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: "bold",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
  },
  vicinity: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
    color: "#666",
  },
  openNow: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  priceLevel: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    flexWrap: "wrap",
    marginTop: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5c288c",
    padding: 12,
    borderRadius: 20,
    margin: 5,
    minWidth: 100,
    justifyContent: "center",
  },
  callButton: {
    backgroundColor: "#28a745",
  },
  buttonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  // Estilos para comercios locales
  localInfoContainer: {
    backgroundColor: "#f0f8ff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
    width: "100%",
  },
  genreText: {
    fontSize: 18,
    color: "#5c288c",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  capacityText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  hoursText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
    fontWeight: "bold",
  },
  contactText: {
    fontSize: 14,
    color: "#007bff",
    marginBottom: 5,
  },
  localBadgeContainer: {
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: "center",
    marginTop: 10,
  },
  localBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomSpacer: {
    height: 20,
  },
})

export default PlaceDetailModal
