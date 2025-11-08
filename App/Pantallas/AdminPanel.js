import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView,
   BackHandler,
    Image, 
     TextInput, 
} from "react-native"
import { AuthContext } from "../../AuthContext"
import Apis, { authenticatedFetch } from "../../Apis"

export default function AdminPanel() {
  const { user, isAuthenticated } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState("dashboard") // Cambiar tab inicial a dashboard
  const [comercios, setComercios] = useState([])
  const [resenias, setResenias] = useState([])
  const [usuarios, setUsuarios] = useState([]) // Agregar estado para usuarios
  const [isLoading, setIsLoading] = useState(true)
  const [selectedComercio, setSelectedComercio] = useState(null)
  const [selectedResenia, setSelectedResenia] = useState(null)
  const [selectedUsuario, setSelectedUsuario] = useState(null) // Agregar estado para usuario seleccionado
  const [modalVisible, setModalVisible] = useState(false)
   const [selectedPublicidad, setSelectedPublicidad] = useState(null) // Added selectedPublicidad
  const [reseniaModalVisible, setReseniaModalVisible] = useState(false)
  const [usuarioModalVisible, setUsuarioModalVisible] = useState(false) // Agregar modal para usuarios
   const [publicidades, setPublicidades] = useState([]) 
   const [publicidadModalVisible, setPublicidadModalVisible] = useState(false) // Added publicidadModalVisible

  const [motivoRechazoComercio, setMotivoRechazoComercio] = useState("")
  const [motivoRechazoResenia, setMotivoRechazoResenia] = useState("")
  const [motivoRechazoUsuario, setMotivoRechazoUsuario] = useState("")
  const [motivoRechazoPublicidad, setMotivoRechazoPublicidad] = useState("")

  const convertBase64ToImage = (base64String) => {
    if (!base64String) {
      console.log("convertBase64ToImage: base64String es null o undefined")
      return null
    }

    const cleanBase64 = base64String.trim()

    if (cleanBase64.startsWith("data:image")) {
      console.log("convertBase64ToImage: Ya tiene prefijo data:image")
      return cleanBase64
    }

    // Verificar que el base64 no esté vacío después de limpiar
    if (cleanBase64.length === 0) {
      console.log("convertBase64ToImage: base64 vacío después de limpiar")
      return null
    }

    const result = `data:image/jpeg;base64,${cleanBase64}`
    console.log("convertBase64ToImage: URI generado, longitud:", result.length)
    return result
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (modalVisible) {
        setModalVisible(false)
        setMotivoRechazoComercio("")
        return true
      }
      if (reseniaModalVisible) {
        setReseniaModalVisible(false)
        setMotivoRechazoResenia("") 
        return true
      }
      if (usuarioModalVisible) {
        setUsuarioModalVisible(false)
        setMotivoRechazoUsuario("")
        return true
      }
      if (publicidadModalVisible) {
        setPublicidadModalVisible(false)
        setMotivoRechazoPublicidad("") // Clear rejection reason
        return true
      }
      return false
    })

    return () => backHandler.remove()
   }, [modalVisible, reseniaModalVisible, usuarioModalVisible, publicidadModalVisible])

  useEffect(() => {
    if (isAuthenticated && user?.iD_RolUsuario === 2) {
      if (activeTab === "comercios") {
        loadComercios()
      } else if (activeTab === "resenias") {
        loadResenias()
      } else if (activeTab === "usuarios") {
        loadUsuarios() // Cargar usuarios cuando el tab está activo
      } else if (activeTab === "publicidades") {
        loadPublicidades() // Load publicidades
      } else if (activeTab === "dashboard") {
        loadDashboardData() // Cargar datos del dashboard
      }
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, activeTab])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      //await Promise.all([loadComercios(), loadResenias(), loadUsuarios()])
     await Promise.all([loadComercios(), loadResenias(), loadUsuarios(), loadPublicidades()]) // Added loadPublicidades
    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadComercios = async () => {
    try {
      setIsLoading(true)
      console.log("Cargando lista de comercios...")
      const response = await authenticatedFetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/listado`, {
        method: "GET",
      })
console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        //console.log("Comercios cargados:", data)
        setComercios(data)
      } else {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error al obtener comercios: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error al cargar comercios:", error)
      Alert.alert("Error", `No se pudieron cargar los comercios: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
const loadUsuarios = async () => {
    try {
      setIsLoading(true)
      console.log("Cargando lista de usuarios...")
      const response = await Apis.obtenerUsuarios()
      //console.log("Usuarios cargados:", response.data)
      const solicitudesReactivacion = response.data.filter((u) => u.solicitudReactivacion === true)
      console.log("Usuarios con solicitud de reactivación:", solicitudesReactivacion.length)
      setUsuarios(response.data)
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      Alert.alert("Error", `No se pudieron cargar los usuarios: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  const loadResenias = async () => {
    try {
      setIsLoading(true)
    //  console.log("Cargando lista de reseñas...")
      const response = await Apis.obtenerResenias()
     // console.log("Reseñas cargadas:", response.data)
      setResenias(response.data)
    } catch (error) {
      console.error("Error al cargar reseñas:", error)
      Alert.alert("Error", `No se pudieron cargar las reseñas: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
const loadPublicidades = async () => {
    try {
      setIsLoading(true)
     // console.log("Cargando lista de publicidades...")
      const response = await Apis.obtenerPublicidadesListado()
     // console.log("Publicidades cargadas:", response.data)
      console.log("Total publicidades:", response.data.length)
      const pendientes = response.data.filter((p) => p.estado === false && !p.motivoRechazo)
      const rechazadas = response.data.filter((p) => p.estado === false && p.motivoRechazo)
      const aprobadas = response.data.filter((p) => p.estado === true)
      console.log("Pendientes:", pendientes.length)
      console.log("Rechazadas:", rechazadas.length)
      console.log("Aprobadas:", aprobadas.length)
      setPublicidades(response.data)
    } catch (error) {
      console.error("Error al cargar publicidades:", error)
      Alert.alert("Error", `No se pudieron cargar las publicidades: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  const handleApproveComercio = async (comercio) => {
    try {
         const comercioCompleto = comercios.find((c) => c.iD_Comercio === comercio.iD_Comercio)

      if (!comercioCompleto) {
        throw new Error("No se encontró el comercio en la lista")
      }

     // console.log("DEBUG - Comercio completo encontrado:")
     // console.log("DEBUG - Nombre:", comercioCompleto.nombre)
     // console.log("DEBUG - Tiene foto?", !!comercioCompleto.foto)
     // console.log("DEBUG - Foto length:", comercioCompleto.foto?.length || 0)
     // console.log("DEBUG - horaIngreso:", comercioCompleto.horaIngreso)
     // console.log("DEBUG - horaCierre:", comercioCompleto.horaCierre)

      const updatedComercio = {
        ...comercioCompleto,
        estado: true,
        motivoRechazo: null,
      }

   //   console.log("DEBUG - Enviando comercio con todos los campos:")
   //   console.log("DEBUG - Tiene foto?", !!updatedComercio.foto)
   //   console.log("DEBUG - horaIngreso:", updatedComercio.horaIngreso)
    //  console.log("DEBUG - horaCierre:", updatedComercio.horaCierre)

      const response = await authenticatedFetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/actualizar/${comercioCompleto.iD_Comercio}`,
        {
          method: "PUT",
          body: JSON.stringify(updatedComercio),
        },
      )

      if (response.ok) {
        Alert.alert("Éxito", "Comercio aprobado correctamente")
        await loadComercios()
        setModalVisible(false)
      } else {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error al aprobar comercio: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error al aprobar comercio:", error)
      Alert.alert("Error", `No se pudo aprobar el comercio: ${error.message}`)
    }
  }

  const handleApproveResenia = async (resenia) => {
    try {
      const updatedResenia = {
        ...resenia,
        estado: true, 
        motivoRechazo: null,
      }
     // console.log("Aprobando reseña:", updatedResenia)
      await Apis.actualizarResenia(resenia.iD_Resenia, updatedResenia)
      Alert.alert("Éxito", "Reseña aprobada correctamente")
      await loadResenias()
      setReseniaModalVisible(false)
      setMotivoRechazoResenia("")
    } catch (error) {
      console.error("Error al aprobar reseña:", error)
      Alert.alert("Error", `No se pudo aprobar la reseña: ${error.message}`)
    }
  }

  const handleRejectComercio = async (comercio) => {
   if (!motivoRechazoComercio.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo antes de continuar.")
      return
    }
    Alert.alert(
      "Rechazar comercio",
          `¿Está seguro que desea rechazar este comercio?\n\nMotivo: ${motivoRechazoComercio}`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
             const comercioCompleto = comercios.find((c) => c.iD_Comercio === comercio.iD_Comercio)

              if (!comercioCompleto) {
                throw new Error("No se encontró el comercio en la lista")
              }

              const updatedComercio = {
                ...comercioCompleto,
                estado: false,
                motivoRechazo: motivoRechazoComercio.trim(),
              }
const response = await authenticatedFetch(
  `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/actualizar/${comercioCompleto.iD_Comercio}`,
                {
                  method: "PUT",
                  body: JSON.stringify(updatedComercio),
                },
              )
              if (response.ok) {
                Alert.alert("Comercio rechazado",
                  "El comercio ha sido rechazado. El propietario podrá ver el motivo y corregir los datos.",)
                await loadComercios()
                setModalVisible(false)
                setMotivoRechazoComercio("")
              } else {
                throw new Error("Error al rechazar comercio")
              }
            } catch (error) {
              console.error("Error al rechazar comercio:", error)
              Alert.alert("Error", "No se pudo rechazar el comercio")
            }
          },
        },
      ],
    )
  }

  const handleRejectResenia = async (resenia) => {
     if (!motivoRechazoResenia.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo antes de continuar.")
      return
    }

    Alert.alert("Rechazar reseña", `¿Está seguro que desea rechazar esta reseña?\n\nMotivo: ${motivoRechazoResenia}`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedResenia = {
              ...resenia,
              estado: false,
              motivoRechazo: motivoRechazoResenia.trim(),
            }
            await Apis.actualizarResenia(resenia.iD_Resenia, updatedResenia)
            Alert.alert(
              "Reseña rechazada",
              "La reseña ha sido rechazada. El usuario podrá ver el motivo y editar su comentario.",
            )
            await loadResenias()
            setReseniaModalVisible(false)
            setMotivoRechazoResenia("")
            } catch (error) {
              console.error("Error al rechazar reseña:", error)
              Alert.alert("Error", "No se pudo rechazar la reseña")
            }
        },
      },
    ])
  }

  const handleRejectUsuario = async (usuario) => {
    if (!motivoRechazoUsuario.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo antes de continuar.")
      return
    }

    Alert.alert(
      "Rechazar usuario",
      `¿Está seguro que desea rechazar este usuario?\n\nMotivo: ${motivoRechazoUsuario}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedUsuario = {
                ...usuario,
                estado: false,
                motivoRechazo: motivoRechazoUsuario.trim(),
              }
              await Apis.actualizarEstadoUsuario(updatedUsuario, false)
              Alert.alert(
                "Usuario rechazado",
                "El usuario ha sido rechazado. Podrá ver el motivo y corregir su información.",
              )
              await loadUsuarios()
              setUsuarioModalVisible(false)
              setMotivoRechazoUsuario("")
            } catch (error) {
              console.error("Error al rechazar usuario:", error)
              Alert.alert("Error", "No se pudo rechazar el usuario")
            }
          },
        },
      ],
    )
  }

  const handleApprovePublicidad = async (publicidad) => {
    try {
      const updatedPublicidad = {
        ...publicidad,
        estado: true,
        motivoRechazo: motivoRechazoPublicidad.trim(),
      }
      await Apis.actualizarPublicidad(publicidad.iD_Publicidad, updatedPublicidad)
      Alert.alert("Éxito", "Publicidad aprobada correctamente")
      await loadPublicidades()
      setPublicidadModalVisible(false)
      setMotivoRechazoPublicidad("")
    } catch (error) {
      console.error("Error al aprobar publicidad:", error)
      Alert.alert("Error", `No se pudo aprobar la publicidad: ${error.message}`)
    }
  }

  const handleRejectPublicidad = async (publicidad) => {
    if (!motivoRechazoPublicidad.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo antes de continuar.")
      return
    }

    Alert.alert(
      "Rechazar publicidad",
      `¿Está seguro que desea rechazar esta publicidad?\n\nMotivo: ${motivoRechazoPublicidad}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedPublicidad = {
                ...publicidad,
                estado: false,
                motivoRechazo: motivoRechazoPublicidad.trim(),
                imagen: publicidad.imagen || publicidad.Imagen, // Preservar imagen original
              }
              await Apis.actualizarPublicidad(publicidad.iD_Publicidad, updatedPublicidad)
              Alert.alert(
                "Publicidad rechazada",
                "La publicidad ha sido rechazada. El comercio podrá ver el motivo y corregir la publicidad.",
              )
              await loadPublicidades()
              setPublicidadModalVisible(false)
              setMotivoRechazoPublicidad("")
              setSelectedPublicidad(null)
            } catch (error) {
              console.error("Error al rechazar publicidad:", error)
              Alert.alert("Error", "No se pudo rechazar la publicidad")
            }
          },
        },
      ],
    )
  }

  const handleDeleteComercio = async (comercio) => {
    Alert.alert(
      "Eliminar comercio",
      `¿Está seguro que desea eliminar el comercio "${comercio.nombre}"? Esta acción no se puede deshacer.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authenticatedFetch(
                `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/eliminar/${comercio.iD_Comercio}`,
                {
                  method: "DELETE",
                },
              )

              if (response.ok || response.status === 204) {
                Alert.alert("Comercio eliminado", "El comercio ha sido eliminado exitosamente.")
                await loadComercios()
                setModalVisible(false)
                setMotivoRechazoComercio("") // Clear rejection reason
              } else {
                throw new Error("Error al eliminar comercio")
              }
            } catch (error) {
              console.error("Error al eliminar comercio:", error)
              Alert.alert("Error", "No se pudo eliminar el comercio")
            }
          },
        },
      ],
    )
  }

  const handleComercioPress = (comercio) => {
   const comercioCompleto = comercios.find((c) => c.iD_Comercio === comercio.iD_Comercio) || comercio

  //  console.log("DEBUG - Comercio seleccionado:")
 //   console.log("Nombre:", comercioCompleto.nombre)
 //   console.log("Tiene foto:", !!comercioCompleto.foto)
  //  console.log("Foto length:", comercioCompleto.foto?.length || 0)
  //  console.log("horaIngreso:", comercioCompleto.horaIngreso)
  //  console.log("horaCierre:", comercioCompleto.horaCierre)

    setSelectedComercio(comercioCompleto)
    setMotivoRechazoComercio("") // Clear rejection reason when opening modal
    setModalVisible(true)
  }

  const handleReseniaPress = (resenia) => {
    setSelectedResenia(resenia)
    setMotivoRechazoComercio("") // Clear rejection reason when opening modal
    setReseniaModalVisible(true)
  }

  const handlePublicidadPress = (publicidad) => {
    setSelectedPublicidad(publicidad)
    setMotivoRechazoPublicidad("")
    setPublicidadModalVisible(true)
  }

  const renderReseniaItem = ({ item }) => {
    const getStatusColor = () => {
      if (item.estado === true) return "#28a745"
      if (item.estado === false) return "#ffc107"
      return "#6c757d"
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobada"
      if (item.estado === false) return item.motivoRechazo ? "Rechazada" : "Pendiente" // Show "Rechazada" if has rejection reason
    }

   

    return (
      <TouchableOpacity style={styles.reseniaItem} onPress={() => handleReseniaPress(item)}>
        <View style={styles.reseniaHeader}>
          <Text style={styles.reseniaUser}>{item.usuario?.nombreUsuario || "Usuario no disponible"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.reseniaComercio}>📍 {item.comercio?.nombre || "Comercio desconocido"}</Text>
        <Text style={styles.reseniaComentario} numberOfLines={2}>
          {item.comentario}
        </Text>
         {item.motivoRechazo && <Text style={styles.reseniaRechazo}>❌ Motivo: {item.motivoRechazo}</Text>}
        <Text style={styles.reseniaFecha}>📅 {formatDate(item.fechaCreacion)}</Text>
      </TouchableOpacity>
    )
  }

  const renderComercioItem = ({ item }) => {
    const getStatusColor = () => {
     if (item.estado === true) return "#28a745"
      if (item.estado === false) return "#ffc107"
      return "#6c757d"
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobado"
     if (item.estado === false) return item.motivoRechazo ? "Rechazado" : "Pendiente" // Show "Rechazado" if has rejection reason
    }

    return (
      <TouchableOpacity style={styles.comercioItem} onPress={() => handleComercioPress(item)}>
        <View style={styles.comercioHeader}>
          <Text style={styles.comercioName}>{item.nombre}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.comercioDetails}>Tipo: {item.tipoComercio?.descripcion || "No especificado"}</Text>
        <Text style={styles.comercioDetails}>Propietario: {item.usuario?.nombreUsuario || "No especificado"}</Text>
        <Text style={styles.comercioDetails}>Email: {item.correo}</Text>
        <Text style={styles.comercioDetails}>Dirección: {item.direccion}</Text>
     {item.motivoRechazo && <Text style={styles.comercioRechazo}>❌ Motivo: {item.motivoRechazo}</Text>}
      </TouchableOpacity>
    )
  }

  const renderPublicidadItem = ({ item }) => {
    const getStatusColor = () => {
      if (item.estado === true) return "#28a745"
      if (item.estado === false) return "#ffc107"
      return "#6c757d"
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobada"
      if (item.estado === false) return item.motivoRechazo ? "Rechazada" : "Pendiente"
      return "Desconocido"
    }

    return (
      <TouchableOpacity style={styles.publicidadItem} onPress={() => handlePublicidadPress(item)}>
        <View style={styles.publicidadHeader}>
          <Text style={styles.publicidadComercio}>{item.comercio?.nombre || "Comercio desconocido"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.publicidadDetails}>Descripción: {item.descripcion || "Sin descripción"}</Text>
        <Text style={styles.publicidadDetails}>Visualizaciones: {item.visualizaciones || 0}</Text>
        {item.motivoRechazo && <Text style={styles.publicidadRechazo}>❌ Motivo: {item.motivoRechazo}</Text>}
        <Text style={styles.publicidadFecha}>📅 {formatDate(item.fechaCreacion)}</Text>
      </TouchableOpacity>
    )
  }

   const handleToggleUsuarioEstado = async (usuario) => {
    const nuevoEstado = !usuario.estado
    const accion = nuevoEstado ? "activar" : "desactivar"

    Alert.alert(
      `${nuevoEstado ? "Activar" : "Desactivar"} usuario`,
      `¿Está seguro que desea ${accion} al usuario "${usuario.nombreUsuario}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: nuevoEstado ? "Activar" : "Desactivar",
          style: nuevoEstado ? "default" : "destructive",
          onPress: async () => {
            try {
              const updatedUsuario = {
                ...usuario,
                estado: nuevoEstado,
                 motivoRechazo: nuevoEstado ? null : usuario.motivoRechazo,
                solicitudReactivacion: nuevoEstado ? false : usuario.solicitudReactivacion,
              }
              await Apis.actualizarEstadoUsuario(updatedUsuario, nuevoEstado)
              Alert.alert("Éxito", `Usuario ${nuevoEstado ? "activado" : "desactivado"} correctamente`)
              await loadUsuarios()
              setUsuarioModalVisible(false)
               setMotivoRechazoUsuario("") // Clear rejection reason input
            } catch (error) {
              console.error("Error al cambiar estado de usuario:", error)
              Alert.alert("Error", `No se pudo ${accion} el usuario`)
            }
          },
        },
      ],
    )
  }

  const handleUsuarioPress = (usuario) => {
    setSelectedUsuario(usuario)
     setMotivoRechazoUsuario("") // Clear rejection reason when opening modal
    setUsuarioModalVisible(true)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, "0")
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const year = String(date.getFullYear()).slice(-2)
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch {
      return "Fecha no disponible"
    }
  }

  const renderUsuarioItem = ({ item }) => {
    const getStatusColor = () => (item.estado ? "#28a745" : "#dc3545")
    const getStatusText = () => {
      if (item.estado) return "Activo"
      return item.motivoRechazo ? "Rechazado" : "Inactivo" // Show "Rechazado" if has rejection reason
  }
    return (
      <TouchableOpacity style={styles.usuarioItem} onPress={() => handleUsuarioPress(item)}>
        <View style={styles.usuarioHeader}>
          <Text style={styles.usuarioName}>{item.nombreUsuario}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.usuarioDetails}>Email: {item.correo}</Text>
        {item.solicitudReactivacion && !item.estado && (
          <View style={styles.solicitudReactivacionBanner}>
            <Text style={styles.solicitudReactivacionText}>
              🔔 Este usuario ha solicitado la reactivación de su cuenta
            </Text>
          </View>
        )}
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{item.correo}</Text>
        </View>
        <Text style={styles.usuarioDetails}>Teléfono: {item.telefono || "No especificado"}</Text>
        {item.motivoRechazo && <Text style={styles.usuarioRechazo}>❌ Motivo: {item.motivoRechazo}</Text>}
        <Text style={styles.usuarioDetails}>Fecha de registro: {formatDate(item.fechaCreacion)}</Text>
      </TouchableOpacity>
    )
  }
  if (!isAuthenticated || user?.iD_RolUsuario !== 2) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No tiene permisos para acceder al panel de administración.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D838F5" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }
const pendingResenias = resenias.filter((r) => r.estado === false && !r.motivoRechazo) // Only pending, not rejected
  const approvedResenias = resenias.filter((r) => r.estado === true)
  const rejectedResenias = resenias.filter((r) => r.estado === false && r.motivoRechazo) // Rejected resenias
  const pendingComercios = comercios.filter((c) => c.estado === false && !c.motivoRechazo) // Only pending, not rejected
  const approvedComercios = comercios.filter((c) => c.estado === true)
  const rejectedComercios = comercios.filter((c) => c.estado === false && c.motivoRechazo) // Rejected comercios
  const activeUsuarios = usuarios.filter((u) => u.estado === true)
  const inactiveUsuarios = usuarios.filter((u) => u.estado === false)
  const solicitudesReactivacion = usuarios.filter((u) => u.solicitudReactivacion === true && u.estado === false)
  const pendingPublicidades = publicidades.filter((p) => p.estado === false && !p.motivoRechazo) // Only pending, not rejected
  const approvedPublicidades = publicidades.filter((p) => p.estado === true)
  const rejectedPublicidades = publicidades.filter((p) => p.estado === false && p.motivoRechazo) // Rejected publicidades

  return (
    <SafeAreaView style={styles.container}>
      

      <View style={styles.tabContainer}>
         <TouchableOpacity
          style={[styles.tab, activeTab === "dashboard" && styles.activeTab]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Text style={[styles.tabText, activeTab === "dashboard" && styles.activeTabText]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "resenias" && styles.activeTab]}
          onPress={() => setActiveTab("resenias")}
        >
          <Text style={[styles.tabText, activeTab === "resenias" && styles.activeTabText]}>
            Reseñas ({pendingResenias.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "comercios" && styles.activeTab]}
          onPress={() => setActiveTab("comercios")}
        >
          <Text style={[styles.tabText, activeTab === "comercios" && styles.activeTabText]}>
            Comercios ({pendingComercios.length})
          </Text>
        </TouchableOpacity>
         <TouchableOpacity
          style={[styles.tab, activeTab === "publicidades" && styles.activeTab]}
          onPress={() => setActiveTab("publicidades")}
        >
          <Text style={[styles.tabText, activeTab === "publicidades" && styles.activeTabText]}>
            Publicidades ({pendingPublicidades.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "usuarios" && styles.activeTab]}
          onPress={() => setActiveTab("usuarios")}
        >
          <Text style={[styles.tabText, activeTab === "usuarios" && styles.activeTabText]}>
            Usuarios ({usuarios.length})
          </Text>
        </TouchableOpacity>
      </View>
{activeTab === "dashboard" && (
        <ScrollView style={styles.dashboardContainer}>
          <Text style={styles.dashboardTitle}>Resumen General</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingResenias.length}</Text>
              <Text style={styles.statLabel}>Reseñas Pendientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvedResenias.length}</Text>
              <Text style={styles.statLabel}>Reseñas Aprobadas</Text>
            </View>
              <View style={styles.statCard}>
              <Text style={styles.statNumber}>{rejectedResenias.length}</Text>
              <Text style={styles.statLabel}>Reseñas Rechazadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingComercios.length}</Text>
              <Text style={styles.statLabel}>Comercios Pendientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvedComercios.length}</Text>
              <Text style={styles.statLabel}>Comercios Aprobados</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{rejectedComercios.length}</Text>
              <Text style={styles.statLabel}>Comercios Rechazados</Text>
            </View>
             <View style={styles.statCard}>
              <Text style={styles.statNumber}>{solicitudesReactivacion.length}</Text>
              <Text style={styles.statLabel}>Solicitudes de Reactivación</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingPublicidades.length}</Text>
              <Text style={styles.statLabel}>Publicidades Pendientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvedPublicidades.length}</Text>
              <Text style={styles.statLabel}>Publicidades Aprobadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{rejectedPublicidades.length}</Text>
              <Text style={styles.statLabel}>Publicidades Rechazadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{activeUsuarios.length}</Text>
              <Text style={styles.statLabel}>Usuarios Activos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{inactiveUsuarios.length}</Text>
              <Text style={styles.statLabel}>Usuarios Inactivos</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("resenias")}>
              <Text style={styles.quickActionText}>📝 Revisar Reseñas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("comercios")}>
              <Text style={styles.quickActionText}>🏪 Aprobar Comercios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("publicidades")}>
              <Text style={styles.quickActionText}>📢 Revisar Publicidades</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("usuarios")}>
              <Text style={styles.quickActionText}>👥 Gestionar Usuarios</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      {activeTab === "resenias" && (
        <>
          <Text style={styles.sectionTitle}>Reseñas Pendientes ({pendingResenias.length})</Text>
          {pendingResenias.length > 0 ? (
            <FlatList
              data={pendingResenias}
              renderItem={renderReseniaItem}
              keyExtractor={(item) => item.iD_Resenia.toString()}
              style={styles.list}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>✅ No hay reseñas pendientes de aprobación.</Text>
            </View>
          )}
        </>
      )}

      {activeTab === "comercios" && (
        <>
          <Text style={styles.sectionTitle}>Comercios Pendientes ({pendingComercios.length})</Text>
          {pendingComercios.length > 0 ? (
            <FlatList
              data={pendingComercios}
              renderItem={renderComercioItem}
              keyExtractor={(item) => item.iD_Comercio.toString()}
              style={styles.list}
            />
          ) : (
            <View style={styles.noDataContainer}>
               <Text style={styles.noDataText}>✅ No hay comercios pendientes de aprobación.</Text>
            </View>
          )}

          </>
      )}
{activeTab === "publicidades" && (
        <>
          <Text style={styles.sectionTitle}>Publicidades Pendientes ({pendingPublicidades.length})</Text>
          {pendingPublicidades.length > 0 ? (
            <FlatList
              data={pendingPublicidades}
              renderItem={renderPublicidadItem}
              keyExtractor={(item) => item.iD_Publicidad.toString()}
              style={styles.list}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>✅ No hay publicidades pendientes de aprobación.</Text>
            </View>
          )}
        </>
      )}
      {activeTab === "usuarios" && (
        <>
        {solicitudesReactivacion.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Solicitudes de Reactivación ({solicitudesReactivacion.length})</Text>
              <FlatList
                data={solicitudesReactivacion}
                renderItem={renderUsuarioItem}
                keyExtractor={(item) => `reactivacion-${item.iD_Usuario.toString()}`}
                style={styles.list}
              />
            </>
          )}
          <View style={styles.usuariosHeader}>
            <View style={styles.usuariosStats}>
              <View style={styles.usuariosStat}>
                <Text style={styles.usuariosStatNumber}>{activeUsuarios.length}</Text>
                <Text style={styles.usuariosStatLabel}>Activos</Text>
              </View>
              <View style={styles.usuariosStat}>
                <Text style={styles.usuariosStatNumber}>{inactiveUsuarios.length}</Text>
                <Text style={styles.usuariosStatLabel}>Inactivos</Text>
              </View>
              <View style={styles.usuariosStat}>
                <Text style={styles.usuariosStatNumber}>{usuarios.length}</Text>
                <Text style={styles.usuariosStatLabel}>Total</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Todos los Usuarios</Text>
          {usuarios.length > 0 ? (
            <FlatList
              data={usuarios}
              renderItem={renderUsuarioItem}
              keyExtractor={(item) => item.iD_Usuario.toString()}
              style={styles.list}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No hay usuarios registrados.</Text>
            </View>
          )}
        </>
      )}

      <Modal
        visible={reseniaModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setReseniaModalVisible(false)
          setMotivoRechazoResenia("") // Clear rejection reason on close
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedResenia && (
              <>
                <Text style={styles.modalTitle}>Detalle de Reseña</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: selectedResenia.estado ? "#28a745" : "#ffc107" }]}
                  >
                    <Text style={styles.statusText}>
                      {selectedResenia.estado ? "Aprobada" : selectedResenia.motivoRechazo ? "Rechazada" : "Pendiente"}
                    </Text>
                  </View>
                </View>
 {selectedResenia.motivoRechazo && (
                  <View style={styles.rejectionReasonSection}>
                    <Text style={styles.rejectionReasonLabel}>Motivo del rechazo:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedResenia.motivoRechazo}</Text>
                  </View>
                )}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Usuario:</Text>
                  <Text style={styles.detailValue}>
                   {selectedResenia.usuario?.nombreUsuario || "Usuario no disponible"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Comercio:</Text>
                  <Text style={styles.detailValue}>{selectedResenia.comercio?.nombre || "Comercio desconocido"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Comentario:</Text>
                  <Text style={styles.detailValue}>{selectedResenia.comentario}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Fecha:</Text>
                   <Text style={styles.detailValue}>{formatDate(selectedResenia.fechaCreacion)}</Text>
                </View>
 {!selectedResenia.estado && (
                  <View style={styles.rejectionInputSection}>
                    <Text style={styles.rejectionInputLabel}>Motivo del rechazo:</Text>
                    <TextInput
                      style={styles.rejectionInput}
                      placeholder="Ingrese el motivo del rechazo (requerido)"
                      placeholderTextColor="#888"
                      value={motivoRechazoResenia}
                      onChangeText={setMotivoRechazoResenia}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  {!selectedResenia.estado && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveResenia(selectedResenia)}
                      >
                        <Text style={styles.actionButtonText}>Aprobar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectResenia(selectedResenia)}
                      >
                        <Text style={styles.actionButtonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setReseniaModalVisible(false)
                      setMotivoRechazoResenia("") // Clear rejection reason on close
                    }}
                  >
                    <Text style={styles.actionButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal de comercio */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalVisible(false)
          setMotivoRechazoComercio("") // Clear rejection reason on close
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedComercio && (
              <>
                <Text style={styles.modalTitle}>{selectedComercio.nombre}</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: selectedComercio.estado ? "#28a745" : "#ffc107",
                      },
                    ]}
                  >
                     <Text style={styles.statusText}>
                      {selectedComercio.estado
                        ? "Aprobado"
                        : selectedComercio.motivoRechazo
                          ? "Rechazado"
                          : "Pendiente"}
                    </Text>
                  </View>
                </View>
 {selectedComercio.motivoRechazo && (
                  <View style={styles.rejectionReasonSection}>
                    <Text style={styles.rejectionReasonLabel}>Motivo del rechazo:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedComercio.motivoRechazo}</Text>
                  </View>
                )}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Tipo de comercio:</Text>
                  <Text style={styles.detailValue}>
                    {selectedComercio.tipoComercio?.descripcion || "No especificado"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Propietario:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.usuario?.nombreUsuario || "No especificado"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.correo}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Teléfono:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.telefono}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Dirección:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.direccion}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>CUIT:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.nroDocumento}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Capacidad:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.capacidad || "No especificada"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Mesas:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.mesas || "No especificadas"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Género musical:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.generoMusical || "No especificado"}</Text>
                </View>
                 {selectedComercio.horaIngreso && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Horario apertura:</Text>
                    <Text style={styles.detailValue}>{selectedComercio.horaIngreso}</Text>
                  </View>
                )}

                {selectedComercio.horaCierre && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Horario cierre:</Text>
                    <Text style={styles.detailValue}>{selectedComercio.horaCierre}</Text>
                  </View>
                )}

                {selectedComercio.foto ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Imagen del comercio:</Text>
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: convertBase64ToImage(selectedComercio.foto) }}
                        style={styles.comercioImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log("ERROR al cargar imagen:", error.nativeEvent.error)
                          console.log(
                            "URI que falló:",
                            convertBase64ToImage(selectedComercio.foto)?.substring(0, 100),
                          )
                        }}
                        onLoad={() => {
                          console.log("✅ Imagen cargada exitosamente")
                        }}
                        onLoadStart={() => {
                          console.log("Iniciando carga de imagen...")
                        }}
                      />
                      <Text style={styles.imageDebugText}>Tamaño: {selectedComercio.foto?.length || 0} caracteres</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Imagen del comercio:</Text>
                    <View style={styles.noImageContainer}>
                      <Text style={styles.noImageText}>📷 Sin imagen</Text>
                      <Text style={styles.noImageSubtext}>El comercio no ha subido una imagen</Text>
                    </View>
                  </View>
                )}
  {!selectedComercio.estado && (
                  <View style={styles.rejectionInputSection}>
                    <Text style={styles.rejectionInputLabel}>Motivo del rechazo:</Text>
                    <TextInput
                      style={styles.rejectionInput}
                      placeholder="Ingrese el motivo del rechazo (requerido)"
                      placeholderTextColor="#888"
                      value={motivoRechazoComercio}
                      onChangeText={setMotivoRechazoComercio}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  {!selectedComercio.estado && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveComercio(selectedComercio)}
                      >
                        <Text style={styles.actionButtonText}>Aprobar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectComercio(selectedComercio)}
                      >
                        <Text style={styles.actionButtonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteComercio(selectedComercio)}
                  >
                    <Text style={styles.actionButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false)
                      setMotivoRechazoComercio("") // Clear rejection reason on close
                    }}
                  >
                    <Text style={styles.actionButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Usuario Modal */}
      <Modal
        visible={usuarioModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setUsuarioModalVisible(false)
          setMotivoRechazoUsuario("") // Clear rejection reason on close
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedUsuario && (
              <>
                <Text style={styles.modalTitle}>{selectedUsuario.nombreUsuario}</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: selectedUsuario.estado ? "#28a745" : "#dc3545" }]}
                  >
                    <Text style={styles.statusText}>
                      {selectedUsuario.estado ? "Activo" : selectedUsuario.motivoRechazo ? "Rechazado" : "Inactivo"}
                    </Text>
                  </View>
                </View>

                {selectedUsuario.motivoRechazo && (
                  <View style={styles.rejectionReasonSection}>
                    <Text style={styles.rejectionReasonLabel}>Motivo del rechazo:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedUsuario.motivoRechazo}</Text>
                  </View>
                )}

                {selectedUsuario.solicitudReactivacion && !selectedUsuario.estado && (
                  <View style={styles.solicitudReactivacionBanner}>
                    <Text style={styles.solicitudReactivacionText}>
                      🔔 Este usuario ha solicitado la reactivación de su cuenta
                    </Text>
                  </View>
                )}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedUsuario.correo}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Teléfono:</Text>
                  <Text style={styles.detailValue}>{selectedUsuario.telefono || "No especificado"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Fecha de registro:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUsuario.fechaCreacion)}</Text>
                </View>

                {!selectedUsuario.estado && (
                  <View style={styles.rejectionInputSection}>
                    <Text style={styles.rejectionInputLabel}>Motivo del rechazo:</Text>
                    <TextInput
                      style={styles.rejectionInput}
                      placeholder="Ingrese el motivo del rechazo (requerido)"
                      placeholderTextColor="#888"
                      value={motivoRechazoUsuario}
                      onChangeText={setMotivoRechazoUsuario}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, selectedUsuario.estado ? styles.rejectButton : styles.approveButton]}
                    onPress={() => handleToggleUsuarioEstado(selectedUsuario)}
                  >
                    <Text style={styles.actionButtonText}>{selectedUsuario.estado ? "Desactivar" : "Activar"}</Text>
                  </TouchableOpacity>
                  {!selectedUsuario.estado && !selectedUsuario.motivoRechazo && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectUsuario(selectedUsuario)}
                    >
                      <Text style={styles.actionButtonText}>Rechazar con motivo</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setUsuarioModalVisible(false)
                      setMotivoRechazoUsuario("") // Clear rejection reason on close
                    }}
                  >
                    <Text style={styles.actionButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={publicidadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPublicidadModalVisible(false)
          setMotivoRechazoPublicidad("")
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedPublicidad && (
              <>
                <Text style={styles.modalTitle}>Detalle de Publicidad</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: selectedPublicidad.estado ? "#28a745" : "#ffc107" }]}
                  >
                    <Text style={styles.statusText}>
                      {selectedPublicidad.estado
                        ? "Aprobada"
                        : selectedPublicidad.motivoRechazo
                          ? "Rechazada"
                          : "Pendiente"}
                    </Text>
                  </View>
                </View>

                {selectedPublicidad.motivoRechazo && (
                  <View style={styles.rejectionReasonSection}>
                    <Text style={styles.rejectionReasonLabel}>Motivo del rechazo:</Text>
                    <Text style={styles.rejectionReasonText}>{selectedPublicidad.motivoRechazo}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Comercio:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPublicidad.comercio?.nombre || "Comercio desconocido"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Descripción:</Text>
                  <Text style={styles.detailValue}>{selectedPublicidad.descripcion || "Sin descripción"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Visualizaciones:</Text>
                  <Text style={styles.detailValue}>{selectedPublicidad.visualizaciones || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Fecha:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedPublicidad.fechaCreacion)}</Text>
                </View>

                {selectedPublicidad.imagen && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Imagen:</Text>
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: convertBase64ToImage(selectedPublicidad.imagen) }}
                        style={styles.comercioImage}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                )}

                {!selectedPublicidad.estado && (
                  <View style={styles.rejectionInputSection}>
                    <Text style={styles.rejectionInputLabel}>Motivo del rechazo:</Text>
                    <TextInput
                      style={styles.rejectionInput}
                      placeholder="Ingrese el motivo del rechazo (requerido)"
                      placeholderTextColor="#888"
                      value={motivoRechazoPublicidad}
                      onChangeText={setMotivoRechazoPublicidad}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  {!selectedPublicidad.estado && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprovePublicidad(selectedPublicidad)}
                      >
                        <Text style={styles.actionButtonText}>Aprobar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectPublicidad(selectedPublicidad)}
                      >
                        <Text style={styles.actionButtonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setPublicidadModalVisible(false)
                      setMotivoRechazoPublicidad("")
                    }}
                  >
                    <Text style={styles.actionButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#1a1a2e",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#D838F5",
  },
  list: {
    maxHeight: 300,
    marginBottom: 10,
  },
  comercioItem: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    shadowColor: "#D838F5",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  comercioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  comercioName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e0e0e0",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  comercioDetails: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 2,
  },
  comercioRechazo: {
    fontSize: 13,
    color: "#ff6b6b",
    marginTop: 8,
    fontStyle: "italic",
  },
  reseniaRechazo: {
    fontSize: 13,
    color: "#ff6b6b",
    marginTop: 8,
    fontStyle: "italic",
  },
  usuarioRechazo: {
    fontSize: 13,
    color: "#ff6b6b",
    marginTop: 8,
    fontStyle: "italic",
  },
  publicidadRechazo: {
    fontSize: 13,
    color: "#ff6b6b",
    marginTop: 8,
    fontStyle: "italic",
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#b0b0b0",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    fontSize: 16,
    color: "#D838F5",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e",
  },
  errorText: {
    fontSize: 18,
    color: "#D838F5",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D838F5",
    textAlign: "center",
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 42, 62, 0.3)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(58, 9, 103, 0.3)",
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D838F5",
    width: 120,
  },
  detailValue: {
    fontSize: 16,
    color: "#e0e0e0",
    flex: 1,
  },
  rejectionReasonSection: {
    marginBottom: 15,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  rejectionReasonLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ff6b6b",
    marginBottom: 8,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: "#e0e0e0",
    lineHeight: 20,
  },
  rejectionInputSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  rejectionInputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D838F5",
    marginBottom: 10,
  },
  rejectionInput: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    borderRadius: 8,
    padding: 12,
    color: "#e0e0e0",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    marginTop: 30,
    gap: 10,
  },
  actionButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  approveButton: {
    backgroundColor: "rgba(40, 167, 69, 0.5)",
    borderColor: "rgba(40, 167, 69, 0.3)",
  },
  rejectButton: {
    backgroundColor: "rgba(255, 193, 7, 0.5)",
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  deleteButton: {
    backgroundColor: "rgba(220, 53, 69, 0.5)",
    borderColor: "rgba(220, 53, 69, 0.3)",
  },
  cancelButton: {
    backgroundColor: "rgba(108, 117, 125, 0.5)",
    borderColor: "rgba(108, 117, 125, 0.3)",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216, 56, 245, 0.3)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#D838F5",
  },
  tabText: {
    fontSize: 14,
    color: "#b0b0b0",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#D838F5",
    fontWeight: "bold",
  },
  reseniaItem: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(58, 9, 103, 0.3)",
    shadowColor: "#3a0967",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  reseniaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reseniaUser: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e0e0e0",
    flex: 1,
  },
  reseniaComercio: {
    fontSize: 14,
    color: "#D838F5",
    marginBottom: 8,
    fontWeight: "600",
  },
  reseniaComentario: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 8,
    lineHeight: 20,
  },
  reseniaFecha: {
    fontSize: 12,
    color: "#888",
  },
  publicidadItem: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  publicidadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  publicidadComercio: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e0e0e0",
    flex: 1,
  },
  publicidadDetails: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 2,
  },
  publicidadFecha: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
  },
  dashboardContainer: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D838F5",
    marginBottom: 20,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(42, 42, 62, 0.6)",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#D838F5",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: "#b0b0b0",
    textAlign: "center",
  },
  quickActions: {
    gap: 10,
    marginTop: 10,
  },
  quickActionButton: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
  },
  quickActionText: {
    color: "#D838F5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  usuarioItem: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  usuarioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  usuarioName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e0e0e0",
    flex: 1,
  },
  usuarioDetails: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 2,
  },
  usuariosHeader: {
    marginBottom: 15,
  },
  usuariosStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(42, 42, 62, 0.6)",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  usuariosStat: {
    alignItems: "center",
  },
  usuariosStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D838F5",
  },
  usuariosStatLabel: {
    fontSize: 12,
    color: "#b0b0b0",
    marginTop: 5,
  },
  comercioImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "rgba(42, 42, 62, 0.3)", // Agregar fondo para ver el área de la imagen
  },
  imageContainer: {
    flex: 1,
    marginTop: 10,
  },
  imageDebugText: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
    textAlign: "center",
  },
  noImageContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42, 42, 62, 0.3)",
    borderRadius: 8,
    marginTop: 10,
    minHeight: 100,
  },
  noImageText: {
    fontSize: 16,
    color: "#b0b0b0",
    marginBottom: 5,
  },
  noImageSubtext: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  solicitudReactivacionBanner: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.5)",
    marginBottom: 15,
  },
  solicitudReactivacionText: {
    color: "#D838F5",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
})
