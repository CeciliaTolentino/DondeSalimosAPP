import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import Apis from "../../Apis/Apis"

export default function PublicidadModal({
  visible,
  onClose,
  comercio,
  publicidadToEdit = null,
  isEditingRejectedPaid = false,
  isRejectedUnpaid = false,
}) {
  const [selectedDuration, setSelectedDuration] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [descripcion, setDescripcion] = useState("")

  // PRECIOS UNIFICADOS PARA PRUEBAS (valores bajos)
  const durations = [
    { id: "1semana", label: "1 Semana", price: 100, days: 7, timeSpan: "7:00:00.000" },
    { id: "15dias", label: "15 Días", price: 150, days: 15, timeSpan: "15:00:00.000" },
    { id: "1mes", label: "1 Mes", price: 200, days: 30, timeSpan: "23:00:00.000" },
  ]

  useEffect(() => {
    if (publicidadToEdit) {
      setDescripcion(publicidadToEdit.descripcion || "")

      const imageData = publicidadToEdit.imagen || publicidadToEdit.foto
      if (imageData) {
        setImageBase64(imageData)
        if (imageData.startsWith("data:image")) {
          setSelectedImage(imageData)
        } else {
          setSelectedImage(`data:image/jpeg;base64,${imageData}`)
        }
      }

      // Determinar duración desde el campo tiempo
      const tiempo = publicidadToEdit.tiempo
      if (tiempo === "1 semana" || tiempo?.includes("7:00:00")) setSelectedDuration(durations[0])
      else if (tiempo === "15 dias" || tiempo?.includes("15:00:00")) setSelectedDuration(durations[1])
      else if (tiempo === "1 mes" || tiempo?.includes("23:00:00")) setSelectedDuration(durations[2])

      if ((isEditingRejectedPaid || isRejectedUnpaid) && selectedDuration === null) {
        const matchedDuration = durations.find(
          (d) => publicidadToEdit.tiempo?.includes(d.timeSpan) || publicidadToEdit.tiempo === d.label
        )
        if (matchedDuration) setSelectedDuration(matchedDuration)
      }
    } else {
      // Reset para nueva publicidad
      setSelectedDuration(null)
      setSelectedImage(null)
      setImageBase64(null)
      setDescripcion("")
    }
  }, [publicidadToEdit, visible, isEditingRejectedPaid, isRejectedUnpaid])

  const convertImageToBase64 = async (imageUri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      return base64
    } catch (error) {
      console.error("Error al convertir imagen a base64:", error)
      return null
    }
  }

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      })

      if (!result.cancelled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri
        setSelectedImage(imageUri)

        const base64 = await convertImageToBase64(imageUri)
        if (base64) {
          setImageBase64(base64)
        } else {
          Alert.alert("Error", "No se pudo procesar la imagen.")
        }
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error)
      Alert.alert("Error", "No se pudo seleccionar la imagen.")
    }
  }

  const openMercadoPagoCheckout = async (checkoutUrl, publicidadId) => {
    console.log("[PublicidadModal] Abriendo checkout de MercadoPago:", checkoutUrl)

    try {
      const supported = await Linking.canOpenURL(checkoutUrl)

      if (supported) {
        // Abrir MercadoPago
        await Linking.openURL(checkoutUrl)

        // Mostrar instrucciones al usuario
        Alert.alert(
          "Redirigido a Mercado Pago",
          "Completa el pago en Mercado Pago. Una vez finalizado, regresa a la app y tu publicidad será activada automáticamente.\n\n" +
            "Si ya completaste el pago, presiona 'Verificar Pago' o espera unos segundos.",
          [
            {
              text: "Entendido",
              onPress: () => {
                console.log("[PublicidadModal] Usuario cerró el alert")
                onClose()
              },
            },
          ]
        )
      } else {
        Alert.alert("Error", "No se pudo abrir el link de pago de Mercado Pago.")
      }
    } catch (error) {
      console.error("[PublicidadModal] Error abriendo checkout:", error)
      Alert.alert("Error", "No se pudo abrir Mercado Pago. Intenta nuevamente.")
    }
  }

  const handleConfirm = async () => {
    if (!isEditingRejectedPaid && !isRejectedUnpaid && !selectedDuration) {
      Alert.alert("Error", "Por favor selecciona una duración para la publicidad.")
      return
    }

    if (!imageBase64) {
      Alert.alert("Error", "Por favor selecciona una imagen para la publicidad.")
      return
    }

    if (!comercio) {
      console.log("ERROR: comercio is null or undefined:", comercio)
      Alert.alert("Error", "No se pudo identificar el comercio.")
      return
    }

    setIsLoading(true)

    try {
      // CASO 1: Publicidad rechazada NO pagada - actualizar y pagar
      if (isRejectedUnpaid && publicidadToEdit) {
        console.log("[PublicidadModal] Actualizando publicidad rechazada no pagada...")

        const updateResponse = await Apis.actualizarPublicidad(publicidadToEdit.iD_Publicidad, {
          descripcion: descripcion || publicidadToEdit.descripcion,
          visualizaciones: publicidadToEdit.visualizaciones || 0,
          tiempo: selectedDuration.timeSpan,
          estado: false,
          fechaCreacion: publicidadToEdit.fechaCreacion,
          iD_Comercio: publicidadToEdit.iD_Comercio,
          iD_TipoComercio: publicidadToEdit.iD_TipoComercio,
          foto: imageBase64,
          pago: false,
          motivoRechazo: null,
        })

        if (updateResponse.status === 200 || updateResponse.status === 204) {
          // Generar link de pago
          const preferenciaResponse = await Apis.crearPreferenciaPago({
            titulo: `Publicidad ${selectedDuration.label} - ${comercio.nombre}`,
            precio: selectedDuration.price,
            publicidadId: publicidadToEdit.iD_Publicidad,
          })

          if (preferenciaResponse.data?.init_point) {
            setIsLoading(false)
            await openMercadoPagoCheckout(
              preferenciaResponse.data.init_point,
              publicidadToEdit.iD_Publicidad
            )
          } else {
            throw new Error("No se pudo generar el link de pago")
          }
        } else {
          throw new Error("No se pudo actualizar la publicidad")
        }
        return
      }

      // CASO 2: Publicidad rechazada YA pagada - solo actualizar imagen
      if (isEditingRejectedPaid && publicidadToEdit) {
        console.log("[PublicidadModal] Actualizando publicidad rechazada pagada...")

        const updateResponse = await Apis.actualizarPublicidadRechazadaPagada(
          publicidadToEdit.iD_Publicidad,
          imageBase64
        )

        if (updateResponse.status === 200 || updateResponse.status === 204) {
          Alert.alert(
            "Publicidad Actualizada",
            "Tu publicidad ha sido enviada nuevamente para revisión del administrador.",
            [{ text: "Entendido", onPress: () => onClose() }]
          )
        } else {
          throw new Error("No se pudo actualizar la publicidad")
        }

        setIsLoading(false)
        return
      }

      // CASO 3: Renovar publicidad existente
      if (publicidadToEdit && !isRejectedUnpaid && !isEditingRejectedPaid) {
        console.log("[PublicidadModal] Renovando publicidad existente...")

        const preferenciaResponse = await Apis.crearPreferenciaPago({
          titulo: `Publicidad ${selectedDuration.label} - ${comercio.nombre}`,
          precio: selectedDuration.price,
          publicidadId: publicidadToEdit.iD_Publicidad,
        })

        if (preferenciaResponse.data?.init_point) {
          setIsLoading(false)
          await openMercadoPagoCheckout(
            preferenciaResponse.data.init_point,
            publicidadToEdit.iD_Publicidad
          )
        } else {
          throw new Error("No se pudo crear la preferencia de pago")
        }
        return
      }

      // CASO 4: Nueva publicidad
      console.log("[PublicidadModal] Creando nueva publicidad...")

      const fechaCreacion = new Date()
      const fechaExpiracion = new Date(fechaCreacion)
      fechaExpiracion.setDate(fechaExpiracion.getDate() + selectedDuration.days)

      const publicidadData = {
        descripcion: descripcion || "Publicidad de " + comercio.nombre,
        foto: imageBase64,
        visualizaciones: 0,
        tiempo: selectedDuration.timeSpan,
        estado: false,
        fechaCreacion: fechaCreacion.toISOString(),
        fechaExpiracion: fechaExpiracion.toISOString(),
        iD_Comercio: comercio.iD_Comercio,
        iD_TipoComercio: comercio.iD_TipoComercio,
        precio: selectedDuration.price,
      }

      const createResponse = await Apis.crearPublicidad(publicidadData)

      if (createResponse.status === 200 || createResponse.status === 201) {
        const publicidadId = createResponse.data.id || createResponse.data.iD_Publicidad
        console.log("[PublicidadModal] Publicidad creada con ID:", publicidadId)

        // Crear preferencia de pago
        const preferenciaResponse = await Apis.crearPreferenciaPago({
          titulo: `Publicidad ${selectedDuration.label} - ${comercio.nombre}`,
          precio: selectedDuration.price,
          publicidadId: publicidadId,
        })

        if (preferenciaResponse.data?.init_point) {
          setIsLoading(false)
          await openMercadoPagoCheckout(preferenciaResponse.data.init_point, publicidadId)
        } else {
          throw new Error("No se pudo crear la preferencia de pago")
        }
      }
    } catch (error) {
      console.error("[PublicidadModal] Error al procesar publicidad:", error)
      Alert.alert(
        "Error",
        error.response?.data?.message || "No se pudo procesar la publicidad. Por favor intenta nuevamente."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AntDesign name="close" size={24} color="black" />
          </TouchableOpacity>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {isEditingRejectedPaid
                ? "Actualizar Publicidad Rechazada"
                : isRejectedUnpaid
                ? "Editar y Pagar Publicidad"
                : publicidadToEdit
                ? "Renovar Publicidad"
                : "Nueva Publicidad"}
            </Text>
            <Text style={styles.subtitle}>{comercio?.nombre}</Text>

            {/* Selector de duración - no mostrar si es edición de rechazada pagada */}
            {!isEditingRejectedPaid && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Selecciona la duración:</Text>
                {durations.map((duration) => (
                  <TouchableOpacity
                    key={duration.id}
                    style={[
                      styles.durationCard,
                      selectedDuration?.id === duration.id && styles.durationCardSelected,
                    ]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <View style={styles.durationInfo}>
                      <Text style={styles.durationLabel}>{duration.label}</Text>
                      <Text style={styles.durationPrice}>${duration.price}</Text>
                    </View>
                    {selectedDuration?.id === duration.id && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#28a745" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Info de rechazada pagada */}
            {isEditingRejectedPaid && (
              <View style={styles.rejectedInfoBox}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
                <View style={styles.rejectedInfoText}>
                  <Text style={styles.rejectedInfoTitle}>Publicidad Rechazada</Text>
                  <Text style={styles.rejectedInfoDescription}>
                    Tu publicidad fue rechazada. Actualiza la imagen y será enviada nuevamente para
                    revisión. No necesitas pagar de nuevo.
                  </Text>
                </View>
              </View>
            )}

            {/* Info de rechazada no pagada */}
            {isRejectedUnpaid && (
              <View style={styles.rejectedInfoBox}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
                <View style={styles.rejectedInfoText}>
                  <Text style={styles.rejectedInfoTitle}>Publicidad Rechazada</Text>
                  <Text style={styles.rejectedInfoDescription}>
                    Tu publicidad fue rechazada. Edita la imagen y duración, luego completa el pago
                    para enviarla nuevamente a revisión.
                  </Text>
                </View>
              </View>
            )}

            {/* Selector de imagen */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Imagen de la publicidad:</Text>
              <TouchableOpacity style={styles.imageButton} onPress={handleImagePicker}>
                <MaterialCommunityIcons name="image-plus" size={24} color="white" />
                <Text style={styles.imageButtonText}>Seleccionar imagen</Text>
              </TouchableOpacity>
              {selectedImage && <Image source={{ uri: selectedImage }} style={styles.previewImage} />}
            </View>

            {/* Botón de confirmación */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                ((!isEditingRejectedPaid && !selectedDuration) || !imageBase64 || isLoading) &&
                  styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={(!isEditingRejectedPaid && !selectedDuration) || !imageBase64 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={24} color="white" />
                  <Text style={styles.confirmButtonText}>
                    {isEditingRejectedPaid
                      ? "Enviar para Revisión"
                      : isRejectedUnpaid
                      ? "Actualizar y Pagar"
                      : publicidadToEdit
                      ? "Renovar y Pagar"
                      : "Confirmar y Pagar"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info de pago */}
            {!publicidadToEdit && !isEditingRejectedPaid && !isRejectedUnpaid && (
              <View style={styles.paymentInfoBox}>
                <MaterialCommunityIcons name="information" size={24} color="#0066cc" />
                <View style={styles.paymentInfoText}>
                  <Text style={styles.paymentInfoTitle}>Pago seguro con Mercado Pago</Text>
                  <Text style={styles.paymentInfoDescription}>
                    Serás redirigido a Mercado Pago para completar el pago de forma segura. Podrás
                    pagar con tarjeta de crédito, débito o efectivo.
                  </Text>
                  <Text style={styles.paymentInfoNote}>
                    💡 Una vez completado el pago, regresa a la app y tu publicidad se activará
                    automáticamente.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 1,
  },
  scrollView: {
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5c288c",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  durationCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  durationCardSelected: {
    borderColor: "#28a745",
    backgroundColor: "#f0fff4",
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  durationPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5c288c",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5c288c",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  imageButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    padding: 18,
    borderRadius: 12,
    marginTop: 10,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  paymentInfoBox: {
    flexDirection: "row",
    backgroundColor: "#e6f2ff",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#0066cc",
  },
  paymentInfoText: {
    flex: 1,
    marginLeft: 10,
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0066cc",
    marginBottom: 5,
  },
  paymentInfoDescription: {
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
    marginBottom: 5,
  },
  paymentInfoNote: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
  },
  rejectedInfoBox: {
    flexDirection: "row",
    backgroundColor: "#fff5f5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  rejectedInfoText: {
    flex: 1,
    marginLeft: 10,
  },
  rejectedInfoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ff6b6b",
    marginBottom: 5,
  },
  rejectedInfoDescription: {
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
  },
})