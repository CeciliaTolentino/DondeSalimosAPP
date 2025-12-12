import { useState, useEffect, useContext, useRef, useCallback } from "react"
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
  RefreshControl,
} from "react-native"
import { AuthContext } from "../../Apis/AuthContext"
import Apis, { authenticatedFetch } from "../../Apis/Apis"

const CACHE_DURATION = 60 * 1000 // 1 minuto de caché

export default function AdminPanel() {
  const { user, isAuthenticated } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [comercios, setComercios] = useState([])
  const [resenias, setResenias] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [publicidades, setPublicidades] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedComercio, setSelectedComercio] = useState(null)
  const [selectedResenia, setSelectedResenia] = useState(null)
  const [selectedUsuario, setSelectedUsuario] = useState(null)
  const [selectedPublicidad, setSelectedPublicidad] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [reseniaModalVisible, setReseniaModalVisible] = useState(false)
  const [usuarioModalVisible, setUsuarioModalVisible] = useState(false)
  const [publicidadModalVisible, setPublicidadModalVisible] = useState(false)

  const [motivoRechazoComercio, setMotivoRechazoComercio] = useState("")
  const [motivoRechazoResenia, setMotivoRechazoResenia] = useState("")
  const [motivoRechazoUsuario, setMotivoRechazoUsuario] = useState("")
  const [motivoRechazoPublicidad, setMotivoRechazoPublicidad] = useState("")

  // Refs para caché y control de carga
  const cacheRef = useRef({
    comercios: { data: null, timestamp: 0 },
    resenias: { data: null, timestamp: 0 },
    usuarios: { data: null, timestamp: 0 },
    publicidades: { data: null, timestamp: 0 },
  })
  const isLoadingRef = useRef({
    comercios: false,
    resenias: false,
    usuarios: false,
    publicidades: false,
    dashboard: false,
  })
  const initialLoadDone = useRef(false)

  const convertBase64ToImage = useCallback((base64String) => {
    if (!base64String) return null
    const cleanBase64 = base64String.trim()
    if (cleanBase64.startsWith("data:image")) return cleanBase64
    if (cleanBase64.length === 0) return null
    return `data:image/jpeg;base64,${cleanBase64}`
  }, [])

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
        setMotivoRechazoPublicidad("")
        return true
      }
      return false
    })
    return () => backHandler.remove()
  }, [modalVisible, reseniaModalVisible, usuarioModalVisible, publicidadModalVisible])

  useEffect(() => {
    if (isAuthenticated && user?.iD_RolUsuario === 2 && !initialLoadDone.current) {
      initialLoadDone.current = true
      loadDashboardData()
    } else if (!isAuthenticated || user?.iD_RolUsuario !== 2) {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (isAuthenticated && user?.iD_RolUsuario === 2 && initialLoadDone.current) {
      loadTabData(activeTab, false)
    }
  }, [activeTab])

  const isCacheValid = useCallback((type) => {
    const cache = cacheRef.current[type]
    return cache.data && Date.now() - cache.timestamp < CACHE_DURATION
  }, [])

  const loadTabData = async (tab, forceRefresh = false) => {
    switch (tab) {
      case "comercios":
        await loadComercios(forceRefresh)
        break
      case "resenias":
        await loadResenias(forceRefresh)
        break
      case "usuarios":
        await loadUsuarios(forceRefresh)
        break
      case "publicidades":
        await loadPublicidades(forceRefresh)
        break
      case "dashboard":
        await loadDashboardData(forceRefresh)
        break
    }
  }

  const loadDashboardData = async (forceRefresh = false) => {
    if (isLoadingRef.current.dashboard) return
    isLoadingRef.current.dashboard = true

    try {
      setIsLoading(true)
      await Promise.all([
        loadComercios(forceRefresh),
        loadResenias(forceRefresh),
        loadUsuarios(forceRefresh),
        loadPublicidades(forceRefresh),
      ])
    } catch (error) {
      console.error("Error al cargar dashboard:", error)
    } finally {
      setIsLoading(false)
      isLoadingRef.current.dashboard = false
    }
  }

  const loadComercios = async (forceRefresh = false) => {
    if (isLoadingRef.current.comercios) return
    if (!forceRefresh && isCacheValid("comercios")) {
      setComercios(cacheRef.current.comercios.data)
      return
    }

    isLoadingRef.current.comercios = true
    try {
      const response = await authenticatedFetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/listado`, {
        method: "GET",
      })

      if (response.ok) {
        const data = await response.json()
        cacheRef.current.comercios = { data, timestamp: Date.now() }
        setComercios(data)
      }
    } catch (error) {
      console.error("Error al cargar comercios:", error)
    } finally {
      isLoadingRef.current.comercios = false
    }
  }

  const loadUsuarios = async (forceRefresh = false) => {
    if (isLoadingRef.current.usuarios) return
    if (!forceRefresh && isCacheValid("usuarios")) {
      setUsuarios(cacheRef.current.usuarios.data)
      return
    }

    isLoadingRef.current.usuarios = true
    try {
      const response = await Apis.obtenerUsuarios()
      const data = response.data
      cacheRef.current.usuarios = { data, timestamp: Date.now() }
      setUsuarios(data)
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    } finally {
      isLoadingRef.current.usuarios = false
    }
  }

  const loadResenias = async (forceRefresh = false) => {
    if (isLoadingRef.current.resenias) return
    if (!forceRefresh && isCacheValid("resenias")) {
      setResenias(cacheRef.current.resenias.data)
      return
    }

    isLoadingRef.current.resenias = true
    try {
      const response = await Apis.obtenerResenias()
      const data = response.data
      cacheRef.current.resenias = { data, timestamp: Date.now() }
      setResenias(data)
    } catch (error) {
      console.error("Error al cargar resenias:", error)
    } finally {
      isLoadingRef.current.resenias = false
    }
  }

  const loadPublicidades = async (forceRefresh = false) => {
    if (isLoadingRef.current.publicidades) return
    if (!forceRefresh && isCacheValid("publicidades")) {
      setPublicidades(cacheRef.current.publicidades.data)
      return
    }

    isLoadingRef.current.publicidades = true
    try {
      const response = await Apis.obtenerPublicidadesListado()
      const data = response.data
      cacheRef.current.publicidades = { data, timestamp: Date.now() }
      setPublicidades(data)
    } catch (error) {
      console.error("Error al cargar publicidades:", error)
    } finally {
      isLoadingRef.current.publicidades = false
    }
  }

  const invalidateCache = (type) => {
    if (type) {
      cacheRef.current[type] = { data: null, timestamp: 0 }
    } else {
      cacheRef.current = {
        comercios: { data: null, timestamp: 0 },
        resenias: { data: null, timestamp: 0 },
        usuarios: { data: null, timestamp: 0 },
        publicidades: { data: null, timestamp: 0 },
      }
    }
  }

  const onRefresh = async () => {
    setIsRefreshing(true)
    invalidateCache(activeTab === "dashboard" ? null : activeTab)
    await loadTabData(activeTab, true)
    setIsRefreshing(false)
  }

  const formatDate = useCallback((dateString) => {
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
  }, [])

  // =====================================================
  // HANDLERS - COMERCIOS
  // =====================================================
  const handleApproveComercio = async (comercio) => {
    try {
      const comercioCompleto = comercios.find((c) => c.iD_Comercio === comercio.iD_Comercio)
      if (!comercioCompleto) throw new Error("No se encontró el comercio")

      const updatedComercio = { ...comercioCompleto, estado: true, motivoRechazo: null }

      const response = await authenticatedFetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/actualizar/${comercioCompleto.iD_Comercio}`,
        { method: "PUT", body: JSON.stringify(updatedComercio) }
      )

      if (response.ok) {
        Alert.alert("Éxito", "Comercio aprobado correctamente")
        invalidateCache("comercios")
        await loadComercios(true)
        setModalVisible(false)
      } else {
        throw new Error("Error al aprobar comercio")
      }
    } catch (error) {
      console.error("Error:", error)
      Alert.alert("Error", "No se pudo aprobar el comercio")
    }
  }

  const handleRejectComercio = async (comercio) => {
    if (!motivoRechazoComercio.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo.")
      return
    }

    Alert.alert("Rechazar comercio", `¿Confirma rechazar este comercio?\n\nMotivo: ${motivoRechazoComercio}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Rechazar",
        style: "destructive",
        onPress: async () => {
          try {
            const comercioCompleto = comercios.find((c) => c.iD_Comercio === comercio.iD_Comercio)
            if (!comercioCompleto) throw new Error("No se encontró el comercio")

            const updatedComercio = {
              ...comercioCompleto,
              estado: false,
              motivoRechazo: motivoRechazoComercio.trim(),
            }

            const response = await authenticatedFetch(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/actualizar/${comercioCompleto.iD_Comercio}`,
              { method: "PUT", body: JSON.stringify(updatedComercio) }
            )

            if (response.ok) {
              Alert.alert("Comercio rechazado", "El propietario podrá ver el motivo y corregir los datos.")
              invalidateCache("comercios")
              await loadComercios(true)
              setModalVisible(false)
              setMotivoRechazoComercio("")
            } else {
              throw new Error("Error al rechazar comercio")
            }
          } catch (error) {
            console.error("Error:", error)
            Alert.alert("Error", "No se pudo rechazar el comercio")
          }
        },
      },
    ])
  }

  const handleDeleteComercio = async (comercio) => {
    Alert.alert(
      "Eliminar comercio",
      `¿Eliminar "${comercio.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authenticatedFetch(
                `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Comercios/eliminar/${comercio.iD_Comercio}`,
                { method: "DELETE" }
              )

              if (response.ok || response.status === 204) {
                Alert.alert("Éxito", "Comercio eliminado")
                invalidateCache("comercios")
                await loadComercios(true)
                setModalVisible(false)
                setMotivoRechazoComercio("")
              } else {
                throw new Error("Error al eliminar")
              }
            } catch (error) {
              console.error("Error:", error)
              Alert.alert("Error", "No se pudo eliminar el comercio")
            }
          },
        },
      ]
    )
  }

  // =====================================================
  // HANDLERS - RESENIAS
  // =====================================================
  const handleApproveResenia = async (resenia) => {
    try {
      const updatedResenia = { ...resenia, estado: true, motivoRechazo: null }
      await Apis.actualizarResenia(resenia.iD_Resenia, updatedResenia)
      Alert.alert("Éxito", "Reseña aprobada correctamente")
      invalidateCache("resenias")
      await loadResenias(true)
      setReseniaModalVisible(false)
      setMotivoRechazoResenia("")
    } catch (error) {
      console.error("Error:", error)
      Alert.alert("Error", "No se pudo aprobar la reseña")
    }
  }

  const handleRejectResenia = async (resenia) => {
    if (!motivoRechazoResenia.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo.")
      return
    }

    Alert.alert("Rechazar reseña", `¿Confirma rechazar esta reseña?\n\nMotivo: ${motivoRechazoResenia}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Rechazar",
        style: "destructive",
        onPress: async () => {
          try {
            const updatedResenia = { ...resenia, estado: false, motivoRechazo: motivoRechazoResenia.trim() }
            await Apis.actualizarResenia(resenia.iD_Resenia, updatedResenia)
            Alert.alert("Reseña rechazada", "El usuario podrá ver el motivo y editar su comentario.")
            invalidateCache("resenias")
            await loadResenias(true)
            setReseniaModalVisible(false)
            setMotivoRechazoResenia("")
          } catch (error) {
            console.error("Error:", error)
            Alert.alert("Error", "No se pudo rechazar la reseña")
          }
        },
      },
    ])
  }

  // =====================================================
  // HANDLERS - USUARIOS
  // =====================================================
  const handleToggleUsuarioEstado = async (usuario) => {
    const nuevoEstado = !usuario.estado
    const accion = nuevoEstado ? "activar" : "desactivar"

    Alert.alert(`${nuevoEstado ? "Activar" : "Desactivar"} usuario`, `¿${accion} a "${usuario.nombreUsuario}"?`, [
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
            Alert.alert("Éxito", `Usuario ${nuevoEstado ? "activado" : "desactivado"}`)
            invalidateCache("usuarios")
            await loadUsuarios(true)
            setUsuarioModalVisible(false)
            setMotivoRechazoUsuario("")
          } catch (error) {
            console.error("Error:", error)
            Alert.alert("Error", `No se pudo ${accion} el usuario`)
          }
        },
      },
    ])
  }

  const handleRejectUsuario = async (usuario) => {
    if (!motivoRechazoUsuario.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo.")
      return
    }

    Alert.alert("Rechazar usuario", `¿Confirma rechazar este usuario?\n\nMotivo: ${motivoRechazoUsuario}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Rechazar",
        style: "destructive",
        onPress: async () => {
          try {
            const updatedUsuario = { ...usuario, estado: false, motivoRechazo: motivoRechazoUsuario.trim() }
            await Apis.actualizarEstadoUsuario(updatedUsuario, false)
            Alert.alert("Usuario rechazado", "El usuario podrá ver el motivo.")
            invalidateCache("usuarios")
            await loadUsuarios(true)
            setUsuarioModalVisible(false)
            setMotivoRechazoUsuario("")
          } catch (error) {
            console.error("Error:", error)
            Alert.alert("Error", "No se pudo rechazar el usuario")
          }
        },
      },
    ])
  }

  // =====================================================
  // HANDLERS - PUBLICIDADES
  // =====================================================
  const handleApprovePublicidad = async (publicidad) => {
    try {
      const updatedPublicidad = { ...publicidad, estado: true, motivoRechazo: null }
      await Apis.actualizarPublicidad(publicidad.iD_Publicidad, updatedPublicidad)
      Alert.alert("Éxito", "Publicidad aprobada correctamente")
      invalidateCache("publicidades")
      await loadPublicidades(true)
      setPublicidadModalVisible(false)
      setMotivoRechazoPublicidad("")
    } catch (error) {
      console.error("Error:", error)
      Alert.alert("Error", "No se pudo aprobar la publicidad")
    }
  }

  const handleRejectPublicidad = async (publicidad) => {
    if (!motivoRechazoPublicidad.trim()) {
      Alert.alert("Motivo requerido", "Por favor, ingrese el motivo del rechazo.")
      return
    }

    Alert.alert("Rechazar publicidad", `¿Confirma rechazar esta publicidad?\n\nMotivo: ${motivoRechazoPublicidad}`, [
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
              imagen: publicidad.imagen || publicidad.Imagen,
            }
            await Apis.actualizarPublicidad(publicidad.iD_Publicidad, updatedPublicidad)
            Alert.alert("Publicidad rechazada", "El comercio podrá ver el motivo y corregirla.")
            invalidateCache("publicidades")
            await loadPublicidades(true)
            setPublicidadModalVisible(false)
            setMotivoRechazoPublicidad("")
            setSelectedPublicidad(null)
          } catch (error) {
            console.error("Error:", error)
            Alert.alert("Error", "No se pudo rechazar la publicidad")
          }
        },
      },
    ])
  }

  // =====================================================
  // PRESS HANDLERS
  // =====================================================
  const handleComercioPress = useCallback((comercio) => {
    const comercioCompleto = comercios.find((c) => c.iD_Comercio === comercio.iD_Comercio) || comercio
    setSelectedComercio(comercioCompleto)
    setMotivoRechazoComercio("")
    setModalVisible(true)
  }, [comercios])

  const handleReseniaPress = useCallback((resenia) => {
    setSelectedResenia(resenia)
    setMotivoRechazoResenia("")
    setReseniaModalVisible(true)
  }, [])

  const handleUsuarioPress = useCallback((usuario) => {
    setSelectedUsuario(usuario)
    setMotivoRechazoUsuario("")
    setUsuarioModalVisible(true)
  }, [])

  const handlePublicidadPress = useCallback((publicidad) => {
    setSelectedPublicidad(publicidad)
    setMotivoRechazoPublicidad("")
    setPublicidadModalVisible(true)
  }, [])

  // =====================================================
  // RENDER ITEMS
  // =====================================================
  const renderComercioItem = useCallback(({ item }) => {
    const getStatusColor = () => {
      if (item.estado === true) return "#28a745"
      if (item.motivoRechazo) return "#dc3545"
      return "#ffc107"
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobado"
      if (item.motivoRechazo) return "Rechazado"
      return "Pendiente"
    }

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => handleComercioPress(item)}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.nombre}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.itemDetails}>Tipo: {item.tipoComercio?.descripcion || "No especificado"}</Text>
        <Text style={styles.itemDetails}>Propietario: {item.usuario?.nombreUsuario || "No especificado"}</Text>
        <Text style={styles.itemDetails}>Email: {item.correo}</Text>
        <Text style={styles.itemDetails}>Dirección: {item.direccion}</Text>
        {item.motivoRechazo && <Text style={styles.itemRechazo}>Motivo: {item.motivoRechazo}</Text>}
      </TouchableOpacity>
    )
  }, [handleComercioPress])

  const renderReseniaItem = useCallback(({ item }) => {
    const getStatusColor = () => {
      if (item.estado === true) return "#28a745"
      if (item.motivoRechazo) return "#dc3545"
      return "#ffc107"
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobada"
      if (item.motivoRechazo) return "Rechazada"
      return "Pendiente"
    }

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => handleReseniaPress(item)}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.usuario?.nombreUsuario || "Usuario"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.itemComercio}>{item.comercio?.nombre || "Comercio desconocido"}</Text>
        <Text style={styles.itemComentario} numberOfLines={2}>{item.comentario}</Text>
        {item.motivoRechazo && <Text style={styles.itemRechazo}>Motivo: {item.motivoRechazo}</Text>}
        <Text style={styles.itemFecha}>{formatDate(item.fechaCreacion)}</Text>
      </TouchableOpacity>
    )
  }, [handleReseniaPress, formatDate])

  const renderUsuarioItem = useCallback(({ item }) => {
    const getStatusColor = () => (item.estado ? "#28a745" : "#dc3545")
    const getStatusText = () => {
      if (item.estado) return "Activo"
      return item.motivoRechazo ? "Rechazado" : "Inactivo"
    }

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => handleUsuarioPress(item)}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.nombreUsuario}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.itemDetails}>Email: {item.correo}</Text>
        <Text style={styles.itemDetails}>Teléfono: {item.telefono || "No especificado"}</Text>
        {item.solicitudReactivacion && !item.estado && (
          <View style={styles.solicitudBanner}>
            <Text style={styles.solicitudText}>Solicitud de reactivación pendiente</Text>
          </View>
        )}
        {item.motivoRechazo && <Text style={styles.itemRechazo}>Motivo: {item.motivoRechazo}</Text>}
        <Text style={styles.itemFecha}>{formatDate(item.fechaCreacion)}</Text>
      </TouchableOpacity>
    )
  }, [handleUsuarioPress, formatDate])

  const renderPublicidadItem = useCallback(({ item }) => {
    const getStatusColor = () => {
      if (item.estado === true) return "#28a745"
      if (item.motivoRechazo) return "#dc3545"
      return "#ffc107"
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobada"
      if (item.motivoRechazo) return "Rechazada"
      return "Pendiente"
    }

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => handlePublicidadPress(item)}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.comercio?.nombre || "Comercio"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.itemDetails}>Descripción: {item.descripcion || "Sin descripción"}</Text>
        <Text style={styles.itemDetails}>Visualizaciones: {item.visualizaciones || 0}</Text>
        {item.motivoRechazo && <Text style={styles.itemRechazo}>Motivo: {item.motivoRechazo}</Text>}
        <Text style={styles.itemFecha}>{formatDate(item.fechaCreacion)}</Text>
      </TouchableOpacity>
    )
  }, [handlePublicidadPress, formatDate])

  // =====================================================
  // COMPUTED VALUES
  // =====================================================
  const pendingResenias = resenias.filter((r) => r.estado === false && !r.motivoRechazo)
  const approvedResenias = resenias.filter((r) => r.estado === true)
  const rejectedResenias = resenias.filter((r) => r.estado === false && r.motivoRechazo)
  const pendingComercios = comercios.filter((c) => c.estado === false && !c.motivoRechazo)
  const approvedComercios = comercios.filter((c) => c.estado === true)
  const rejectedComercios = comercios.filter((c) => c.estado === false && c.motivoRechazo)
  const activeUsuarios = usuarios.filter((u) => u.estado === true)
  const inactiveUsuarios = usuarios.filter((u) => u.estado === false)
  const solicitudesReactivacion = usuarios.filter((u) => u.solicitudReactivacion === true && u.estado === false)
  const pendingPublicidades = publicidades.filter((p) => p.estado === false && !p.motivoRechazo)
  const approvedPublicidades = publicidades.filter((p) => p.estado === true)
  const rejectedPublicidades = publicidades.filter((p) => p.estado === false && p.motivoRechazo)

  // =====================================================
  // ACCESS CHECK
  // =====================================================
  if (!isAuthenticated || user?.iD_RolUsuario !== 2) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No tiene permisos para acceder al panel de administración.</Text>
      </View>
    )
  }

  if (isLoading && !comercios.length && !resenias.length && !usuarios.length && !publicidades.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D838F5" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dashboard" && styles.activeTab]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Text style={[styles.tabText, activeTab === "dashboard" && styles.activeTabText]}>Panel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "resenias" && styles.activeTab]}
          onPress={() => setActiveTab("resenias")}
        >
          <Text style={[styles.tabText, activeTab === "resenias" && styles.activeTabText]}>Reseñas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "comercios" && styles.activeTab]}
          onPress={() => setActiveTab("comercios")}
        >
          <Text style={[styles.tabText, activeTab === "comercios" && styles.activeTabText]}>Comercios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "publicidades" && styles.activeTab]}
          onPress={() => setActiveTab("publicidades")}
        >
          <Text style={[styles.tabText, activeTab === "publicidades" && styles.activeTabText]}>Publicidades</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "usuarios" && styles.activeTab]}
          onPress={() => setActiveTab("usuarios")}
        >
          <Text style={[styles.tabText, activeTab === "usuarios" && styles.activeTabText]}>Usuarios</Text>
        </TouchableOpacity>
      </View>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <ScrollView
          style={styles.dashboardContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#D838F5" />}
        >
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
              <Text style={styles.statLabel}>Solicitudes Reactivación</Text>
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
              <Text style={styles.quickActionText}>Revisar Reseñas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("comercios")}>
              <Text style={styles.quickActionText}>Aprobar Comercios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("publicidades")}>
              <Text style={styles.quickActionText}>Revisar Publicidades</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab("usuarios")}>
              <Text style={styles.quickActionText}>Gestionar Usuarios</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* RESENIAS */}
      {activeTab === "resenias" && (
        <>
          <Text style={styles.sectionTitle}>Reseñas Pendientes ({pendingResenias.length})</Text>
          {pendingResenias.length > 0 ? (
            <FlatList
              data={pendingResenias}
              renderItem={renderReseniaItem}
              keyExtractor={(item) => item.iD_Resenia.toString()}
              style={styles.list}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#D838F5" />}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No hay reseñas pendientes de aprobación.</Text>
            </View>
          )}
        </>
      )}

      {/* COMERCIOS */}
      {activeTab === "comercios" && (
        <>
          <Text style={styles.sectionTitle}>Comercios Pendientes ({pendingComercios.length})</Text>
          {pendingComercios.length > 0 ? (
            <FlatList
              data={pendingComercios}
              renderItem={renderComercioItem}
              keyExtractor={(item) => item.iD_Comercio.toString()}
              style={styles.list}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#D838F5" />}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No hay comercios pendientes de aprobación.</Text>
            </View>
          )}
        </>
      )}

      {/* PUBLICIDADES */}
      {activeTab === "publicidades" && (
        <>
          <Text style={styles.sectionTitle}>Publicidades Pendientes ({pendingPublicidades.length})</Text>
          {pendingPublicidades.length > 0 ? (
            <FlatList
              data={pendingPublicidades}
              renderItem={renderPublicidadItem}
              keyExtractor={(item) => item.iD_Publicidad.toString()}
              style={styles.list}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#D838F5" />}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No hay publicidades pendientes de aprobación.</Text>
            </View>
          )}
        </>
      )}

      {/* USUARIOS */}
      {activeTab === "usuarios" && (
        <>
          {solicitudesReactivacion.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Solicitudes de Reactivación ({solicitudesReactivacion.length})</Text>
              <FlatList
                data={solicitudesReactivacion}
                renderItem={renderUsuarioItem}
                keyExtractor={(item) => `reactivacion-${item.iD_Usuario.toString()}`}
                style={styles.listSmall}
              />
            </>
          )}

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

          <Text style={styles.sectionTitle}>Todos los Usuarios</Text>
          {usuarios.length > 0 ? (
            <FlatList
              data={usuarios}
              renderItem={renderUsuarioItem}
              keyExtractor={(item) => item.iD_Usuario.toString()}
              style={styles.list}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#D838F5" />}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No hay usuarios registrados.</Text>
            </View>
          )}
        </>
      )}

      {/* MODAL RESENIA */}
      <Modal
        visible={reseniaModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setReseniaModalVisible(false)
          setMotivoRechazoResenia("")
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
                  <Text style={styles.detailValue}>{selectedResenia.usuario?.nombreUsuario || "No disponible"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Comercio:</Text>
                  <Text style={styles.detailValue}>{selectedResenia.comercio?.nombre || "Desconocido"}</Text>
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
                      setMotivoRechazoResenia("")
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

      {/* MODAL COMERCIO */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalVisible(false)
          setMotivoRechazoComercio("")
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
                    style={[styles.statusBadge, { backgroundColor: selectedComercio.estado ? "#28a745" : "#ffc107" }]}
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
                  <Text style={styles.detailLabel}>Tipo:</Text>
                  <Text style={styles.detailValue}>{selectedComercio.tipoComercio?.descripcion || "No especificado"}</Text>
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
                    <Text style={styles.detailLabel}>Imagen:</Text>
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: convertBase64ToImage(selectedComercio.foto) }}
                        style={styles.comercioImage}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Imagen:</Text>
                    <View style={styles.noImageContainer}>
                      <Text style={styles.noImageText}>Sin imagen</Text>
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
                      setMotivoRechazoComercio("")
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

      {/* MODAL USUARIO */}
      <Modal
        visible={usuarioModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setUsuarioModalVisible(false)
          setMotivoRechazoUsuario("")
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
                  <View style={styles.solicitudBanner}>
                    <Text style={styles.solicitudText}>Este usuario ha solicitado la reactivación de su cuenta</Text>
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
                      setMotivoRechazoUsuario("")
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

      {/* MODAL PUBLICIDAD */}
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
                  <Text style={styles.detailValue}>{selectedPublicidad.comercio?.nombre || "Desconocido"}</Text>
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
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216, 56, 245, 0.3)",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    marginBottom: -1,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
    color: "#D838F5",
  },
  list: {
    flex: 1,
    marginBottom: 10,
  },
  listSmall: {
    maxHeight: 200,
    marginBottom: 10,
  },
  listItem: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e0e0e0",
    flex: 1,
  },
  itemDetails: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 2,
  },
  itemComercio: {
    fontSize: 14,
    color: "#D838F5",
    marginBottom: 8,
    fontWeight: "600",
  },
  itemComentario: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 8,
    lineHeight: 20,
  },
  itemFecha: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
  },
  itemRechazo: {
    fontSize: 13,
    color: "#ff6b6b",
    marginTop: 8,
    fontStyle: "italic",
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
  noDataContainer: {
    padding: 20,
    alignItems: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#b0b0b0",
    fontStyle: "italic",
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
    fontSize: 12,
    color: "#b0b0b0",
    textAlign: "center",
  },
  quickActions: {
    gap: 10,
    marginTop: 10,
    marginBottom: 30,
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
  usuariosStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(42, 42, 62, 0.6)",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    marginBottom: 15,
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
  solicitudBanner: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.5)",
    marginTop: 8,
  },
  solicitudText: {
    color: "#D838F5",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
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
    fontSize: 14,
    fontWeight: "bold",
    color: "#D838F5",
    width: 100,
  },
  detailValue: {
    fontSize: 14,
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
    marginBottom: 30,
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
  imageContainer: {
    flex: 1,
    marginTop: 10,
  },
  comercioImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "rgba(42, 42, 62, 0.3)",
  },
  noImageContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42, 42, 62, 0.3)",
    borderRadius: 8,
    marginTop: 10,
    minHeight: 80,
  },
  noImageText: {
    fontSize: 14,
    color: "#b0b0b0",
  },
})