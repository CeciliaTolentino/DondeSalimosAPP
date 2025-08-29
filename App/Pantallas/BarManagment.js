
import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import { AuthContext } from "../../AuthContext"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const ComercioCard = ({ comercio, onPress }) => {
  const convertBase64ToImage = (base64String) => {
    if (!base64String) return null
    return `data:image/jpeg;base64,${base64String}`
  }

  const getImageSource = () => {
    if (comercio.foto) {
      return { uri: convertBase64ToImage(comercio.foto) }
    }
    return require("../../assets/placeholder.jpg")
  }

  return (
    <TouchableOpacity onPress={() => onPress(comercio)} style={styles.cardContainer}>
      <Image
        source={getImageSource()}
        style={styles.cardImage}
        defaultSource={require("../../assets/placeholder.jpg")}
      />
      <View style={styles.cardInfoContainer}>
        <Text numberOfLines={2} style={styles.cardName}>
          {comercio.nombre}
        </Text>
        <Text numberOfLines={2} style={styles.cardAddress}>
          {comercio.direccion}
        </Text>
        <View style={styles.cardTypeContainer}>
          <Text style={styles.cardType}>{comercio.tipoComercio?.descripcion || "Comercio"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function BarManagement() {
  const { user, isAuthenticated, isBarOwner } = useContext(AuthContext)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedComercio, setSelectedComercio] = useState(null)
  const [comerciosList, setComerciosList] = useState([])

  // Estados para los campos editables
  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [capacidad, setCapacidad] = useState("")
  const [mesas, setMesas] = useState("")
  const [generoMusical, setGeneroMusical] = useState("")
  const [openingHours, setOpeningHours] = useState("")
  const [closingHours, setClosingHours] = useState("")
  const [businessImage, setBusinessImage] = useState(null)
  const [businessImageBase64, setBusinessImageBase64] = useState(null)
  const [advertisingImage, setAdvertisingImage] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserAccess()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  // Función para convertir imagen a base64
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

  // Función para convertir base64 a URI de imagen
  const convertBase64ToImage = (base64String) => {
    if (!base64String) return null
    return `data:image/jpeg;base64,${base64String}`
  }

  // Función para formatear hora de HH:MM a HH:MM:SS
  const formatTimeWithSeconds = (timeString) => {
    if (!timeString) return ""
    if (timeString.includes(":") && timeString.split(":").length === 3) {
      return timeString
    }
    if (timeString.includes(":") && timeString.split(":").length === 2) {
      return `${timeString}:00`
    }
    return timeString
  }

  // Función para formatear hora de HH:MM:SS a HH:MM para mostrar
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return ""
    const parts = timeString.split(":")
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return timeString
  }

  const checkUserAccess = async () => {
    try {
      if (!isBarOwner || user.iD_RolUsuario !== 3) {
        setIsLoading(false)
        return
      }
      await loadComerciosList()
    } catch (error) {
      console.error("Error al verificar acceso:", error)
      setIsLoading(false)
    }
  }

  const loadComerciosList = async () => {
    try {
      console.log("Buscando comercios para usuario:", user.iD_Usuario)

      const response = await fetch(`${API_BASE_URL}/api/comercios/listado`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const comercios = await response.json()
        const userComercios = comercios.filter((comercio) => comercio.iD_Usuario === user.iD_Usuario)

        console.log("Comercios encontrados:", userComercios)
        setComerciosList(userComercios)
      } else {
        setComerciosList([])
      }
    } catch (error) {
      console.error("Error al cargar comercios:", error)
      setComerciosList([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleComercioPress = (comercio) => {
    setSelectedComercio(comercio)
    setModalVisible(true)
    // Cargar datos para edición
    setNombre(comercio.nombre || "")
    setDireccion(comercio.direccion || "")
    setCapacidad(comercio.capacidad?.toString() || "")
    setMesas(comercio.mesas?.toString() || "")
    setGeneroMusical(comercio.generoMusical || "")
    setOpeningHours(formatTimeForDisplay(comercio.hora_ingreso || ""))
    setClosingHours(formatTimeForDisplay(comercio.hora_cierre || ""))

    if (comercio.foto) {
      const imageUri = convertBase64ToImage(comercio.foto)
      setBusinessImage(imageUri)
      setBusinessImageBase64(comercio.foto)
    } else {
      setBusinessImage(null)
      setBusinessImageBase64(null)
    }

    setAdvertisingImage(comercio.imagenPublicidad)
  }

  const handleImagePicker = async (setImageFunction, imageType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.cancelled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri
        setImageFunction(imageUri)

        if (imageType === "businessImage") {
          const base64 = await convertImageToBase64(imageUri)
          if (base64) {
            setBusinessImageBase64(base64)
            console.log("Imagen convertida a base64 exitosamente")
          } else {
            Alert.alert("Error", "No se pudo procesar la imagen.")
          }
        }
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error)
      Alert.alert("Error", "No se pudo seleccionar la imagen.")
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (selectedComercio) {
      setNombre(selectedComercio.nombre || "")
      setDireccion(selectedComercio.direccion || "")
      setCapacidad(selectedComercio.capacidad?.toString() || "")
      setMesas(selectedComercio.mesas?.toString() || "")
      setGeneroMusical(selectedComercio.generoMusical || "")
      setOpeningHours(formatTimeForDisplay(selectedComercio.hora_ingreso || ""))
      setClosingHours(formatTimeForDisplay(selectedComercio.hora_cierre || ""))

      if (selectedComercio.foto) {
        const imageUri = convertBase64ToImage(selectedComercio.foto)
        setBusinessImage(imageUri)
        setBusinessImageBase64(selectedComercio.foto)
      } else {
        setBusinessImage(null)
        setBusinessImageBase64(null)
      }

      setAdvertisingImage(selectedComercio.imagenPublicidad)
    }
    setIsEditing(false)
  }

  const validateTimeFormat = (timeString) => {
    if (!timeString) return true
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(timeString)
  }

  const handleSave = async () => {
    if (!nombre.trim() || !direccion.trim()) {
      Alert.alert("Error", "El nombre y la dirección son obligatorios.")
      return
    }

    if (openingHours && !validateTimeFormat(openingHours)) {
      Alert.alert("Error", "El horario de apertura debe tener el formato HH:MM (ej: 18:00)")
      return
    }

    if (closingHours && !validateTimeFormat(closingHours)) {
      Alert.alert("Error", "El horario de cierre debe tener el formato HH:MM (ej: 02:00)")
      return
    }

    setIsSaving(true)
    try {
      const updatedComercio = {
        iD_Comercio: selectedComercio.iD_Comercio,
        nombre: nombre.trim(),
        capacidad: Number.parseInt(capacidad) || 0,
        mesas: Number.parseInt(mesas) || 0,
        generoMusical: generoMusical.trim(),
        tipoDocumento: selectedComercio.tipoDocumento,
        nroDocumento: selectedComercio.nroDocumento,
        direccion: direccion.trim(),
        correo: selectedComercio.correo,
        telefono: selectedComercio.telefono,
        estado: selectedComercio.estado,
        fechaCreacion: selectedComercio.fechaCreacion,
        hora_ingreso: formatTimeWithSeconds(openingHours),
        hora_cierre: formatTimeWithSeconds(closingHours),
        foto: businessImageBase64 || "",
        iD_Usuario: selectedComercio.iD_Usuario,
        iD_TipoComercio: selectedComercio.iD_TipoComercio,
        usuario: selectedComercio.usuario || null,
        tipoComercio: selectedComercio.tipoComercio || null,
      }

      console.log("Actualizando comercio:", {
        ...updatedComercio,
        foto: updatedComercio.foto ? `[Base64 string of length: ${updatedComercio.foto.length}]` : "No image",
      })

      const response = await fetch(`${API_BASE_URL}/api/comercios/actualizar/${selectedComercio.iD_Comercio}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedComercio),
      })

      if (response.ok) {
        Alert.alert("Éxito", "La información del comercio ha sido actualizada.")
        await loadComerciosList()
        setIsEditing(false)

        if (advertisingImage) {
          Alert.alert(
            "Pago de Publicidad",
            "Su evento aparecerá en las historias por diez días al precio de $1000 pesos. Será redirigido a MercadoPago para realizar el pago.",
            [{ text: "OK", onPress: () => console.log("Redirigiendo a MercadoPago...") }],
          )
        }
      } else {
        const errorText = await response.text()
        console.error("Error al actualizar:", errorText)
        throw new Error("Error al actualizar comercio")
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      Alert.alert("Error", "No se pudo guardar la información.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateNewComercio = () => {
    Alert.alert("Crear Nuevo Comercio", "¿Desea crear un nuevo comercio? Será redirigido al formulario de registro.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Crear",
        onPress: () => {
          Alert.alert("Funcionalidad", "Redirigir a formulario de creación de comercio")
        },
      },
    ])
  }

  const handleDeleteComercio = () => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Está seguro que desea eliminar el comercio "${selectedComercio.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/comercios/${selectedComercio.iD_Comercio}`, {
                method: "DELETE",
              })

              if (response.ok) {
                Alert.alert("Comercio eliminado", "Su comercio ha sido eliminado exitosamente.")
                setModalVisible(false)
                await loadComerciosList()
              } else {
                throw new Error("Error al eliminar comercio")
              }
            } catch (error) {
              console.error("Error al eliminar:", error)
              Alert.alert("Error", "No se pudo eliminar el comercio.")
            }
          },
        },
      ],
    )
  }

  const renderComercioDetails = () => {
    if (!selectedComercio) return null

    const getImageSource = () => {
      if (businessImage) {
        return { uri: businessImage }
      }
      if (selectedComercio.foto) {
        return { uri: convertBase64ToImage(selectedComercio.foto) }
      }
      return require("../../assets/placeholder.jpg")
    }

    return (
      <ScrollView style={styles.modalScrollView}>
        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
          <AntDesign name="close" size={24} color="black" />
        </TouchableOpacity>

        {!isEditing ? (
          // Vista de solo lectura
          <>
            <Text numberOfLines={2} style={styles.modalTitle}>
              {selectedComercio.nombre}
            </Text>

            <Image
              source={getImageSource()}
              style={styles.modalImage}
              defaultSource={require("../../assets/placeholder.jpg")}
            />

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>📍 {selectedComercio.direccion}</Text>
              <Text style={styles.infoText}>👥 Capacidad: {selectedComercio.capacidad || "No especificada"}</Text>
              <Text style={styles.infoText}>
                🕐 {formatTimeForDisplay(selectedComercio.hora_ingreso) || "No especificado"} -{" "}
                {formatTimeForDisplay(selectedComercio.hora_cierre) || "No especificado"}
              </Text>
              {selectedComercio.generoMusical && <Text style={styles.hashtag}>#{selectedComercio.generoMusical}</Text>}
            </View>

            {advertisingImage && (
              <View style={styles.advertisingContainer}>
                <Text style={styles.advertisingTitle}>Imagen de Publicidad</Text>
                <Image source={{ uri: advertisingImage }} style={styles.advertisingImage} />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <MaterialCommunityIcons name="pencil" size={20} color="white" />
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteComercio}>
                <MaterialCommunityIcons name="delete" size={20} color="white" />
                <Text style={styles.buttonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Vista de edición
          <>
            <Text style={styles.modalTitle}>Editar Comercio</Text>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Nombre del comercio *</Text>
              <TextInput
                style={styles.editInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre del comercio"
              />

              <Text style={styles.editLabel}>Dirección *</Text>
              <TextInput
                style={styles.editInput}
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Dirección"
              />

              <Text style={styles.editLabel}>Capacidad</Text>
              <TextInput
                style={styles.editInput}
                value={capacidad}
                onChangeText={setCapacidad}
                placeholder="Capacidad máxima"
                keyboardType="numeric"
              />

              <Text style={styles.editLabel}>Número de mesas</Text>
              <TextInput
                style={styles.editInput}
                value={mesas}
                onChangeText={setMesas}
                placeholder="Cantidad de mesas"
                keyboardType="numeric"
              />

              <Text style={styles.editLabel}>Género musical</Text>
              <TextInput
                style={styles.editInput}
                value={generoMusical}
                onChangeText={setGeneroMusical}
                placeholder="Género musical"
              />

              <Text style={styles.editLabel}>Horario de apertura</Text>
              <TextInput
                style={styles.editInput}
                value={openingHours}
                onChangeText={setOpeningHours}
                placeholder="ej: 18:00"
                maxLength={5}
              />

              <Text style={styles.editLabel}>Horario de cierre</Text>
              <TextInput
                style={styles.editInput}
                value={closingHours}
                onChangeText={setClosingHours}
                placeholder="ej: 02:00"
                maxLength={5}
              />

              <Text style={styles.editLabel}>Imagen del negocio</Text>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => handleImagePicker(setBusinessImage, "businessImage")}
              >
                <Text style={styles.imageButtonText}>Seleccionar imagen</Text>
              </TouchableOpacity>
              {businessImage && <Image source={{ uri: businessImage }} style={styles.previewImage} />}

              <Text style={styles.editLabel}>Imagen de publicidad</Text>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => handleImagePicker(setAdvertisingImage, "advertisingImage")}
              >
                <Text style={styles.imageButtonText}>Seleccionar imagen de publicidad</Text>
              </TouchableOpacity>
              {advertisingImage && <Image source={{ uri: advertisingImage }} style={styles.previewImage} />}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="white" />
                <Text style={styles.buttonText}>{isSaving ? "Guardando..." : "Guardar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                <MaterialCommunityIcons name="close" size={20} color="white" />
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    )
  }

  // Verificaciones de acceso
  if (!isAuthenticated) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Debe iniciar sesión para acceder a esta sección.</Text>
      </View>
    )
  }

  if (!isBarOwner || user.iD_RolUsuario !== 3) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No tiene permisos para acceder a esta sección.</Text>
        <Text style={styles.errorSubText}>Solo los dueños de bares pueden gestionar esta información.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5c288c" />
        <Text style={styles.loadingText}>Cargando comercios...</Text>
      </View>
    )
  }

  const approvedComercios = comerciosList.filter((comercio) => comercio.estado === true)
  const pendingComercios = comerciosList.filter((comercio) => comercio.estado === false)

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Mis Comercios</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNewComercio}>
          <MaterialCommunityIcons name="plus" size={20} color="white" />
          <Text style={styles.createButtonText}>Crear Nuevo</Text>
        </TouchableOpacity>
      </View>

      {pendingComercios.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>⏳ Pendientes de Aprobación ({pendingComercios.length})</Text>
          <FlatList
            data={pendingComercios}
            renderItem={({ item }) => (
              <View style={styles.pendingCard}>
                <Text style={styles.pendingCardName}>{item.nombre}</Text>
                <Text style={styles.pendingCardStatus}>En revisión</Text>
              </View>
            )}
            keyExtractor={(item) => item.iD_Comercio.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {approvedComercios.length > 0 ? (
        <View style={styles.approvedSection}>
          <Text style={styles.sectionTitle}>✅ Comercios Aprobados ({approvedComercios.length})</Text>
          <FlatList
            data={approvedComercios}
            renderItem={({ item }) => <ComercioCard comercio={item} onPress={handleComercioPress} />}
            keyExtractor={(item) => item.iD_Comercio.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏪</Text>
          <Text style={styles.emptyTitle}>No tienes comercios aprobados</Text>
          <Text style={styles.emptySubtitle}>Crea tu primer comercio para comenzar</Text>
        </View>
      )}

      {/* Modal de detalles del comercio */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>{renderComercioDetails()}</View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5c288c",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  pendingSection: {
    padding: 20,
  },
  pendingCard: {
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
    minWidth: 150,
  },
  pendingCardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
  },
  pendingCardStatus: {
    fontSize: 14,
    color: "#856404",
    fontStyle: "italic",
  },
  approvedSection: {
    flex: 1,
    padding: 20,
  },
  row: {
    justifyContent: "space-between",
  },
  cardContainer: {
    backgroundColor: "#5c288c",
    borderRadius: 15,
    marginBottom: 15,
    padding: 10,
    width: "48%",
  },
  cardImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardInfoContainer: {
    paddingHorizontal: 5,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  cardAddress: {
    fontSize: 12,
    color: "#CCCCCC",
    marginBottom: 5,
  },
  cardTypeContainer: {
    alignSelf: "flex-start",
  },
  cardType: {
    fontSize: 12,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  // Modal styles
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
  modalScrollView: {
    width: "100%",
  },
  closeButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#5c288c",
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
  },
  infoContainer: {
    width: "100%",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  hashtag: {
    fontSize: 16,
    color: "#5c288c",
    fontWeight: "bold",
    marginTop: 5,
  },
  advertisingContainer: {
    width: "100%",
    marginBottom: 20,
  },
  advertisingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#5c288c",
  },
  advertisingImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc3545",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Edit form styles
  editSection: {
    width: "100%",
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    marginTop: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: "#e0e0e0",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  imageButtonText: {
    fontSize: 16,
    color: "#333",
  },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 18,
    color: "#5c288c",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  errorSubText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
})
