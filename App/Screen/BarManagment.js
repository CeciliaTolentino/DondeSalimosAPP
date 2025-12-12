import { useState, useEffect, useContext,  useRef } from "react"
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
  Linking,
  FlatList,
} from "react-native"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { AuthContext } from "../../Apis/AuthContext"
import Apis from "../../Apis/Apis"
import { validateCUIT, formatCUIT } from "../../utils/cuitValidator"
import PublicidadModal from "../../Components/advertising/publicidadModal"
import { Picker } from "@react-native-picker/picker"

const PUBLICIDADES_CACHE_DURATION = 30 * 1000 // 30 segundos de caché

const ComercioCard = ({ comercio, onPress }) => {
  const convertBase64ToImage = (base64String) => {
    if (!base64String) return null
    if (base64String.startsWith("data:image")) {
      return base64String
    }
    return `data:image/jpeg;base64,${base64String}`
  }

  const getImageSource = () => {
    if (comercio.foto) {
      const imageUri = convertBase64ToImage(comercio.foto)
      return { uri: imageUri }
    }
    return require("../../assets/placeholder.jpg")
  }

  const isApproved = comercio.estado === true
  return (
    <TouchableOpacity onPress={() => onPress(comercio)} style={styles.cardContainer}>
      <Image
        source={getImageSource()}
        style={styles.cardImage}
        defaultSource={require("../../assets/placeholder.jpg")}
      />
      {isApproved && (
        <View style={styles.approvedBadge}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
        </View>
      )}
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

const BarManagement = () => {
  const {
    user,
    isAuthenticated,
    isBarOwner,
    pendingPaymentNavigation,
    clearPendingPaymentNavigation,
    savePendingPayment,
    clearPendingPayment,
  } = useContext(AuthContext)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [selectedComercio, setSelectedComercio] = useState(null)
  const [comerciosList, setComerciosList] = useState([])
  const [publicidadModalVisible, setPublicidadModalVisible] = useState(false)
  const [publicidadesList, setPublicidadesList] = useState([])
  const [selectedPublicidad, setSelectedPublicidad] = useState(null)

  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [capacidad, setCapacidad] = useState("")
  const [mesas, setMesas] = useState("")
  const [generoMusical, setGeneroMusical] = useState("")
  const [openingHours, setOpeningHours] = useState("")
  const [closingHours, setClosingHours] = useState("")
  const [businessImage, setBusinessImage] = useState(null)
  const [businessImageBase64, setBusinessImageBase64] = useState(null)

  const [newComercioData, setNewComercioData] = useState({
    ID_TipoComercio: 1,
    Nombre: "",
    Capacidad: "",
    Mesas: "",
    GeneroMusical: "",
    TipoDocumento: "CUIT",
    NroDocumento: "",
    Direccion: "",
    Correo: "",
    Telefono: "",
  })

  const [newComercioImage, setNewComercioImage] = useState(null)
  const [newComercioImageBase64, setNewComercioImageBase64] = useState(null)
  const [newComercioHoraIngreso, setNewComercioHoraIngreso] = useState("")
  const [newComercioHoraCierre, setNewComercioHoraCierre] = useState("")

  const [activeTab, setActiveTab] = useState("comercios")
  const [todasPublicidades, setTodasPublicidades] = useState([])
  const [isLoadingPublicidades, setIsLoadingPublicidades] = useState(false)

  // Refs para caché y control de carga
  const publicidadesCacheRef = useRef({ data: null, timestamp: 0 })
  const isLoadingPublicidadesRef = useRef(false)

  useEffect(() => {
    if (pendingPaymentNavigation && isAuthenticated && comerciosList.length > 0) {
      console.log("[BarManagement] Procesando pago:", pendingPaymentNavigation)

      const { status, paymentId, preferenceId, publicidadId } = pendingPaymentNavigation

      if (status === "success" && paymentId) {
        console.log("[BarManagement] Verificando pago con payment_id:", paymentId)
        Apis.verificarYActivarPago(paymentId, preferenceId)
          .then((response) => {
            if (response.data?.success) {
              setActiveTab("publicidades")
              refreshPublicidades()
              Alert.alert("¡Pago exitoso!", "Tu publicidad ha sido pagada.")
              
            }
          })
          .catch(console.error)
      } else if (status === "pending_verification" && publicidadId) {
        console.log("[BarManagement] Verificando publicidad pendiente:", publicidadId)
        Apis.obtenerPublicidadesPorId(publicidadId)
          .then((response) => {
            if (response.data?.pago === true) {
              setActiveTab("publicidades")
              refreshPublicidades()
              Alert.alert("¡Pago exitoso!", "Tu publicidad ha sido pagada.")
              
            } else {
              setActiveTab("publicidades")
              refreshPublicidades()
            }
          })
          .catch(console.error)
      } else if (status === "failure") {
        Alert.alert("Pago no completado", "El pago no pudo ser procesado.")
        setActiveTab("publicidades")
      }

      clearPendingPaymentNavigation()
      AsyncStorage.removeItem("pendingPayment").catch(console.error)
    }
  }, [pendingPaymentNavigation, isAuthenticated, comerciosList.length])

  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserAccess()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (user && user.iD_Usuario) {
      loadComerciosList()
    }
  }, [user])

  useEffect(() => {
    if (activeTab === "publicidades" && comerciosList.length > 0) {
      loadTodasPublicidades(false)
    }
  }, [activeTab, comerciosList.length])

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

  const convertBase64ToImage = (base64String) => {
    if (!base64String) return null
    if (base64String.startsWith("data:image")) {
      return base64String
    }
    return `data:image/jpeg;base64,${base64String}`
  }

  const formatTimeWithSeconds = (timeString) => {
    if (!timeString || timeString.trim() === "") return null
    if (timeString.includes(":")) {
      const parts = timeString.split(":")
      if (parts.length === 3) {
        const hours = parts[0].padStart(2, "0")
        const minutes = parts[1].padStart(2, "0")
        const seconds = parts[2].padStart(2, "0")
        return `${hours}:${minutes}:${seconds}`
      }
      if (parts.length === 2) {
        const hours = parts[0].padStart(2, "0")
        const minutes = parts[1].padStart(2, "0")
        return `${hours}:${minutes}:00`
      }
    }
    return timeString
  }

  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return ""
    const parts = timeString.split(":")
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return timeString
  }

  const formatDateDDMMYY = (date) => {
    if (!date) return "Sin fecha"
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = String(d.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  const getDiasFromTiempo = (tiempo) => {
    if (!tiempo) return 0
    const normalizedTiempo = tiempo.split(".")[0]
    const parts = normalizedTiempo.split(":")
    if (parts.length > 0) {
      return Number.parseInt(parts[0]) || 0
    }
    return 0
  }

  const getTiempoLabel = (tiempo) => {
    if (!tiempo) return "Duración desconocida"
    const normalizedTiempo = tiempo.split(".")[0]
    const parts = normalizedTiempo.split(":")
    const dias = parts.length > 0 ? Number.parseInt(parts[0]) : 0

    if (dias === 7) return "1 Semana"
    else if (dias === 15) return "15 Días"
    else if (dias >= 23 && dias <= 31) return "1 Mes"

    return tiempo
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
      const response = await Apis.obtenerComerciosListado()

      if (response.status === 200) {
        const comercios = response.data
        const userComercios = comercios.filter((comercio) => comercio.iD_Usuario === user.iD_Usuario)
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

  // Función optimizada para cargar publicidades con caché
  const loadTodasPublicidades = async (forceRefresh = false) => {
    if (isLoadingPublicidadesRef.current) {
      console.log("[BarManagement] Ya está cargando publicidades, ignorando...")
      return
    }

    const now = Date.now()
    const cacheValid =
      !forceRefresh &&
      publicidadesCacheRef.current.data &&
      now - publicidadesCacheRef.current.timestamp < PUBLICIDADES_CACHE_DURATION

    if (cacheValid) {
      console.log("[BarManagement] Usando caché de publicidades")
      setTodasPublicidades(publicidadesCacheRef.current.data)
      return
    }

    isLoadingPublicidadesRef.current = true
    setIsLoadingPublicidades(true)

    try {
      console.log("[BarManagement] Cargando publicidades del servidor...")
      const response = await Apis.obtenerPublicidadesListado()

      if (response.status === 200) {
        const allPublicidades = response.data
        const comerciosIds = comerciosList.map((c) => c.iD_Comercio)

        const userPublicidades = allPublicidades
          .filter((pub) => comerciosIds.includes(pub.iD_Comercio))
          .map((pub) => {
            const fechaCreacion = new Date(pub.fechaCreacion || pub.FechaCreacion)
            const dias = getDiasFromTiempo(pub.tiempo)
            const fechaExpiracion = new Date(fechaCreacion)
            fechaExpiracion.setDate(fechaExpiracion.getDate() + dias)

            const comercio = comerciosList.find((c) => c.iD_Comercio === pub.iD_Comercio)

            return {
              ...pub,
              fechaExpiracionCalculada: fechaExpiracion,
              nombreComercio: comercio?.nombre || "Comercio desconocido",
              isRechazada: pub.motivoRechazo && pub.motivoRechazo.trim() !== "",
            }
          })

        publicidadesCacheRef.current = {
          data: userPublicidades,
          timestamp: Date.now(),
        }

        console.log("[BarManagement] Publicidades cargadas:", userPublicidades.length)
        setTodasPublicidades(userPublicidades)
      }
    } catch (error) {
      console.error("Error al cargar publicidades:", error)
      setTodasPublicidades([])
    } finally {
      setIsLoadingPublicidades(false)
      isLoadingPublicidadesRef.current = false
    }
  }

  // Función para forzar recarga
  const refreshPublicidades = () => {
    publicidadesCacheRef.current = { data: null, timestamp: 0 }
    loadTodasPublicidades(true)
  }

  const loadPublicidades = async (comercioId) => {
    try {
      const response = await Apis.obtenerPublicidadesListado()
      if (response.status === 200) {
        const allPublicidades = response.data
        const now = new Date()

        const comercioPublicidades = allPublicidades
          .filter((pub) => pub.iD_Comercio === comercioId)
          .map((pub) => {
            const fechaCreacion = new Date(pub.fechaCreacion || pub.FechaCreacion)
            const dias = getDiasFromTiempo(pub.tiempo)
            const fechaExpiracion = new Date(fechaCreacion)
            fechaExpiracion.setDate(fechaExpiracion.getDate() + dias)

            return {
              ...pub,
              fechaExpiracionCalculada: fechaExpiracion,
            }
          })
          .filter((pub) => {
            if (!pub.estado) return true
            return pub.fechaExpiracionCalculada > now
          })

        setPublicidadesList(comercioPublicidades)
      }
    } catch (error) {
      console.error("Error al cargar publicidades:", error)
      setPublicidadesList([])
    }
  }

  const handleComercioPress = (comercio) => {
    setSelectedComercio(comercio)
    setModalVisible(true)
    setNombre(comercio.nombre || "")
    setDireccion(comercio.direccion || "")
    setCapacidad(comercio.capacidad?.toString() || "")
    setMesas(comercio.mesas?.toString() || "")
    setGeneroMusical(comercio.generoMusical || "")
    setOpeningHours(formatTimeForDisplay(comercio.horaIngreso || ""))
    setClosingHours(formatTimeForDisplay(comercio.horaCierre || ""))

    if (comercio.foto) {
      const imageUri = convertBase64ToImage(comercio.foto)
      setBusinessImage(imageUri)
      setBusinessImageBase64(comercio.foto)
    } else {
      setBusinessImage(null)
      setBusinessImageBase64(null)
    }

    loadPublicidades(comercio.iD_Comercio)
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

        if (imageType === "businessImage" || imageType === "newComercioImage") {
          const base64 = await convertImageToBase64(imageUri)
          if (base64) {
            if (imageType === "businessImage") {
              setBusinessImageBase64(base64)
            } else if (imageType === "newComercioImage") {
              setNewComercioImageBase64(base64)
            }
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

  const handleCancelEdit = () => {
    if (selectedComercio) {
      setNombre(selectedComercio.nombre || "")
      setDireccion(selectedComercio.direccion || "")
      setCapacidad(selectedComercio.capacidad?.toString() || "")
      setMesas(selectedComercio.mesas?.toString() || "")
      setGeneroMusical(selectedComercio.generoMusical || "")
      setOpeningHours(formatTimeForDisplay(selectedComercio.horaIngreso || ""))
      setClosingHours(formatTimeForDisplay(selectedComercio.horaCierre || ""))

      if (selectedComercio.foto) {
        const imageUri = convertBase64ToImage(selectedComercio.foto)
        setBusinessImage(imageUri)
        setBusinessImageBase64(selectedComercio.foto)
      } else {
        setBusinessImage(null)
        setBusinessImageBase64(null)
      }
    }
    setIsEditing(false)
  }

  const validateTimeFormat = (timeString) => {
    if (!timeString) return true
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(timeString)
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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
      const isApproved = selectedComercio.estado === true
      const isRechazado = selectedComercio.motivoRechazo && selectedComercio.motivoRechazo.trim() !== ""

      const cleanTipoDocumento = selectedComercio.tipoDocumento.replace(/\s+/g, "")
      const cleanTelefono = selectedComercio.telefono.replace(/\s+/g, "")
      const cleanNroDocumento = selectedComercio.nroDocumento.replace(/-/g, "")

      if (!isApproved && cleanTipoDocumento === "CUIT") {
        const cuitValidation = validateCUIT(cleanNroDocumento)
        if (!cuitValidation.valid) {
          Alert.alert("Error de validación", cuitValidation.message)
          setIsSaving(false)
          return
        }
      }

      const horaIngresoFormatted = formatTimeWithSeconds(openingHours)
      const horaCierreFormatted = formatTimeWithSeconds(closingHours)

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
        telefono: cleanTelefono,
        estado: isRechazado ? false : selectedComercio.estado,
        fechaCreacion: selectedComercio.fechaCreacion,
        horaIngreso: horaIngresoFormatted,
        horaCierre: horaCierreFormatted,
        foto: businessImageBase64 || selectedComercio.foto || "",
        iD_Usuario: selectedComercio.iD_Usuario,
        iD_TipoComercio: selectedComercio.iD_TipoComercio,
        usuario: selectedComercio.usuario || null,
        tipoComercio: selectedComercio.tipoComercio || null,
        MotivoRechazo: isRechazado ? null : selectedComercio.motivoRechazo ?? null,
      }

      const response = await Apis.actualizarComercio(selectedComercio.iD_Comercio, updatedComercio)

      if (response.status === 200 || response.status === 201 || response.status === 204) {
        if (isRechazado) {
          Alert.alert(
            "Éxito",
            "La información del comercio ha sido actualizada y enviada nuevamente para aprobación del administrador."
          )
        } else {
          Alert.alert("Éxito", "La información del comercio ha sido actualizada.")
        }
        await loadComerciosList()

        const updatedComerciosListResponse = await Apis.obtenerComerciosListado()
        if (updatedComerciosListResponse.status === 200) {
          const comercioActualizado = updatedComerciosListResponse.data.find(
            (c) => c.iD_Comercio === selectedComercio.iD_Comercio
          )

          if (comercioActualizado) {
            setSelectedComercio(comercioActualizado)
            setNombre(comercioActualizado.nombre || "")
            setDireccion(comercioActualizado.direccion || "")
            setCapacidad(comercioActualizado.capacidad?.toString() || "")
            setMesas(comercioActualizado.mesas?.toString() || "")
            setGeneroMusical(comercioActualizado.generoMusical || "")
            setOpeningHours(formatTimeForDisplay(comercioActualizado.horaIngreso || ""))
            setClosingHours(formatTimeForDisplay(comercioActualizado.horaCierre || ""))

            if (comercioActualizado.foto) {
              const imageUri = convertBase64ToImage(comercioActualizado.foto)
              setBusinessImage(imageUri)
              setBusinessImageBase64(comercioActualizado.foto)
            } else {
              setBusinessImage(null)
              setBusinessImageBase64(null)
            }
          }
        }

        setIsEditing(false)
        if (isRechazado) {
          setModalVisible(false)
        }
      } else {
        throw new Error("Error al actualizar comercio")
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      const errorMessage = error.response?.data?.message || error.message || "No se pudo guardar la información."
      Alert.alert("Error", errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateNewComercio = () => {
    setCreateModalVisible(true)
    setNewComercioData({
      ID_TipoComercio: 1,
      Nombre: "",
      Capacidad: "",
      Mesas: "",
      GeneroMusical: "",
      TipoDocumento: "CUIT",
      NroDocumento: "",
      Direccion: "",
      Correo: "",
      Telefono: "",
    })
    setNewComercioImage(null)
    setNewComercioImageBase64(null)
    setNewComercioHoraIngreso("")
    setNewComercioHoraCierre("")
  }

  const handleSubmitNewComercio = async () => {
    try {
      if (
        !newComercioData.Nombre ||
        !newComercioData.NroDocumento ||
        !newComercioData.Direccion ||
        !newComercioData.Telefono ||
        !newComercioData.Correo
      ) {
        Alert.alert("Error", "Por favor, complete todos los campos obligatorios.")
        return
      }
      if (!validateEmail(newComercioData.Correo)) {
        Alert.alert("Error de validación", "El correo electrónico no tiene un formato válido.")
        return
      }
      const cleanNroDocumento = newComercioData.NroDocumento.replace(/-/g, "")
      const cuitValidation = validateCUIT(cleanNroDocumento)
      if (!cuitValidation.valid) {
        Alert.alert("Error de validación", cuitValidation.message)
        return
      }

      if (newComercioHoraIngreso && !validateTimeFormat(newComercioHoraIngreso)) {
        Alert.alert("Error", "El horario de apertura debe tener el formato HH:MM")
        return
      }

      if (newComercioHoraCierre && !validateTimeFormat(newComercioHoraCierre)) {
        Alert.alert("Error", "El horario de cierre debe tener el formato HH:MM")
        return
      }

      setIsSaving(true)

      const horaIngresoFormatted =
        newComercioHoraIngreso && newComercioHoraIngreso.trim() !== ""
          ? formatTimeWithSeconds(newComercioHoraIngreso)
          : null
      const horaCierreFormatted =
        newComercioHoraCierre && newComercioHoraCierre.trim() !== ""
          ? formatTimeWithSeconds(newComercioHoraCierre)
          : null

      const comercioDataToSend = {
        iD_Comercio: 0,
        nombre: newComercioData.Nombre,
        capacidad: Number.parseInt(newComercioData.Capacidad) || 0,
        mesas: Number.parseInt(newComercioData.Mesas) || 0,
        generoMusical: newComercioData.GeneroMusical,
        tipoDocumento: newComercioData.TipoDocumento.replace(/\s+/g, ""),
        nroDocumento: formatCUIT(newComercioData.NroDocumento),
        direccion: newComercioData.Direccion,
        correo: newComercioData.Correo,
        telefono: newComercioData.Telefono,
        estado: false,
        fechaCreacion: new Date().toISOString(),
        horaIngreso: horaIngresoFormatted,
        horaCierre: horaCierreFormatted,
        foto: newComercioImageBase64 || "",
        iD_Usuario: user.iD_Usuario,
        iD_TipoComercio: newComercioData.ID_TipoComercio,
      }

      const response = await Apis.crearComercio(comercioDataToSend)

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          "Comercio Creado",
          "Su comercio ha sido registrado exitosamente y está pendiente de aprobación.",
          [
            {
              text: "OK",
              onPress: () => {
                setCreateModalVisible(false)
                loadComerciosList()
              },
            },
          ]
        )
      } else {
        throw new Error("Error al crear comercio")
      }
    } catch (error) {
      let errorMessage = "No se pudo crear el comercio."
      if (error.response?.data) {
        const errorData = error.response.data
        if (errorData.correo) {
          errorMessage = Array.isArray(errorData.correo) ? errorData.correo[0] : errorData.correo
        } else if (typeof errorData === "string" && errorData.includes("CUIT")) {
          errorMessage = "Ya existe un comercio registrado con este CUIT."
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      }
      Alert.alert("Error al registrar comercio", errorMessage, [{ text: "Entendido" }])
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteComercio = () => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Está seguro que desea eliminar el comercio "${selectedComercio.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await Apis.eliminarComercio(selectedComercio.iD_Comercio)
              if (response.status === 200 || response.status === 201 || response.status === 204) {
                Alert.alert("Comercio eliminado", "Su comercio ha sido eliminado exitosamente.")
                setModalVisible(false)
                await loadComerciosList()
              }
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el comercio.")
            }
          },
        },
      ]
    )
  }

  const handleEditPublicidad = (publicidad) => {
    if (publicidad.pago && !publicidad.estado && publicidad.motivoRechazo) {
      Alert.alert(
        "Editar Publicidad Rechazada",
        "Esta publicidad ya fue pagada. Puedes actualizar la imagen para que sea revisada nuevamente por el administrador.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Editar Imagen",
            onPress: () => {
              setSelectedPublicidad({ ...publicidad, isRejectedPaid: true })
              setPublicidadModalVisible(true)
            },
          },
        ]
      )
    } else {
      setSelectedPublicidad(publicidad)
      setPublicidadModalVisible(true)
    }
  }

  const handleEditRejectedUnpaid = (pub) => {
    const comercio = comerciosList.find((c) => c.iD_Comercio === pub.iD_Comercio)
    if (comercio) {
      setSelectedComercio(comercio)
    }
    setSelectedPublicidad({
      ...pub,
      isRejectedUnpaid: true,
    })
    setPublicidadModalVisible(true)
  }

  const handleDeletePublicidad = (publicidad) => {
    Alert.alert("Eliminar Publicidad", "¿Estás seguro que deseas eliminar esta publicidad?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await Apis.eliminarPublicidad(publicidad.iD_Publicidad)
            Alert.alert("Éxito", "La publicidad ha sido eliminada correctamente.")
            if (selectedComercio) {
              await loadPublicidades(selectedComercio.iD_Comercio)
            }
            if (activeTab === "publicidades") {
              refreshPublicidades()
            }
          } catch (error) {
            Alert.alert("Error", "No se pudo eliminar la publicidad.")
          }
        },
      },
    ])
  }

  const handlePayPublicidad = async (publicidad) => {
    try {
      const durations = [
        { days: 7, label: "1 Semana", price: 100 },
        { days: 15, label: "15 Días", price: 150 },
        { days: 30, label: "1 Mes", price: 200 },
      ]

      let duration = durations[0]
      const tiempo = publicidad.tiempo
      if (tiempo.includes("15")) duration = durations[1]
      else if (tiempo.includes("30") || tiempo.includes("23")) duration = durations[2]

      const preferenciaResponse = await Apis.crearPreferenciaPago({
        titulo: `Publicidad ${duration.label} - ${publicidad.nombreComercio || "Comercio"}`,
        precio: duration.price,
        publicidadId: publicidad.iD_Publicidad,
      })

      if (preferenciaResponse.data && preferenciaResponse.data.init_point) {
        const checkoutUrl = preferenciaResponse.data.init_point

        try {
          await AsyncStorage.setItem(
            "pendingPayment",
            JSON.stringify({
              publicidadId: publicidad.iD_Publicidad,
              preferenceId: preferenciaResponse.data.id,
              timestamp: Date.now(),
            })
          )
          console.log("[BarManagement] Pago pendiente guardado en AsyncStorage")
        } catch (storageError) {
          console.error("[BarManagement] Error guardando pago pendiente:", storageError)
        }

        const supported = await Linking.canOpenURL(checkoutUrl)

        if (supported) {
          await Linking.openURL(checkoutUrl)
          Alert.alert(
            "Redirigido a Mercado Pago",
            "Completa el pago para activar tu publicidad. Una vez que termines, regresa a la app.",
            [{ text: "Entendido" }]
          )
        } else {
          Alert.alert("Error", "No se pudo abrir el link de pago.")
          await AsyncStorage.removeItem("pendingPayment")
        }
      }
    } catch (error) {
      console.error("Error al generar link de pago:", error)
      Alert.alert("Error", "No se pudo generar el link de pago. Intenta nuevamente.")
    }
  }

  // =====================================================
  // RENDER PUBLICIDADES PANEL
  // =====================================================
  const renderPublicidadesPanel = () => {
    if (isLoadingPublicidades && todasPublicidades.length === 0) {
      return (
        <View style={styles.loadingPublicidadesContainer}>
          <ActivityIndicator size="large" color="#D838F5" />
          <Text style={styles.loadingPublicidadesText}>Cargando publicidades...</Text>
        </View>
      )
    }

    const publicidadesPendientes = []
    const publicidadesActivas = []
    const publicidadesRechazadas = []
    const publicidadesExpiradas = []

    todasPublicidades.forEach((pub) => {
      const isExpired = pub.fechaExpiracionCalculada < new Date()

      if (pub.isRechazada) {
        publicidadesRechazadas.push(pub)
      } else if (!pub.estado && pub.pago) {
        publicidadesPendientes.push(pub)
      } else if (!pub.estado && !pub.pago) {
        publicidadesPendientes.push(pub)
      } else if (pub.estado && !pub.pago) {
        publicidadesPendientes.push(pub)
      } else if (pub.estado && pub.pago && !isExpired) {
        publicidadesActivas.push(pub)
      } else if (isExpired) {
        publicidadesExpiradas.push(pub)
      }
    })

    const getPublicidadImageSource = (pub) => {
      const imageData = pub.imagen || pub.foto
      if (!imageData) {
        return require("../../assets/placeholder.jpg")
      }
      if (imageData.startsWith("data:image")) {
        return { uri: imageData }
      }
      return { uri: `data:image/jpeg;base64,${imageData}` }
    }

    const renderPublicidadCard = (pub) => {
      const fechaExpiracionStr = formatDateDDMMYY(pub.fechaExpiracionCalculada)
      const isExpired = pub.fechaExpiracionCalculada < new Date()

      return (
        <View
          key={pub.iD_Publicidad}
          style={[styles.publicidadCardLarge, pub.isRechazada && styles.publicidadRechazada]}
        >
          {pub.isRechazada && (
            <View style={styles.publicidadRejectionBanner}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#ff6b6b" />
              <Text style={styles.publicidadRejectionMessage}>{pub.motivoRechazo}</Text>
            </View>
          )}

          <View style={styles.publicidadCardContent}>
            <Image
              source={getPublicidadImageSource(pub)}
              style={styles.publicidadImageLarge}
              defaultSource={require("../../assets/placeholder.jpg")}
              resizeMode="cover"
            />

            <View style={styles.publicidadDetailsLarge}>
              <Text style={styles.publicidadTiempoLarge}>{getTiempoLabel(pub.tiempo)}</Text>
              <Text style={styles.publicidadComercioName}>{pub.nombreComercio}</Text>
              <Text style={styles.publicidadDescription}>
                {pub.descripcion?.substring(0, 100) || "Sin descripción"}
                {pub.descripcion?.length > 100 && "..."}
              </Text>

              <Text style={styles.publicidadViewsLarge}>
                <MaterialCommunityIcons name="eye" size={16} color="#D838F5" /> {pub.visualizaciones || 0}{" "}
                visualizaciones
              </Text>

              <Text style={styles.publicidadFechaExpiracion}>Vence: {fechaExpiracionStr}</Text>

              {pub.pago && (
                <View style={[styles.publicidadStatusBadge, styles.publicidadPagaBadge]}>
                  <Text style={styles.publicidadPagaText}>💰 Paga</Text>
                </View>
              )}

              {pub.isRechazada && (
                <View style={[styles.publicidadStatusBadge, styles.publicidadRechazadaBadge]}>
                  <Text style={styles.publicidadRechazadaText}>Rechazada</Text>
                </View>
              )}

              {!pub.estado && pub.pago && !pub.isRechazada && (
                <View style={[styles.publicidadStatusBadge, styles.publicidadPendienteAprobacionBadge]}>
                  <Text style={styles.publicidadPendienteAprobacionText}>⏳ Pendiente de aprobación</Text>
                </View>
              )}

              {!pub.estado && !pub.pago && !pub.isRechazada && (
                <View style={styles.publicidadStatusBadge}>
                  <Text style={styles.publicidadPendienteText}>💳 Pendiente de pago</Text>
                </View>
              )}

              {pub.estado && pub.pago && !isExpired && (
                <View style={[styles.publicidadStatusBadge, styles.publicidadActivaBadge]}>
                  <Text style={styles.publicidadActivaText}>✅ Activa</Text>
                </View>
              )}

              {isExpired && (
                <>
                  <View style={[styles.publicidadStatusBadge, styles.publicidadExpiradaBadge]}>
                    <Text style={styles.publicidadExpiradaText}>⌛ Expirada</Text>
                  </View>
                  <View style={{ height: 12 }} />
                </>
              )}

              {pub.estado && !pub.pago && !pub.isRechazada && (
                <TouchableOpacity style={styles.publicidadPayButton} onPress={() => handlePayPublicidad(pub)}>
                  <MaterialCommunityIcons name="credit-card" size={18} color="#fff" />
                  <Text style={styles.publicidadPayButtonText}>Pagar Ahora</Text>
                </TouchableOpacity>
              )}

              {!pub.estado && !pub.pago && !pub.isRechazada && (
                <TouchableOpacity style={styles.publicidadPayButton} onPress={() => handlePayPublicidad(pub)}>
                  <MaterialCommunityIcons name="credit-card" size={18} color="#fff" />
                  <Text style={styles.publicidadPayButtonText}>Pagar Ahora</Text>
                </TouchableOpacity>
              )}

              {pub.isRechazada && pub.pago && (
                <TouchableOpacity style={styles.publicidadEditButton} onPress={() => handleEditPublicidad(pub)}>
                  <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                  <Text style={styles.publicidadEditButtonText}>Editar Imagen</Text>
                </TouchableOpacity>
              )}

              {pub.isRechazada && !pub.pago && (
                <TouchableOpacity style={styles.publicidadEditPayButton} onPress={() => handleEditRejectedUnpaid(pub)}>
                  <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                  <Text style={styles.publicidadEditPayButtonText}>Editar y Pagar</Text>
                </TouchableOpacity>
              )}

              {isExpired && (
                <TouchableOpacity
                  style={styles.publicidadDeleteButtonSmall}
                  onPress={() => handleDeletePublicidad(pub)}
                >
                  <MaterialCommunityIcons name="delete" size={18} color="#fff" />
                  <Text style={styles.deletePublicidadButtonText}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )
    }

    return (
      <ScrollView style={styles.publicidadesPanel}>
        <Text style={styles.panelTitle}>Mis Publicidades</Text>

        {todasPublicidades.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="billboard" size={64} color="#666" />
            <Text style={styles.emptyStateText}>No tienes publicidades</Text>
          </View>
        ) : (
          <>
            {publicidadesPendientes.length > 0 && (
              <View style={styles.publicidadesSection}>
                <View style={styles.sectionHeaderContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color="#ffc107" />
                  <Text style={styles.sectionHeaderTitle}>Pendientes ({publicidadesPendientes.length})</Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Estas publicidades están esperando pago o aprobación del administrador.
                </Text>
                {publicidadesPendientes.map(renderPublicidadCard)}
              </View>
            )}

            {publicidadesActivas.length > 0 && (
              <View style={styles.publicidadesSection}>
                <View style={styles.sectionHeaderContainer}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
                  <Text style={[styles.sectionHeaderTitle, { color: "#4caf50" }]}>
                    Activas ({publicidadesActivas.length})
                  </Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Estas publicidades están aprobadas y visibles en la aplicación.
                </Text>
                {publicidadesActivas.map(renderPublicidadCard)}
              </View>
            )}

            {publicidadesRechazadas.length > 0 && (
              <View style={styles.publicidadesSection}>
                <View style={styles.sectionHeaderContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
                  <Text style={[styles.sectionHeaderTitle, { color: "#ff6b6b" }]}>
                    Rechazadas ({publicidadesRechazadas.length})
                  </Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Estas publicidades fueron rechazadas. Lee el motivo y edítalas para volver a enviarlas.
                </Text>
                {publicidadesRechazadas.map(renderPublicidadCard)}
              </View>
            )}

            {publicidadesExpiradas.length > 0 && (
              <View style={styles.publicidadesSection}>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={[styles.sectionHeaderTitle, { color: "#9e9e9e" }]}>
                    ⌛ Expiradas ({publicidadesExpiradas.length})
                  </Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Estas publicidades ya cumplieron su período de vigencia.
                </Text>
                {publicidadesExpiradas.map(renderPublicidadCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    )
  }

  // =====================================================
  // RENDER COMERCIO DETAILS
  // =====================================================
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
    const isRechazado = selectedComercio.motivoRechazo && selectedComercio.motivoRechazo.trim() !== ""

    return (
      <ScrollView style={styles.modalScrollView}>
        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>

        {!isEditing ? (
          <>
            <Text numberOfLines={2} style={styles.modalTitle}>
              {selectedComercio.nombre}
            </Text>
            {isRechazado && (
              <View style={styles.rejectionBanner}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
                <View style={styles.rejectionTextContainer}>
                  <Text style={styles.rejectionTitle}>Comercio Rechazado</Text>
                  <Text style={styles.rejectionMessage}>{selectedComercio.motivoRechazo}</Text>
                  <Text style={styles.rejectionAction}>
                    Puede editar los datos y volver a enviar para aprobación.
                  </Text>
                </View>
              </View>
            )}

            <Image
              source={getImageSource()}
              style={styles.modalImage}
              defaultSource={require("../../assets/placeholder.jpg")}
            />

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>📍 {selectedComercio.direccion}</Text>
              <Text style={styles.infoText}>👥 Capacidad: {selectedComercio.capacidad || "No especificada"}</Text>
              <Text style={styles.infoText}>
                🕐 {formatTimeForDisplay(selectedComercio.horaIngreso) || "No especificado"} -{" "}
                {formatTimeForDisplay(selectedComercio.horaCierre) || "No especificado"}
              </Text>
              {selectedComercio.generoMusical && <Text style={styles.hashtag}>#{selectedComercio.generoMusical}</Text>}
            </View>

            {!isRechazado && (
              <View style={styles.advertisingSection}>
                <TouchableOpacity
                  style={styles.createPublicidadButton}
                  onPress={() => {
                    setPublicidadModalVisible(true)
                    setSelectedPublicidad(null)
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="white" />
                  <Text style={styles.createPublicidadButtonText}>Crear Publicidad</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <MaterialCommunityIcons name="pencil" size={20} color="white" />
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteComercio(selectedComercio)}>
                <MaterialCommunityIcons name="delete" size={20} color="white" />
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.modalTitle}>Editar Comercio</Text>
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Nombre del comercio *</Text>
              <TextInput
                style={styles.editInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre"
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Dirección *</Text>
              <TextInput
                style={styles.editInput}
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Dirección"
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Capacidad</Text>
              <TextInput
                style={styles.editInput}
                value={capacidad}
                onChangeText={setCapacidad}
                keyboardType="numeric"
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Mesas</Text>
              <TextInput
                style={styles.editInput}
                value={mesas}
                onChangeText={setMesas}
                keyboardType="numeric"
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Género musical</Text>
              <TextInput
                style={styles.editInput}
                value={generoMusical}
                onChangeText={setGeneroMusical}
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Horario apertura</Text>
              <TextInput
                style={styles.editInput}
                value={openingHours}
                onChangeText={setOpeningHours}
                placeholder="18:00"
                maxLength={5}
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Horario cierre</Text>
              <TextInput
                style={styles.editInput}
                value={closingHours}
                onChangeText={setClosingHours}
                placeholder="02:00"
                maxLength={5}
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.editLabel}>Imagen</Text>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => handleImagePicker(setBusinessImage, "businessImage")}
              >
                <Text style={styles.imageButtonText}>Seleccionar imagen</Text>
              </TouchableOpacity>
              {businessImage && <Image source={{ uri: businessImage }} style={styles.previewImage} />}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>{isSaving ? "Guardando..." : "Guardar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    )
  }

  // =====================================================
  // RENDER CREATE COMERCIO FORM
  // =====================================================
  const renderCreateComercioForm = () => {
    return (
      <ScrollView style={styles.modalScrollView}>
        <TouchableOpacity style={styles.closeButton} onPress={() => setCreateModalVisible(false)}>
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.modalTitle}>Nuevo Comercio</Text>

        <View style={styles.editSection}>
          <Text style={styles.editLabel}>Tipo de Comercio *</Text>
          <Picker
            selectedValue={newComercioData.ID_TipoComercio}
            style={styles.picker}
            onValueChange={(itemValue) =>
              setNewComercioData((prevState) => ({ ...prevState, ID_TipoComercio: itemValue }))
            }
          >
            <Picker.Item label="Bar" value={1} />
            <Picker.Item label="Boliche" value={2} />
          </Picker>

          <Text style={styles.editLabel}>Nombre *</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.Nombre}
            onChangeText={(text) => setNewComercioData((prev) => ({ ...prev, Nombre: text }))}
            placeholder="Nombre del comercio"
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Dirección *</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.Direccion}
            onChangeText={(text) => setNewComercioData((prev) => ({ ...prev, Direccion: text }))}
            placeholder="Dirección"
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Correo *</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.Correo}
            onChangeText={(text) => setNewComercioData((prev) => ({ ...prev, Correo: text }))}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>CUIT *</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.NroDocumento}
            onChangeText={(text) => {
              const formatted = formatCUIT(text)
              setNewComercioData((prev) => ({ ...prev, NroDocumento: formatted }))
            }}
            placeholder="20-12345678-9"
            keyboardType="numeric"
            maxLength={13}
            placeholderTextColor="#a0a0a0"
          />
          <Text style={styles.helperText}>Formato: 20-12345678-9</Text>

          <Text style={styles.editLabel}>Teléfono *</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.Telefono}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10)
              setNewComercioData((prev) => ({ ...prev, Telefono: cleaned }))
            }}
            placeholder="1132419131"
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Capacidad</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.Capacidad}
            onChangeText={(text) => setNewComercioData((prev) => ({ ...prev, Capacidad: text }))}
            keyboardType="numeric"
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Mesas</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.Mesas}
            onChangeText={(text) => setNewComercioData((prev) => ({ ...prev, Mesas: text }))}
            keyboardType="numeric"
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Género musical</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioData.GeneroMusical}
            onChangeText={(text) => setNewComercioData((prev) => ({ ...prev, GeneroMusical: text }))}
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Horario apertura</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioHoraIngreso}
            onChangeText={setNewComercioHoraIngreso}
            placeholder="18:00"
            maxLength={5}
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Horario cierre</Text>
          <TextInput
            style={styles.editInput}
            value={newComercioHoraCierre}
            onChangeText={setNewComercioHoraCierre}
            placeholder="02:00"
            maxLength={5}
            placeholderTextColor="#a0a0a0"
          />

          <Text style={styles.editLabel}>Imagen</Text>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={() => handleImagePicker(setNewComercioImage, "newComercioImage")}
          >
            <Text style={styles.imageButtonText}>Seleccionar imagen</Text>
          </TouchableOpacity>
          {newComercioImage && <Image source={{ uri: newComercioImage }} style={styles.previewImage} />}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSubmitNewComercio}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>{isSaving ? "Creando..." : "Crear Comercio"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setCreateModalVisible(false)}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // =====================================================
  // VERIFICACIONES DE ACCESO
  // =====================================================
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
  const pendingComercios = comerciosList.filter(
    (comercio) => comercio.estado === false && (!comercio.motivoRechazo || comercio.motivoRechazo.trim() === "")
  )
  const rejectedComercios = comerciosList.filter(
    (comercio) => comercio.estado === false && comercio.motivoRechazo && comercio.motivoRechazo.trim() !== ""
  )

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Mis Comercios</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNewComercio}>
          <MaterialCommunityIcons name="plus" size={20} color="white" />
          <Text style={styles.createButtonText}>Crear Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "comercios" && styles.activeTab]}
          onPress={() => setActiveTab("comercios")}
        >
          <MaterialCommunityIcons name="store" size={20} color={activeTab === "comercios" ? "#D838F5" : "#666"} />
          <Text style={[styles.tabText, activeTab === "comercios" && styles.activeTabText]}>Comercios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "publicidades" && styles.activeTab]}
          onPress={() => setActiveTab("publicidades")}
        >
          <MaterialCommunityIcons name="billboard" size={20} color={activeTab === "publicidades" ? "#D838F5" : "#666"} />
          <Text style={[styles.tabText, activeTab === "publicidades" && styles.activeTabText]}>Publicidades</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "comercios" && (
        <>
          {rejectedComercios.length > 0 && (
            <View style={styles.rejectedSection}>
              <Text style={styles.sectionTitle}>❌ Comercios Rechazados ({rejectedComercios.length})</Text>
              <FlatList
                data={rejectedComercios}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.rejectedCard} onPress={() => handleComercioPress(item)}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#ff6b6b" />
                    <View style={styles.rejectedCardContent}>
                      <Text style={styles.rejectedCardName}>{item.nombre}</Text>
                      <Text style={styles.rejectedCardStatus}>Toca para ver el motivo y editar</Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.iD_Comercio.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

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
              <Text style={styles.sectionTitle}>Comercios Aprobados</Text>
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
        </>
      )}

      {activeTab === "publicidades" && renderPublicidadesPanel()}

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

      {/* Modal de crear comercio */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>{renderCreateComercioForm()}</View>
        </View>
      </Modal>

      {/* Publicidad Modal */}
      <PublicidadModal
        visible={publicidadModalVisible}
        onClose={() => {
          setPublicidadModalVisible(false)
          setSelectedPublicidad(null)
          if (selectedComercio) {
            loadPublicidades(selectedComercio.iD_Comercio)
          }
          if (activeTab === "publicidades") {
            refreshPublicidades()
          }
        }}
        comercio={selectedComercio}
        publicidadToEdit={selectedPublicidad}
        isEditingRejectedPaid={selectedPublicidad?.isRejectedPaid || false}
        isRejectedUnpaid={selectedPublicidad?.isRejectedUnpaid || false}
      />
    </View>
  )
}





const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216, 56, 245, 0.3)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(216, 56, 245, 0.8)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 15,
  },
  pendingSection: {
    padding: 20,
  },
  pendingCard: {
    backgroundColor: "rgba(255, 193, 7, 0.15)",
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
    color: "#ffc107",
  },
  pendingCardStatus: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
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
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 15,
    marginBottom: 15,
    padding: 10,
    width: "48%",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    color: "#ffffff",
    marginBottom: 5,
  },
  cardAddress: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 5,
  },
  cardTypeContainer: {
    alignSelf: "flex-start",
  },
  cardType: {
    fontSize: 12,
    color: "#FFFFFF",
    backgroundColor: "rgba(216, 56, 245, 0.3)",
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
    color: "#ffffff",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "rgba(26, 26, 46, 0.98)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    width: "90%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  modalScrollView: {
    width: "100%",
  },
  closeButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 1,
    backgroundColor: "rgba(233, 17, 233, 0.32)",
    borderRadius: 20,
    padding: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#ffffff",
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
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: "rgba(255, 255, 255, 0.9)",
  },
  hashtag: {
    fontSize: 16,
    color: "#D838F5",
    fontWeight: "bold",
    marginTop: 5,
  },
  advertisingSection: {
    width: "100%",
    marginVertical: 20,
    padding: 15,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  advertisingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D838F5",
    marginBottom: 10,
  },
  advertisingButton: {
    flexDirection: "row",
    backgroundColor: "rgba(58, 9, 103, 0.6)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 58,
    elevation: 20,
  },
  advertisingButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
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
    backgroundColor: "rgba(58, 9, 103, 0.6)",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 53, 69, 0.8)",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(216, 56, 245, 0.8)",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 117, 125, 0.8)",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(108, 117, 125, 0.4)",
  },
  buttonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
  editSection: {
    width: "100%",
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 5,
    marginTop: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    fontSize: 16,
    marginBottom: 10,
    color: "#ffffff",
  },
  imageButton: {
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  imageButtonText: {
    fontSize: 16,
    color: "#ffffff",
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
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    fontSize: 18,
    color: "#D838F5",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  errorSubText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
  },
  // New styles for publicidades list
  publicidadesListContainer: {
    marginBottom: 15,
  },
  publicidadesListTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#D838F5",
    marginBottom: 10,
  },
  publicidadCard: {
    flexDirection: "column",
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  publicidadImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  publicidadInfo: {
    marginBottom: 8,
  },
  publicidadTiempo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  publicidadViews: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
    marginBottom: 2,
  },
  publicidadExpiracion: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
    marginBottom: 4,
  },
  publicidadActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  publicidadEditButton: {
    backgroundColor: "rgba(58, 9, 103, 0.6)",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
    minWidth: 44,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  publicidadDeleteButton: {
    backgroundColor: "rgba(220, 53, 69, 0.8)",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
    minWidth: 44,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  publicidadPendiente: {
    fontSize: 12,
    color: "#ffc107",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 6,
  },
  publicidadPayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4caf50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  publicidadPayButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  picker: {
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    borderRadius: 8,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    color: "#ffffff",
    marginBottom: 10,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  areaCodePicker: {
    width: 150,
    height: 50,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    color: "#ffffff",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    color: "#ffffff",
  },
  helperText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 10,
    fontStyle: "italic",
  },
  publicidadEditButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  publicidadDeleteButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  publicidadesScrollView: {
    maxHeight: 400,
  },
  rejectionBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#ff6b6b",
    alignItems: "flex-start",
  },
  rejectionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff6b6b",
    marginBottom: 5,
  },
  rejectionMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 8,
    lineHeight: 20,
  },
  rejectionAction: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontStyle: "italic",
  },

  rejectedSection: {
    padding: 20,
    backgroundColor: "rgba(255, 107, 107, 0.05)",
  },
  rejectedCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ff6b6b",
    minWidth: 200,
    alignItems: "center",
  },
  rejectedCardContent: {
    marginLeft: 10,
    flex: 1,
  },
  rejectedCardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff6b6b",
  },
  rejectedCardStatus: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontStyle: "italic",
    marginTop: 2,
  },
  publicidadDeleteButton: {
    backgroundColor: "rgba(220, 53, 69, 0.8)",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  publicidadButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
  },
  tabText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#D838F5",
    fontWeight: "700",
  },

  publicidadesPanel: {
    flex: 1,
    paddingHorizontal: 20,
  },
  panelTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D838F5",
    marginBottom: 20,
  },
  comercioPublicidadesGroup: {
    marginBottom: 30,
  },
  comercioGroupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    paddingLeft: 4,
  },
  publicidadCardLarge: {
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  publicidadRechazada: {
    borderColor: "rgba(255, 107, 107, 0.5)",
    borderWidth: 2,
  },
  publicidadRejectionBanner: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  publicidadRejectionTextContainer: {
    flex: 1,
  },
  publicidadRejectionTitle: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  publicidadRejectionMessage: {
    color: "#ff6b6b",
    fontSize: 13,
    lineHeight: 18,
  },
  publicidadCardContent: {
    flexDirection: "row",
    gap: 15,
  },
  publicidadImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  publicidadDetailsLarge: {
    flex: 1,
    justifyContent: "space-between",
  },
  publicidadTiempoLarge: {
    fontSize: 14,
    color: "#D838F5",
    fontWeight: "700",
  },
  publicidadComercioName: {
    fontSize: 13,
    color: "#D838F5",
    fontWeight: "600",
    marginBottom: 4,
  },
  publicidadTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D838F5",
  },
  publicidadDescription: {
    fontSize: 13,
    color: "#ccc",
    marginTop: 5,
  },
  publicidadViewsLarge: {
    fontSize: 13,
    color: "#D838F5",
    marginTop: 8,
    display: "flex",
    alignItems: "center",
  },
  publicidadFechaExpiracion: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
  },
  publicidadStatusBadge: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  publicidadActivaBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  publicidadPendienteText: {
    fontSize: 12,
    color: "#ffc107",
    fontWeight: "600",
  },
  publicidadActivaText: {
    fontSize: 12,
    color: "#4caf50",
    fontWeight: "600",
  },
  publicidadRechazadaBadge: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
  },
  publicidadRechazadaText: {
    fontSize: 12,
    color: "#ff6b6b",
    fontWeight: "600",
  },
  publicidadPendienteAprobacionBadge: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
  },
  publicidadPendienteAprobacionText: {
    fontSize: 12,
    color: "#ffc107",
    fontWeight: "600",
  },
  publicidadExpiradaBadge: {
    backgroundColor: "rgba(158, 158, 158, 0.2)",
  },
  publicidadExpiradaText: {
    fontSize: 12,
    color: "#9e9e9e",
    fontWeight: "600",
  },
  publicidadMotivoRechazoContainer: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ff6b6b",
  },
  publicidadMotivoRechazoLabel: {
    fontSize: 11,
    color: "#ff6b6b",
    fontWeight: "bold",
    marginBottom: 4,
  },
  publicidadMotivoRechazoText: {
    fontSize: 12,
    color: "#ffcccc",
    lineHeight: 16,
  },
  publicidadActionsLarge: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  publicidadPayButtonLarge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  publicidadPayButtonTextLarge: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  publicidadEditButtonLarge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(58, 9, 103, 0.8)",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
  },
  publicidadEditButtonTextLarge: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  publicidadDeleteButtonLarge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220, 53, 69, 0.8)",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  publicidadDeleteButtonTextLarge: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
  },
  approvedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  pagoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  pagoBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  pendientePagoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 152, 0, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  pendientePagoBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  createPublicidadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(216, 56, 245, 0.8)",
    paddingVertical: 15,
    borderRadius: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
  },
  createPublicidadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
    marginBottom: 10,
  },
  editButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  deleteButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
  // Agregando estilos para las secciones de publicidades (pendientes, activas, etc.)
  publicidadesSection: {
    marginBottom: 24,
    backgroundColor: "rgba(42, 42, 62, 0.3)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffc107",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#999",
    marginBottom: 16,
    lineHeight: 18,
  },
  deletePublicidadButton: {
    backgroundColor: "rgba(220, 53, 69, 0.2)",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
  },
  deletePublicidadButtonText: {
    color: "#e6bebeff",
    fontSize: 13,
    fontWeight: "600",
  },

  editPublicidadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0e6ff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#5c288c",
  },
  editPublicidadButtonText: {
    color: "#5c288c",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  publicidadPagaBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderColor: "#4caf50",
    borderWidth: 1,
  },
  publicidadPagaText: {
    color: "#4caf50",
    fontSize: 12,
    fontWeight: "600",
  },

  publicidadEditButton: {
    backgroundColor: "#D838F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  publicidadEditButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  publicidadDeleteButtonSmall: {
    backgroundColor: "#e60f0f85",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
  },
  publicidadEditPayButton: {
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  publicidadEditPayButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
})
export default BarManagement
