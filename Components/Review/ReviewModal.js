import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { AuthContext } from "../../Apis/AuthContext"
import Apis from "../../Apis/Apis"

const ReviewModal = ({ visible, onClose, comercio }) => {
  const { user } = useContext(AuthContext)
  const [comentario, setComentario] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const [isValidating, setIsValidating] = useState(true)
  const [puntuacion, setPuntuacion] = useState(0)


  useEffect(() => {
    if (visible && comercio && user) {
      validateReviewEligibility()
    }
  }, [visible, comercio, user])

  const validateReviewEligibility = async () => {
    try {
      setIsValidating(true)
      console.log("🔍 Validando elegibilidad para reseña...")

      const esBar = comercio.iD_TipoComercio === 1

      if (esBar) {
        const hasActiveReservation = await checkActiveReservation()
        if (hasActiveReservation) {
          setCanReview(true)
          setValidationMessage("✅ Tienes una reserva activa. Puedes dejar tu reseña.")
        } else {
          setCanReview(false)
          setValidationMessage("❌ Solo puedes reseñar si tienes una reserva activa para hoy.")
        }
      } else {
          const hasAnyReservation = await checkAnyReservation()
        if (hasAnyReservation) {
       const canReviewNightclub = await checkReviewCooldown()
          if (canReviewNightclub) {
            setCanReview(true)
            setValidationMessage("✅ Puedes dejar tu reseña.")
          } else {
            setCanReview(false)
            setValidationMessage("❌ Ya dejaste una reseña recientemente. Espera 7 días para dejar otra.")
          }
        } else {
          setCanReview(false)
          setValidationMessage("❌ Necesitas tener al menos una reserva en este comercio para poder dejar una reseña.")
        }
      }
    } catch (error) {
      console.error("❌ Error validando elegibilidad:", error)
      setCanReview(false)
      setValidationMessage("❌ Error al validar. Intenta nuevamente.")
    } finally {
      setIsValidating(false)
    }
  }

  const checkActiveReservation = async () => {
    try {
      const response = await Apis.obtenerReservasListado()
      const reservas = response.data

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const userReservations = reservas.filter((reserva) => {
        const reservaDate = new Date(reserva.fechaReserva)
        reservaDate.setHours(0, 0, 0, 0)

        return (
          reserva.iD_Usuario === user.iD_Usuario &&
          reserva.iD_Comercio === comercio.iD_Comercio &&
          reserva.estado === true && // Approved reservation
          reservaDate.getTime() === today.getTime()
        )
      })

      console.log("📅 Reservas activas encontradas:", userReservations.length)
      return userReservations.length > 0
    } catch (error) {
      console.error("❌ Error checking active reservation:", error)
      return false
    }
  }

  const checkAnyReservation = async () => {
    try {
      const response = await Apis.obtenerReservasListado()
      const reservas = response.data

      const userReservations = reservas.filter(
        (reserva) =>
          reserva.iD_Usuario === user.iD_Usuario &&
          reserva.iD_Comercio === comercio.iD_Comercio &&
          reserva.estado === true, // Approved reservation
      )

      console.log("📅 Reservas totales encontradas:", userReservations.length)
      return userReservations.length > 0
    } catch (error) {
      console.error("❌ Error checking reservations:", error)
      return false
    }
  }

  const checkReviewCooldown = async () => {
    try {
      const response = await Apis.obtenerResenias()
      const resenias = response.data

      const userReviews = resenias.filter(
        (resenia) => resenia.iD_Usuario === user.iD_Usuario && resenia.iD_Comercio === comercio.iD_Comercio,
      )

      if (userReviews.length === 0) {
        return true // No previous reviews, can review
      }

      const lastReview = userReviews.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))[0]

      const lastReviewDate = new Date(lastReview.fechaCreacion)
      const today = new Date()
      const daysDifference = Math.floor((today - lastReviewDate) / (1000 * 60 * 60 * 24))

      console.log("📆 Días desde última reseña:", daysDifference)
      return daysDifference >= 7
    } catch (error) {
      console.error("❌ Error checking review cooldown:", error)
      return false
    }
  }

  const handleSubmit = async () => {
    if (!comentario.trim()) {
      Alert.alert("Error", "Por favor escribe un comentario")
      return
    }
 if (puntuacion === 0) {
      Alert.alert("Error", "Por favor selecciona una puntuación")
      return
    }
    if (!canReview) {
      Alert.alert("No permitido", validationMessage)
      return
    }

    try {
      setIsLoading(true)

      const reseniaData = {
        comentario: comentario.trim(),
        estado: false,
        fechaCreacion: new Date().toISOString(),
        iD_Usuario: user.iD_Usuario,
        iD_Comercio: comercio.iD_Comercio,
        puntuacion: puntuacion,
      }

      await Apis.crearResenia(reseniaData)

      Alert.alert("Éxito", "Tu reseña ha sido enviada y está pendiente de aprobación por el administrador.", [
        {
          text: "OK",
          onPress: () => {
            setComentario("")
            setPuntuacion(0)
            onClose()
          },
        },
      ])
    } catch (error) {
       const errorMessage = error.response?.data
      const isControlledError = errorMessage && typeof errorMessage === 'string' && (
        errorMessage.includes("inactivo") || 
        errorMessage.includes("desactivado") ||
        errorMessage.includes("reserva aprobada") ||
        errorMessage.includes("sin reserva") ||
        errorMessage.includes("ya existe") ||
        errorMessage.includes("reseña pendiente") ||
        errorMessage.includes("reseña aprobada") ||
        errorMessage.includes("reserva")
      )

      if (!isControlledError) {
        console.error("❌ Error al crear reseña:", error)
      }

      if (error.response?.status === 400) {
        // Usuario inactivo o desactivado
        
        // Usuario inactivo o desactivado
        if (errorMessage?.includes("inactivo") || errorMessage?.includes("desactivado")) {
          Alert.alert(
            "Cuenta Desactivada",
            "Tu cuenta ha sido desactivada. Por favor, contacta al administrador o solicita la reactivación desde tu perfil para poder dejar reseñas.",
            [{ text: "Entendido" }]
          )
        }
        // No tiene reserva aprobada
        else if (errorMessage?.includes("reserva aprobada") || errorMessage?.includes("sin reserva")) {
          Alert.alert(
            "Reserva Requerida",
            "No puedes dejar una reseña sin tener una reserva aprobada en este comercio. Por favor, realiza una reserva primero y espera a que sea aprobada.",
            [{ text: "Entendido" }]
          )
        }
        // Ya existe una reseña aprobada o pendiente
        else if (errorMessage?.includes("ya existe") || errorMessage?.includes("reseña pendiente") || errorMessage?.includes("reseña aprobada")) {
          Alert.alert(
            "Reseña Duplicada",
            "Ya tienes una reseña aprobada o pendiente para este comercio. Solo puedes crear una nueva reseña si la anterior fue rechazada.",
            [{ text: "Entendido" }]
          )
        }
        // Error genérico de reserva
        else if (errorMessage?.includes("reserva")) {
          Alert.alert(
            "Reserva Requerida",
            "No puedes dejar una reseña sin tener una reserva en este comercio. Por favor, realiza una reserva primero.",
            [{ text: "Entendido" }]
          )
        }
        // Error genérico de validación
        else {
          Alert.alert(
            "Error de Validación",
            errorMessage || "No se pudo crear la reseña. Verifica los datos ingresados.",
            [{ text: "Entendido" }]
          )
        }
      } else if (error.response?.status === 404) {
        Alert.alert(
          "Error",
          "No se encontró el usuario o el comercio. Por favor, intenta nuevamente.",
          [{ text: "Entendido" }]
        )
      } else {
        Alert.alert(
          "Error",
          "No se pudo crear la reseña. Intenta nuevamente más tarde.",
          [{ text: "Entendido" }]
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={styles.starsLabel}>Tu puntuación:</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setPuntuacion(star)} activeOpacity={0.7} disabled={isLoading}>
              <AntDesign
                name={star <= puntuacion ? "star" : "staro"}
                size={40}
                color={star <= puntuacion ? "#ffd700" : "#555"}
                style={styles.starIcon}
              />
            </TouchableOpacity>
          ))}
        </View>
        {puntuacion > 0 && (
          <Text style={styles.ratingText}>
            {puntuacion === 1 && "😞 Muy malo"}
            {puntuacion === 2 && "😕 Malo"}
            {puntuacion === 3 && "😐 Regular"}
            {puntuacion === 4 && "😊 Bueno"}
            {puntuacion === 5 && "😍 Excelente"}
          </Text>
        )}
      </View>
    )
  }
  if (!visible) return null

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <AntDesign name="close" size={24} color="#eb4aeba2" />
          </TouchableOpacity>

          <Text style={styles.title}>Dejar Reseña</Text>
          <Text style={styles.commerceName}>{comercio.nombre}</Text>

          {isValidating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5c288c" />
              <Text style={styles.loadingText}>Validando...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={[styles.validationBox, canReview ? styles.validationSuccess : styles.validationError]}>
                <Text style={styles.validationText}>{validationMessage}</Text>
              </View>

              {canReview && (
                <>
                {renderStars()}
                  <Text style={styles.label}>Tu comentario:</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Escribe tu experiencia en este lugar..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                    value={comentario}
                    onChangeText={setComentario}
                    maxLength={500}
                    editable={!isLoading}
                  />
                  <Text style={styles.charCount}>{comentario.length}/500 caracteres</Text>

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.submitButtonText}>Enviar Reseña</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.noteText}>
                    Nota: Tu reseña será revisada por un administrador antes de ser publicada.
                  </Text>
                </>
              )}
              {!canReview && !isValidating && (
                <View style={styles.noReviewContainer}>
                  <Text style={styles.noReviewText}>
                    {comercio.iD_TipoComercio === 1
                      ? "💡 Necesitas una reserva aprobada para hoy en este bar para dejar una reseña."
                      : "💡 Realiza una reserva primero para poder compartir tu experiencia."}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
   centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "#1a1a2e", // Dark background instead of white
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#9d4edd", // Purple shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1, // Added border
    borderColor: "rgba(157, 78, 221, 0.3)", // Purple border
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 1000,
    padding: 5,
    backgroundColor: "#16213e", // Dark background for close button
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 0, 255, 0.5)", // Fuchsia border
  },
  scrollView: {
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#9d4edd", // Purple color instead of dark purple
  },
  commerceName: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    color: "#e0e0e0", // Light gray instead of dark gray
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#b0b0b0", // Light gray instead of dark gray
  },
  validationBox: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  validationSuccess: {
    backgroundColor: "rgba(76, 175, 80, 0.2)", // Dark green with transparency
    borderColor: "#4caf50", // Bright green border
  },
  validationError: {
    backgroundColor: "rgba(244, 67, 54, 0.2)", // Dark red with transparency
    borderColor: "#f44336", // Bright red border
  },
  validationText: {
    fontSize: 14,
    textAlign: "center",
    color: "#ffffff", // White text
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#e0e0e0", // Light gray instead of dark
  },
  textArea: {
    borderWidth: 1,
    borderColor: "rgba(157, 78, 221, 0.5)", // Purple border
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 120,
    backgroundColor: "rgba(22, 33, 62, 0.5)", // Dark semi-transparent background
    color: "#ffffff", // White text
    shadowColor: "#9d4edd", // Purple shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  charCount: {
    textAlign: "right",
    fontSize: 12,
    color: "#b0b0b0", // Light gray instead of dark gray
    marginTop: 5,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#7b2cbf", // Brighter purple
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1, // Added border
    borderColor: "#9d4edd", // Purple border
    shadowColor: "#9d4edd", // Purple shadow
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: "#3a3a4a", // Dark gray instead of light gray
    borderColor: "#555", // Darker border
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  noteText: {
    fontSize: 12,
    color: "#b0b0b0", // Light gray instead of dark gray
    textAlign: "center",
    fontStyle: "italic",
  },
  noReviewContainer: {
    backgroundColor: "rgba(255, 152, 0, 0.2)",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.5)",
  },
  noReviewText: {
    fontSize: 14,
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 20,
  },
  starsContainer: {
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "rgba(157, 78, 221, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(157, 78, 221, 0.3)",
  },
  starsLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e0e0e0",
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  ratingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#ffd700",
  },
})

export default ReviewModal
