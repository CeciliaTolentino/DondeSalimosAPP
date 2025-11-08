
import { useState, useEffect, useContext  } from "react"
import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Alert, Share  } from "react-native"
import { AntDesign, MaterialCommunityIcons, Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import ReservationModal from "./ReservationModal"
import ReviewModal from "./ReviewModal"
import Apis from "../../Apis"
import { AuthContext } from "./../../AuthContext"
const key = process.env.EXPO_PUBLIC_API_KEY

const PlaceDetailModal = ({ place, visible, onClose, onDirectionClick,onNavigateToLogin }) => {
 const { isAuthenticated, isRegistered,isBarOwner } = useContext(AuthContext)
  const navigation = useNavigation()
  console.log("🔍 PlaceDetailModal - Auth state:", {
    isAuthenticated,
    isRegistered,
    isBarOwner,
  })
  console.log("🔍 PlaceDetailModal - Place data:", {
    name: place?.name,
    isLocal: place?.isLocal,
    hasComercioData: !!place?.comercioData,
  })
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
const [reviews, setReviews] = useState([]) // Added reviews state
  const [showAllReviews, setShowAllReviews] = useState(false) // Added show all reviews state
  console.log("🔍 PlaceDetailModal render - visible:", visible, "place:", place?.name)
const [averageRating, setAverageRating] = useState(0)
 //const [hasLoadedReviews, setHasLoadedReviews] = useState(false)

 useEffect(() => {
    // Reset reviews state when place changes or modal closes
    if (!visible) {
      console.log("Modal closed, resetting reviews state")
      setReviews([])
      setAverageRating(0)
      setShowAllReviews(false)
      return
    }

    // Load reviews when modal opens with a local place
    if (visible && place?.isLocal && place?.comercioData) {
      console.log("Modal opened with new place, loading reviews for:", place.comercioData.nombre)
      loadReviews()
    }
  }, [visible, place]) // Depend on place object to reload when it changes



  const safeString = (value, fallback = "") => {
    try {
      if (value === null || value === undefined) return fallback
      if (typeof value === "string") return value
      if (typeof value === "number") return value.toString()
      if (Array.isArray(value)) return value.join(", ")
      if (typeof value === "object") return JSON.stringify(value)
      return String(value)
    } catch (error) {
      console.error("❌ Error en safeString:", error)
      return fallback
    }
  }

  const getImageSource = () => {
    try {
      console.log("🖼️ Obteniendo imagen para:", place.name, "isLocal:", place.isLocal)

      if (place.isLocal && place.comercioData?.foto) {
        console.log("📸 Usando imagen base64 del comercio local")
        return {
          uri: `data:image/jpeg;base64,${place.comercioData.foto}`,
        }
      } else if (place.isLocal && place.photos && place.photos[0]?.photo_reference && place.photos[0]?.isBase64) {
        console.log("📸 Usando imagen base64 del array photos")
        return {
          uri: `data:image/jpeg;base64,${place.photos[0].photo_reference}`,
        }
      } else if (place?.photos && place.photos[0]?.photo_reference && !place.photos[0]?.isBase64) {
        console.log("📸 Usando imagen de Google Places")
        return {
          uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${key}`,
        }
      }

      console.log("📸 Usando imagen placeholder")
      return require("../../assets/placeholder.jpg")
    } catch (error) {
      console.error("❌ Error en getImageSource:", error)
      return require("../../assets/placeholder.jpg")
    }
  }

  const formatTime = (timeString) => {
    try {
      if (!timeString) return ""
      const parts = timeString.split(":")
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`
      }
      return timeString
    } catch (error) {
      console.error("❌ Error en formatTime:", error)
      return ""
    }
  }
const SharePlace = async (place) => {
    try {
      console.log("📤 Compartiendo lugar:", place.name)

      const message = `¡Mira este lugar! ${place.name}\n${place.vicinity || place.formatted_address || ""}\n${place.isLocal && place.telefono ? `📞 ${place.telefono}` : ""}`

      const result = await Share.share({
        message: message,
        title: place.name,
      })

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("✅ Compartido con:", result.activityType)
        } else {
          console.log("✅ Compartido exitosamente")
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("❌ Compartir cancelado")
      }
    } catch (error) {
      console.error("❌ Error al compartir:", error)
      Alert.alert("Error", "No se pudo compartir el lugar")
    }
  }
  const handleClose = () => {
    try {
      console.log("❌ Cerrando modal")
      onClose()
    } catch (error) {
      console.error("❌ Error en handleClose:", error)
    }
  }

  const handleReservation = () => {
    try {
      console.log("📅 Intentando abrir modal de reserva para:", place.name)
      console.log("📅 Auth state en handleReservation:", { isAuthenticated, isRegistered, isBarOwner })

      if (!isAuthenticated || !isRegistered) {
        console.log("📅 Usuario no autenticado, mostrando alert")
        Alert.alert("Inicia sesión para reservar", "Necesitas registrarte para hacer reservas en nuestros comercios.", [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Ir a Login",
            onPress: () => {
              if (onNavigateToLogin) {
                onNavigateToLogin()
              }
              onClose()
              navigation.navigate("Login")
            },
          },
        ])
        return
      }

      if (isBarOwner === true) {
        console.log("📅 Usuario es comercio, bloqueando reserva")
        Alert.alert(
          "Acción no permitida",
          "Los comercios no pueden hacer reservas. Esta función es solo para usuarios.",
          [{ text: "Entendido", style: "default" }],
        )
        return
      }

      if (!place.comercioData) {
        console.error("❌ No hay datos del comercio disponibles")
        return
      }
      console.log("📅 Abriendo modal de reserva")
      setShowReservationModal(true)
    } catch (error) {
      console.error("❌ Error en handleReservation:", error)
      console.error("❌ Stack:", error.stack)
    }
  }

  const handleReview = () => {
    try {
      console.log("⭐ Intentando abrir modal de reseña para:", place.name)
      console.log("⭐ Auth state en handleReview:", { isAuthenticated, isRegistered, isBarOwner })

      if (!isAuthenticated || !isRegistered) {
        console.log("⭐ Usuario no autenticado, mostrando alert")
        Alert.alert(
          "Inicia sesión para dejar reseñas",
          "Necesitas registrarte para compartir tu experiencia y dejar reseñas.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Ir a Login",
              onPress: () => {
                if (onNavigateToLogin) {
                  onNavigateToLogin()
                }
                onClose()
                navigation.navigate("Login")
              },
            },
          ],
        )
        return
      }

      if (isBarOwner === true) {
        console.log("⭐ Usuario es comercio, bloqueando reseña")
        Alert.alert(
          "Acción no permitida",
          "Los comercios no pueden dejar reseñas. Esta función es solo para usuarios.",
          [{ text: "Entendido", style: "default" }],
        )
        return
      }

      if (!place.comercioData) {
        console.error("❌ No hay datos del comercio disponibles")
        return
      }
      console.log("⭐ Abriendo modal de reseña")
      setShowReviewModal(true)
    } catch (error) {
      console.error("❌ Error en handleReview:", error)
      console.error("❌ Stack:", error.stack)
    }
  }
  const loadReviews = async () => {
    try {
      if (!place?.comercioData?.nombre || !place?.comercioData?.iD_Comercio) return
      console.log(
        "[v0] Cargando reseñas para comercio ID:",
        place.comercioData.iD_Comercio,
        "Nombre:",
        place.comercioData.nombre,
      )
      const response = await Apis.obtenerReseniasPorComercio(place.comercioData.nombre)

      console.log("[v0] Total reviews received from API:", response.data.length)

      const reviewsForThisPlace = response.data.filter((r) => r.iD_Comercio === place.comercioData.iD_Comercio)
      console.log("[v0] Reviews after filtering by comercio ID:", reviewsForThisPlace.length)

      const approvedReviews = reviewsForThisPlace.filter((r) => r.estado === true)
      console.log("[v0] Approved reviews count:", approvedReviews.length)

      setReviews(approvedReviews)

      if (approvedReviews.length > 0) {
        const reviewsWithRating = approvedReviews.filter((r) => r.puntuacion != null)
        if (reviewsWithRating.length > 0) {
          const totalRating = reviewsWithRating.reduce((sum, review) => sum + review.puntuacion, 0)
          const avg = totalRating / reviewsWithRating.length
          setAverageRating(avg)
          console.log("[v0] Promedio de puntuación:", avg.toFixed(1), "de", reviewsWithRating.length, "reseñas")
        } else {
          setAverageRating(0)
          console.log("[v0] No hay reseñas con puntuación todavía")
        }
      } else {
        setAverageRating(0)
      }

      console.log("[v0] Reseñas finales cargadas:", approvedReviews.length)
    } catch (error) {
      console.error("❌ Error al cargar reseñas:", error)
      setReviews([])
      setAverageRating(0)
    }
  }


  const getRelativeTime = (dateString) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMs = now - date
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

      if (diffInDays === 0) return "Hoy"
      if (diffInDays === 1) return "Ayer"
      if (diffInDays < 7) return `Hace ${diffInDays} días`
      if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`
      if (diffInDays < 365) return `Hace ${Math.floor(diffInDays / 30)} meses`
      return `Hace ${Math.floor(diffInDays / 365)} años`
    } catch {
      return "Fecha no disponible"
    }
  }
const renderStars = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <View style={styles.starsRowDisplay}>
        {[...Array(fullStars)].map((_, i) => (
          <AntDesign key={`full-${i}`} name="star" size={18} color="#ffd700" />
        ))}
        {hasHalfStar && <AntDesign name="star" size={18} color="#ffd700" style={{ opacity: 0.5 }} />}
        {[...Array(emptyStars)].map((_, i) => (
          <AntDesign key={`empty-${i}`} name="staro" size={18} color="#666" />
        ))}
      </View>
    )
  }
  const renderReviewsSection = () => {
    if (!place.isLocal || reviews.length === 0) return null

    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)
     console.log(
      "Rendering reviews section. Total:",
      reviews.length,
      "Displayed:",
      displayedReviews.length,
      "ShowAll:",
      showAllReviews,
    )
    return (
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <View style={styles.ratingHeaderContainer}>
          <Text style={styles.reviewsTitle}>⭐ Reseñas ({reviews.length})</Text>
          {averageRating > 0 && (
              <View style={styles.averageRatingContainer}>
                {renderStars(averageRating)}
                <Text style={styles.averageRatingText}>{averageRating.toFixed(1)}/5</Text>
              </View>
            )}
          </View>
        </View>

        {displayedReviews.map((review, index) => {
          console.log("[v0] Rendering review:", review.iD_Resenia, "Comment:", review.comentario?.substring(0, 30))
          return (
          <View key={review.iD_Resenia || index} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
               <View style={styles.reviewUserContainer}>
              <Text style={styles.reviewUser}>{review.usuario?.nombreUsuario || "Usuario"}</Text>
               {review.puntuacion && renderStars(review.puntuacion)}
              </View>
              <Text style={styles.reviewDate}>{getRelativeTime(review.fechaCreacion)}</Text>
            </View>
            <Text style={styles.reviewComment}>{review.comentario}</Text>
          </View>
       )
        })}

        {reviews.length > 3 && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAllReviews(!showAllReviews)}
            activeOpacity={0.7}
          >
            <Text style={styles.showMoreText}>{showAllReviews ? "Ver menos" : "Ver todas las reseñas"}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderPlaceDetails = (place) => {
    if (!place) {
      console.log("⚠️ Place is null or undefined, returning null")
      return null
    }

    try {
      console.log("🎨 Renderizando detalles del lugar:", place.name)
      console.log("🎨 isBarOwner value:", isBarOwner, "type:", typeof isBarOwner)

      return (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
            <View style={styles.closeButtonContainer}>
              <AntDesign name="close" size={24} color="#f089faad" />
            </View>
          </TouchableOpacity>

          <Text numberOfLines={2} style={styles.name}>
            {safeString(place.name, "Nombre no disponible")}
          </Text>

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

          <Text style={styles.vicinity}>
            {safeString(place.vicinity || place.formatted_address, "Dirección no disponible")}
          </Text>

          {!!place.isLocal && (
            <View style={styles.localInfoContainer}>
              {!!place.generoMusical && <Text style={styles.genreText}>🎵 #{safeString(place.generoMusical)}</Text>}
              {!!place.capacidad && (
                <Text style={styles.capacityText}>👥 Capacidad: {safeString(place.capacidad)} personas</Text>
              )}
              {!!place.mesas && <Text style={styles.capacityText}>🪑 Mesas: {safeString(place.mesas)}</Text>}
              {!!(place.comercioData?.horaIngreso && place.comercioData?.horaCierre) && (
                <Text style={styles.hoursText}>
                  🕐 {formatTime(safeString(place.comercioData.horaIngreso))} -{" "}
                  {formatTime(safeString(place.comercioData.horaCierre))}
                </Text>
              )}
              {!!place.telefono && <Text style={styles.contactText}>📞 {safeString(place.telefono)}</Text>}
              {!!place.correo && <Text style={styles.contactText}>📧 {safeString(place.correo)}</Text>}
             
            </View>
            
          )}

          {!place.isLocal && (
            <>
              {!!place?.opening_hours && (
                <Text style={[styles.openNow, { color: place.opening_hours.open_now ? "green" : "red" }]}>
                  {place.opening_hours.open_now ? "🟢 Abierto" : "🔴 Cerrado"}
                </Text>
              )}
              {!!place?.price_level && (
                <Text style={styles.priceLevel}>💰 Nivel de precio: {"$".repeat(place.price_level)}</Text>
              )}
            </>
          )}

          {renderReviewsSection()}

          {!!place.isLocal && place.comercioData && isBarOwner !== true && (
            <TouchableOpacity style={styles.reservationButton} onPress={handleReservation} activeOpacity={0.8}>
              <MaterialCommunityIcons name="calendar-check" size={24} color="white" />
              <Text style={styles.reservationButtonText}>Hacer Reserva</Text>
            </TouchableOpacity>
          )}

          {!!place.isLocal && place.comercioData && isBarOwner !== true && (
            <TouchableOpacity style={styles.reviewButton} onPress={handleReview} activeOpacity={0.8}>
              <AntDesign name="star" size={24} color="white" />
              <Text style={styles.reviewButtonText}>Dejar Reseña</Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonContainer}>
            
            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={() => SharePlace(place)}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={24} color="white" />
              <Text style={styles.buttonText}>Compartir</Text>
            </TouchableOpacity>

            {!!(place.isLocal && place.telefono) && (
              <TouchableOpacity
                style={[styles.button, styles.callButton]}
                onPress={() => Linking.openURL(`tel:${safeString(place.telefono)}`)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone" size={24} color="white" />
                <Text style={styles.buttonText}>Llamar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )
    } catch (error) {
      console.error("❌ Error en renderPlaceDetails:", error)
      console.error("Stack:", error.stack)
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar los detalles</Text>
          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )
    }
  }

  try {
    console.log("🎬 Renderizando Modal principal")

    if (!visible || !place) {
      return null
    }

    return (
      <>
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>{renderPlaceDetails(place)}</View>
          </View>
        </Modal>

        {showReservationModal && place.isLocal && place.comercioData && (
          <ReservationModal
            visible={showReservationModal}
            onClose={() => setShowReservationModal(false)}
            comercio={place.comercioData}
          />
        )}

        {showReviewModal && place.isLocal && place.comercioData && (
          <ReviewModal
            visible={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            comercio={place.comercioData}
          />
        )}
      </>
    )
  } catch (error) {
    console.error("❌ Error crítico en PlaceDetailModal:", error)
    console.error("Stack:", error.stack)
    return null
  }
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Increased opacity for darker overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: "#1a1a2e", // Changed from white to dark background
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#9d4edd", // Purple shadow for glow effect
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5, // Increased shadow opacity
    shadowRadius: 8, // Increased shadow radius
    elevation: 10, // Increased elevation
    width: "90%",
    maxHeight: "85%",
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.3)", // Purple border
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
    backgroundColor: "rgba(26, 26, 46, 0.95)", // Dark background instead of white
    borderRadius: 20,
    padding: 8,
    shadowColor: "#9d4edd", // Purple shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.5)", // Purple border
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
    textAlign: "center",
    color: "#ffffff", // White text
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2, // Added border
    borderColor: "rgba(157, 78, 221, 0.4)", // Purple border
  },
  vicinity: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
    color: "#b8b8d1", // Light purple-gray text
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
    color: "#e0e0e0", // Light gray text
  },
  reservationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    width: "100%",
    shadowColor: "#28a745", // Green shadow for glow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5, // Increased shadow
    shadowRadius: 5, // Increased shadow radius
    elevation: 5,
    borderWidth: 1, // Added border
    borderColor: "rgba(40, 167, 69, 0.5)", // Green border
  },
  reservationButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff9800",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#ff9800", // Orange shadow for glow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5, // Increased shadow
    shadowRadius: 5, // Increased shadow radius
    elevation: 5,
    borderWidth: 1, // Added border
    borderColor: "rgba(255, 152, 0, 0.5)", // Orange border
  },
  reviewButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    gap: 15,
    marginTop: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7b2cbf", // Purple background
    padding: 15,
    borderRadius: 20,
    
    minWidth: 120,
    justifyContent: "center",
    shadowColor: "#9d4edd", // Purple shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.4)", // Purple border
  },
  
  shareButton: {
    backgroundColor: "#0088cc",
    shadowColor: "#0088cc",
    borderColor: "rgba(0, 136, 204, 0.5)",
  },

  callButton: {
    backgroundColor: "#28a745",
    shadowColor: "#28a745", 
    borderColor: "rgba(40, 167, 69, 0.5)", 
  },
  buttonText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 16,
  },
  localInfoContainer: {
    backgroundColor: "rgba(157, 78, 221, 0.15)", // Dark purple background
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#9d4edd", // Purple border
    width: "100%",
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.3)", // Purple border
  },
  genreText: {
    fontSize: 18,
    color: "#c77dff", // Light purple text
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  capacityText: {
    fontSize: 14,
    color: "#e0e0e0", // Light gray text
    marginBottom: 5,
  },
  hoursText: {
    fontSize: 14,
    color: "#ffffff", // White text
    marginBottom: 5,
    fontWeight: "bold",
  },
  contactText: {
    fontSize: 14,
    color: "#9d4edd", // Purple text
    marginBottom: 5,
  },
  localBadgeContainer: {
    backgroundColor: "#7b2cbf", // Purple background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: "center",
    marginTop: 10,
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.6)", // Purple border
  },
  localBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomSpacer: {
    height: 20,
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff6b6b", // Light red text
    marginBottom: 20,
    textAlign: "center",
  },
  reviewsContainer: {
    backgroundColor: "rgba(157, 78, 221, 0.15)", // Dark purple background
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
    borderWidth: 1, // Added border
    borderColor: "rgba(255, 152, 0, 0.3)", // Orange border
  },
  reviewsHeader: {
    marginBottom: 15,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff", // White text
  },
  reviewItem: {
    backgroundColor: "rgba(26, 26, 46, 0.8)", // Dark background
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#9d4edd", // Purple shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.2)",
    overflow: "hidden", // Purple border
  },
  reviewHeader: {
    flexDirection: "column", // Changed to column layout and adjusted alignment
    marginBottom: 8,
    gap: 6,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#c77dff", // Light purple text
  },
  reviewDate: {
    fontSize: 12,
    color: "#b8b8d1",
    marginTop: 4,  // Light purple-gray text
  },
  reviewComment: {
    fontSize: 14,
    color: "#e0e0e0", // Light gray text
    lineHeight: 20,
  },
  showMoreButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  showMoreText: {
    color: "#ff9800",
    fontSize: 14,
    fontWeight: "600",
  },
  ratingHeaderContainer: {
    gap: 8,
  },
  averageRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
  },
  starsRowDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  averageRatingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffd700",
  },
  reviewUserContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
})

export default PlaceDetailModal
