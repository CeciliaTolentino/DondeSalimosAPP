

import { useState, useContext, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  SafeAreaView,
} from "react-native"
import { AuthContext } from "../../Apis/AuthContext"
import Apis from "../../Apis/Apis"


const PlaceIcon = ({ tipo }) => {
  const icons = {
    bar: "🍺",

    club: "🪩",
  }
  return <Text style={styles.placeIcon}>{icons[tipo?.toLowerCase()] || icons.default}</Text>
}

const getRelativeTime = (date) => {
  const now = new Date()
  const past = new Date(date)
 const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const pastDate = new Date(past.getFullYear(), past.getMonth(), past.getDate())

  const diffInMs = nowDate - pastDate
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays < 0) return "Próximamente"
  if (diffInDays === 0) return "Hoy"
  if (diffInDays === 1) return "Ayer"
  if (diffInDays < 7) return `Hace ${diffInDays} días`
  if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`
  if (diffInDays < 365) return `Hace ${Math.floor(diffInDays / 30)} meses`
  return `Hace ${Math.floor(diffInDays / 365)} años`
}

const getUserBadges = (totalReseñas, lugaresVisitados) => {
  const badges = []

  // Badges por lugares visitados
  if (lugaresVisitados >= 50) badges.push({ icon: "🎉", text: "Leyenda Nocturna", color: "#FFD700" })
  else if (lugaresVisitados >= 25) badges.push({ icon: "🕒🍹", text: "Cazador/a de Happy Hours", color: "#FF8C00" })
  else if (lugaresVisitados >= 10) badges.push({ icon: "🌟", text: "Explorador/a", color: "#9D8DF1" })

  // Badges por reseñas
  if (totalReseñas >= 100) badges.push({ icon: "💎", text: "Usuario VIP", color: "#FFD700" })
  else if (totalReseñas >= 60) badges.push({ icon: "🏆", text: "Crítico Experto", color: "#FF8C00" })
  else if (totalReseñas >= 30) badges.push({ icon: "📝", text: "Crítico Activo", color: "#D838F5" })
  else if (totalReseñas >= 10) badges.push({ icon: "✍️", text: "Crítico Novato", color: "#9D8DF1" })

  return badges
}

const getBarOwnerBadges = (totalPublicidades, totalReservas) => {
  const badges = []

  // Badges por publicidades
  if (totalPublicidades >= 25) badges.push({ icon: "🎯", text: "Marketing Pro", color: "#FFD700" })
  else if (totalPublicidades >= 10) badges.push({ icon: "📢", text: "Promoción Activa", color: "#FF8C00" })

  // Badges por reservas
  if (totalReservas >= 200) badges.push({ icon: "👑", text: "Comercio Elite", color: "#FFD700" })
  else if (totalReservas >= 100) badges.push({ icon: "⭐", text: "Destino Favorito", color: "#FF8C00" })
  else if (totalReservas >= 50) badges.push({ icon: "📅", text: "Reservas Populares", color: "#9D8DF1" })

  return badges
}


const isPublicidadExpirada = (fechaExpiracion) => {
  if (!fechaExpiracion) return false 
  const now = new Date()
  const expiryDate = new Date(fechaExpiracion)
  return now > expiryDate
}


const getReservaEstado = (reserva) => {
  if (reserva.estado === true) {
    return { text: "Aprobada", style: styles.estadoActivo }
  } else if (reserva.motivoRechazo) {
    return { text: "Rechazada", style: styles.estadoRechazado }
  } else {
    return { text: "Pendiente", style: styles.estadoInactivo }
  }
}

const getReviewStatusBadge = (reseña) => {
  if (reseña.estado) {
    return null // Aprobada, sin badge
  } else if (reseña.motivoRechazo) {
    return { icon: "❌", text: "Rechazada", color: "#FF3B30" }
  } else {
    return { icon: "⏳", text: "Pendiente", color: "#FF9500" }
  }
}

export default function Profile() {
  const { user, isBarOwner, isAdmin, isApproved, updateAuth, buscarUsuarioPorId, eliminarUsuario, logout } =
    useContext(AuthContext)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [phoneNumber, setPhoneNumber] = useState("")

  const [solicitandoReactivacion, setSolicitandoReactivacion] = useState(false)
  const [userStats, setUserStats] = useState({ totalReseñas: 0, lugaresVisitados: 0 })
  const [comercioStats, setComercioStats] = useState({
    reseñasRecibidas: 0,
    visualizacionesTotales: 0,
    totalPublicidades: 0,
    totalReservas: 0,
  })
  const [adminStats, setAdminStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    totalComercios: 0,
    comerciosPendientes: 0,
    totalReseñas: 0,
    reseñasPendientes: 0,
  })
  const [activeTab, setActiveTab] = useState("reseñas")
  const [reseñas, setReseñas] = useState([])
  const [lugaresVisitados, setLugaresVisitados] = useState([])

  const [reseñasRecibidas, setReseñasRecibidas] = useState([])
  const [publicidades, setPublicidades] = useState([])
  const [reservasRecibidas, setReservasRecibidas] = useState([])
  const [showReseñasRecibidasModal, setShowReseñasRecibidasModal] = useState(false)
  const [showPublicidadesModal, setShowPublicidadesModal] = useState(false)
  const [showReseñasModal, setShowReseñasModal] = useState(false)
  const [showLugaresModal, setShowLugaresModal] = useState(false)
  const [showReservasRecibidasModal, setShowReservasRecibidasModal] = useState(false)
  const [editedUser, setEditedUser] = useState({
    nombreUsuario: "",
    telefono: "", // Added telefono to editedUser
  })
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityData, setActivityData] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  const [selectedReviewToEdit, setSelectedReviewToEdit] = useState(null)
  const [showEditReviewModal, setShowEditReviewModal] = useState(false)
  const [editedReviewData, setEditedReviewData] = useState({
    // State for editing review data
    puntuacion: 0,
    comentario: "",
  })
  const [refreshing, setRefreshing] = useState(false)

  const loadAdminStats = async () => {
    try {
      console.log(" Cargando estadísticas de administrador...")

      // Obtener usuarios
      const usuariosResponse = await Apis.obtenerUsuarios()
      const usuarios = usuariosResponse.data || []
      const usuariosActivos = usuarios.filter((u) => u.estado === true)

      // Obtener comercios
      const comerciosResponse = await Apis.obtenerComerciosListado()
      const comercios = comerciosResponse.data || []
      const comerciosPendientes = comercios.filter((c) => c.estado === false)

      // Obtener reseñas
      const reseñasResponse = await Apis.obtenerResenias()
      const reseñas = reseñasResponse.data || []
      const reseñasPendientes = reseñas.filter((r) => r.estado === false)

      setAdminStats({
        totalUsuarios: usuarios.length,
        usuariosActivos: usuariosActivos.length,
        totalComercios: comercios.length,
        comerciosPendientes: comerciosPendientes.length,
        totalReseñas: reseñas.length,
        reseñasPendientes: reseñasPendientes.length,
      })

      console.log("Estadísticas de administrador cargadas")
    } catch (error) {
      console.error(" Error al cargar estadísticas de administrador:", error)
    }
  }

  const loadRecentActivity = async () => {
    setLoadingActivity(true)
    try {
      console.log(" Cargando actividad reciente...")

      // Obtener reseñas
      const reseñasResponse = await Apis.obtenerResenias()
      const reseñas = (reseñasResponse.data || [])
        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
        .slice(0, 5)
        .map((r) => ({
          tipo: "reseña",
          titulo: `Nueva reseña en ${r.comercio?.nombre || "Comercio"}`,
          descripcion: `${r.usuario?.nombreUsuario || "Usuario"} dejó una reseña`,
          fecha: new Date(r.fechaCreacion),
          icon: "⭐",
        }))

      // Obtener comercios
      const comerciosResponse = await Apis.obtenerComerciosListado()
      const comerciosRecientes = (comerciosResponse.data || [])

        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
        .slice(0, 3)
        .map((c) => ({
          tipo: "comercio",
          titulo: `Nuevo comercio registrado`,
          descripcion: c.nombre,
          fecha: new Date(c.fechaCreacion),
          icon: "🏪",
        }))

      // Obtener usuarios
      const usuariosResponse = await Apis.obtenerUsuarios()
      const usuarios = (usuariosResponse.data || [])
        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
        .slice(0, 2)
        .map((u) => ({
          tipo: "usuario",
          titulo: `Nuevo usuario registrado`,
          descripcion: u.nombreUsuario,
          fecha: new Date(u.fechaCreacion),
          icon: "👤",
        }))

      // Combinar y ordenar por fecha
      const allActivity = [...reseñas, ...comerciosRecientes, ...usuarios].sort((a, b) => b.fecha - a.fecha)

      setActivityData(allActivity)
      console.log("Actividad reciente cargada:", allActivity.length, "items")
    } catch (error) {
      console.error(" Error al cargar actividad reciente:", error)
      Alert.alert("Error", "No se pudo cargar la actividad reciente")
    } finally {
      setLoadingActivity(false)
    }
  }

  const handleOpenActivity = async () => {
    setShowActivityModal(true)
    await loadRecentActivity()
  }
  useEffect(() => {
    if (user?.iD_Usuario) {
      console.log(" Usuario ID:", user.iD_Usuario)
      console.log(" Es administrador (isAdmin):", isAdmin)
      console.log(" Es comercio (isBarOwner):", isBarOwner)
      console.log(" Rol del usuario:", user.iD_RolUsuario)

      if (isAdmin) {
        console.log(" Cargando estadísticas de administrador...")
        loadAdminStats()
      } else if (isBarOwner) {
        console.log(" Cargando estadísticas de comercio...")
        loadComercioStats()
        loadReseñasRecibidas()
        loadPublicidades()
        loadReservasRecibidas()
      } else {
        console.log(" Cargando estadísticas de usuario normal...")
        loadUserStats()
        loadUserReseñas()
        loadLugaresVisitados()
      }
    }
  }, [user?.iD_Usuario, isBarOwner, isAdmin])

  const loadComercioStats = async () => {
    if (!user?.iD_Usuario) return

    try {
      console.log(" Cargando estadísticas de comercio para usuario:", user.iD_Usuario)

      // Obtener comercios del usuario
      const comerciosResponse = await Apis.obtenerComerciosListado()
      const userComercios = comerciosResponse.data.filter((c) => c.iD_Usuario == user.iD_Usuario)

      console.log(" Comercios del usuario:", userComercios.length)

      if (userComercios.length === 0) {
        console.log(" Usuario no tiene comercios registrados")
        return
      }

      let totalReviews = 0
      let totalViews = 0
      let totalPublicidades = 0
      let totalReservas = 0
      // Para cada comercio, obtener sus datos usando las funciones específicas
      for (const comercio of userComercios) {
        try {
          // Obtener publicidades por nombre de comercio
          const publicidadesResponse = await Apis.obtenerPublicidadesPorNombreComercio(comercio.nombre)
          const comercioPublicidades = publicidadesResponse.data || []

          console.log(` Publicidades de ${comercio.nombre}:`, comercioPublicidades.length)

          totalPublicidades += comercioPublicidades.length
          // Sumar visualizaciones
          comercioPublicidades.forEach((pub) => {
            totalViews += pub.visualizaciones || 0
          })

          // Obtener reseñas por nombre de comercio
          const reseniasResponse = await Apis.obtenerReseniasPorComercio(comercio.nombre)
          const comercioReviews = reseniasResponse.data || []

          console.log(` Reseñas de ${comercio.nombre}:`, comercioReviews.length)

          totalReviews += comercioReviews.length
        } catch (error) {
          console.error(` Error al cargar datos de ${comercio.nombre}:`, error)
        }
      }

      try {
        const reservasResponse = await Apis.obtenerReservasListado()
        const comercioIds = userComercios.map((c) => c.iD_Comercio)
        const userReservas = reservasResponse.data.filter((reserva) => comercioIds.includes(reserva.iD_Comercio))
        totalReservas = userReservas.length
        console.log(" Total reservas:", totalReservas)
      } catch (error) {
        console.error(" Error al cargar reservas:", error)
      }

      console.log(" Total reseñas recibidas:", totalReviews)
      console.log(" Total visualizaciones:", totalViews)
      console.log(" Total publicidades:", totalPublicidades)

      setComercioStats({
        reseñasRecibidas: totalReviews,
        visualizacionesTotales: totalViews,
        totalPublicidades: totalPublicidades,
        totalReservas: totalReservas,
      })
    } catch (error) {
      console.error(" Error al cargar estadísticas de comercio:", error)
    }
  }

  const loadReseñasRecibidas = async () => {
    if (!user?.iD_Usuario) return

    try {
      // Obtener comercios del usuario
      const comerciosResponse = await Apis.obtenerComerciosListado()
      const userComercios = comerciosResponse.data.filter((c) => c.iD_Usuario == user.iD_Usuario)

      if (userComercios.length === 0) {
        console.log(" Usuario no tiene comercios para cargar reseñas")
        return
      }

      let allReseñas = []

      // Para cada comercio, obtener sus reseñas usando la función específica
      for (const comercio of userComercios) {
        try {
          const reseniasResponse = await Apis.obtenerReseniasPorComercio(comercio.nombre)
          const comercioReviews = reseniasResponse.data || []
          const reseniasAprobadas = comercioReviews.filter((r) => r.estado === true && !r.motivoRechazo)

          const formattedReseñas = reseniasAprobadas.map((r) => ({
            id: r.iD_Resenia,
            usuario: r.usuario?.nombreUsuario || "Usuario anónimo",
            comercio: comercio.nombre,
            comentario: r.comentario,
            fecha: new Date(r.fechaCreacion),
          }))

          allReseñas = [...allReseñas, ...formattedReseñas]
        } catch (error) {
          console.error(` Error al cargar reseñas de ${comercio.nombre}:`, error)
        }
      }

      setReseñasRecibidas(allReseñas)
      console.log(" ✅ Reseñas recibidas cargadas:", allReseñas.length)
    } catch (error) {
      console.error(" Error al cargar reseñas recibidas:", error)
      setReseñasRecibidas([])
    }
  }

  const loadPublicidades = async () => {
    if (!user?.iD_Usuario) return

    try {
      // Obtener comercios del usuario
      const comerciosResponse = await Apis.obtenerComerciosListado()
      const userComercios = comerciosResponse.data.filter((c) => c.iD_Usuario == user.iD_Usuario)

      if (userComercios.length === 0) {
        console.log(" Usuario no tiene comercios para cargar publicidades")
        return
      }

      let allPublicidades = []

      // Para cada comercio, obtener sus publicidades usando la función específica
      for (const comercio of userComercios) {
        try {
          const publicidadesResponse = await Apis.obtenerPublicidadesPorNombreComercio(comercio.nombre)
          const comercioPublicidades = publicidadesResponse.data || []

          const formattedPublicidades = comercioPublicidades.map((p) => {
            console.log(` Publicidad ${p.iD_Publicidad}: estado=${p.estado}, fechaExpiracion=${p.fechaExpiracion}`)

            return {
              id: p.iD_Publicidad,
              comercio: comercio.nombre,
              descripcion: p.descripcion || "Sin descripción",
              visualizaciones: p.visualizaciones || 0,
              estado: p.estado,
              fechaCreacion: new Date(p.fechaCreacion),
              fechaExpiracion: p.fechaExpiracion ? new Date(p.fechaExpiracion) : null,
              imagenUrl: p.imagenUrl
              
            }
          })

          allPublicidades = [...allPublicidades, ...formattedPublicidades]
        } catch (error) {
          console.error(` Error al cargar publicidades de ${comercio.nombre}:`, error)
        }
      }

      setPublicidades(allPublicidades)
      console.log("Publicidades cargadas:", allPublicidades.length)
    } catch (error) {
      console.error(" Error al cargar publicidades:", error)
      setPublicidades([])
    }
  }
  const loadUserReseñas = async () => {
     if (!user?.estado) {
    console.log("Usuario desactivado, no se cargan reseñas")
    setReseñas([])
    return
  }
    try {
      const response = await Apis.obtenerResenias()
      if (response.data) {
        const userReseñas = response.data.filter((r) => r.iD_Usuario == user.iD_Usuario)

        const formattedReseñass = userReseñas.map((r) => ({
          id: r.iD_Resenia,
          lugar: r.comercio?.nombre || "Lugar desconocido",
          tipo: r.comercio?.tipo || "bar", // Assuming 'tipo' field exists on comercio for the icon
          comentario: r.comentario,
          puntuacion: r.puntuacion || 0,
          fecha: new Date(r.fechaCreacion),
          estado: r.estado, // true = aprobada, false = pendiente o rechazada
          motivoRechazo: r.motivoRechazo, // Para distinguir rechazada de pendiente
          iD_Comercio: r.iD_Comercio,
        }))

        setReseñas(formattedReseñass)
        console.log(" ✅ Reseñas del usuario cargadas:", formattedReseñass.length)
      }
    } catch (error) {
      console.error(" Error al cargar reseñas del usuario:", error)
      setReseñas([])
    }
  }

  const loadLugaresVisitados = async () => {
    try {
      const response = await Apis.obtenerReservasListado()
      if (response.data) {
         const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
           const userReservas = response.data.filter(
       (r) => {
            if (r.iD_Usuario !== user.iD_Usuario || r.estado !== true) {
              return false
            }
            
            const reservaDate = new Date(r.fechaReserva)
            const reservaDay = new Date(reservaDate.getFullYear(), reservaDate.getMonth(), reservaDate.getDate())
            
            // Solo incluir si la reserva es hoy o en el pasado
            return reservaDay <= today
          }
        )

        const lugaresMap = new Map()

        userReservas.forEach((reserva) => {
          const comercioId = reserva.iD_Comercio
          const comercioNombre = reserva.comercio?.nombre || "Lugar desconocido"
          const comercioDireccion = reserva.comercio?.direccion || "Dirección no disponible"

          if (lugaresMap.has(comercioId)) {
            const lugar = lugaresMap.get(comercioId)
            lugar.visitas++
            const reservaDate = new Date(reserva.fechaReserva)
            if (reservaDate > lugar.ultimaVisita) {
              lugar.ultimaVisita = reservaDate
            }
          } else {
            lugaresMap.set(comercioId, {
              id: comercioId,
              nombre: comercioNombre,
              direccion: comercioDireccion,
              visitas: 1,
              ultimaVisita: new Date(reserva.fechaReserva),
            })
          }
        })

        const lugaresArray = Array.from(lugaresMap.values())
        setLugaresVisitados(lugaresArray)
        console.log("Lugares visitados cargados:", lugaresArray.length)
      }
    } catch (error) {
      console.error(" Error al cargar lugares visitados:", error)
      setLugaresVisitados([])
    }
  }

  const loadUserStats = async () => {
    try {
      const [reseñasResponse, reservasResponse] = await Promise.all([
        Apis.obtenerResenias(),
        Apis.obtenerReservasListado(),
      ])

      if (reseñasResponse.data && reservasResponse.data) {
        const userReseñas = reseñasResponse.data.filter((r) => r.iD_Usuario == user.iD_Usuario && r.estado === true)

        const userReservas = reservasResponse.data.filter(
          (r) => r.iD_Usuario == user.iD_Usuario && r.estado === true
        )
        const uniquePlaces = new Set(userReservas.map((r) => r.iD_Comercio))

        setUserStats({
          totalReseñas: userReseñas.length,
          lugaresVisitados: uniquePlaces.size,
        })
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    }
  }
  const loadReservasRecibidas = async () => {
    // Obtener comercios del usuario primero para obtener sus IDs
    let comercioIds = []
    let userComerciosData = [] // To store comercios data for later use
    try {
      const comerciosResponse = await Apis.obtenerComerciosListado()
      userComerciosData = comerciosResponse.data.filter((c) => c.iD_Usuario === user.iD_Usuario)
      comercioIds = userComerciosData.map((c) => c.iD_Comercio)
      console.log(" Comercios del usuario:", userComerciosData.length)
    } catch (error) {
      console.error(" Error al obtener comercios para IDs:", error)
      setReservasRecibidas([]) // Resetear en caso de error
      return // Salir si no se pueden obtener los comercios
    }

    if (!comercioIds || comercioIds.length === 0) {
      console.log(" No hay comercios para cargar reservas")
      return
    }

    try {
      console.log("Llamando a obtenerReservasListado...")
      console.log(" URL:", `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Reservas/listado`)
      console.log(" Método: GET")

    

      const reservasResponse = await Apis.obtenerReservasListado()

      console.log("Respuesta recibida, status:", reservasResponse.status)
      console.log(" Datos recibidos:", reservasResponse.data?.length || 0, "reservas")

      const userReservas = reservasResponse.data.filter((reserva) => comercioIds.includes(reserva.iD_Comercio))

      const formattedReservas = userReservas.map((r) => {
        console.log(
          ` Reserva ${r.iD_Reserva}: estado=${r.estado}, motivoRechazo=${r.motivoRechazo}, comenzales=${r.comenzales}`,
        )

        return {
          id: r.iD_Reserva,
          comercio: userComerciosData.find((c) => c.iD_Comercio === r.iD_Comercio)?.nombre || "Comercio desconocido",
          usuario: r.usuario?.nombreUsuario || "Usuario desconocido",
          fecha: new Date(r.fechaReserva),
          cantidadPersonas: r.comenzales || 0, // Usando comenzales del backend
          estado: r.estado, // true = aprobada, false = pendiente o rechazada
          motivoRechazo: r.motivoRechazo, // Para distinguir rechazada de pendiente
        }
      })

      setReservasRecibidas(formattedReservas)
      console.log("Reservas recibidas cargadas:", formattedReservas.length)
    } catch (error) {
      console.error("Error al cargar reservas del comercio:", {
        error: error.message || "Unknown error",
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      })

    

      setReservasRecibidas([])
    }
  }
  useEffect(() => {
    if (user?.iD_Usuario) {
      console.log(" Usuario ID:", user.iD_Usuario)
      console.log(" Es administrador (isAdmin):", isAdmin)
      console.log(" Es comercio (isBarOwner):", isBarOwner)
      console.log(" Rol del usuario:", user.iD_RolUsuario)

      if (isAdmin) {
        console.log(" Cargando estadísticas de administrador...")
        loadAdminStats()
      } else if (isBarOwner) {
        console.log(" Cargando estadísticas de comercio...")
        loadComercioStats()
        loadReseñasRecibidas()
        loadPublicidades()
        loadReservasRecibidas()
      } else {
        console.log(" Cargando estadísticas de usuario normal...")
        loadUserStats()
        loadUserReseñas()
        loadLugaresVisitados()
      }
    }
  }, [user?.iD_Usuario, isBarOwner, isAdmin])

  useEffect(() => {
    if (user) {
      setEditedUser({
        nombreUsuario: user.nombreUsuario || "",
        telefono: user.telefono?.replace(/\s/g, "") || "", // Initialize telefono here
      })

      if (user.telefono) {
        setPhoneNumber(user.telefono.replace(/\s/g, ""))
      } else {
        setPhoneNumber("")
      }
    }
  }, [user])

 
  const handleSolicitarReactivacion = async () => {
    Alert.alert(
      "Solicitar Reactivación",
      "¿Desea solicitar la reactivación de su cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Solicitar",
          onPress: async () => {
            try {
              setSolicitandoReactivacion(true)

              const updatedUser = {
                ...user,
                solicitudReactivacion: true, // Flag para indicar que solicitó reactivación
              }

              await Apis.actualizardatosUsuario(updatedUser)

           

              // Actualizar el contexto local
              const updatedUserFromBackend = await buscarUsuarioPorId(user.iD_Usuario)
              if (updatedUserFromBackend) {
                updateAuth(updatedUserFromBackend, true)
              }
            } catch (error) {
              console.error("Error al solicitar reactivación:", error)
              Alert.alert("Error", "No se pudo enviar la solicitud de reactivación")
            } finally {
              setSolicitandoReactivacion(false)
            }
          },
        },
      ],
    )
  }
  const handleSave = async () => {
    if (!editedUser.nombreUsuario.trim()) {
      Alert.alert("Error", "El nombre de usuario es obligatorio")
      return
    }

    // Phone number validation moved to here from setPhoneNumber handler
    if (phoneNumber && phoneNumber.length !== 10) {
      Alert.alert("Error", "El número de teléfono debe tener 10 dígitos")
      return
    }

    setIsLoading(true)
    try {
      const updateData = {
        iD_Usuario: user.iD_Usuario,
        nombreUsuario: editedUser.nombreUsuario.trim(),
        telefono: phoneNumber,
        correo: user.correo,
        uid: user.uid,
        estado: true,
        fechaCreacion: user.fechaCreacion,
        iD_RolUsuario: user.iD_RolUsuario,
      }
      console.log("ANTES de actualizar - isBarOwner:", isBarOwner)
      console.log("ANTES de actualizar - user.iD_RolUsuario:", user.iD_RolUsuario)
      console.log("Actualizando usuario con datos:", updateData)

      console.log("ANTES de actualizar - isApproved:", isApproved)
      await Apis.actualizardatosUsuario(updateData)

      const updatedUser = await buscarUsuarioPorId(user.iD_Usuario)
      console.log("Usuario actualizado desde el backend:", updatedUser)
      console.log("Teléfono del usuario actualizado:", updatedUser?.telefono)
      console.log("updatedUser.iD_RolUsuario:", updatedUser?.iD_RolUsuario)
      console.log("DESPUÉS de actualizar - isBarOwner:", isBarOwner)
      console.log("DESPUÉS de actualizar - isApproved:", isApproved)
      // The context will update naturally through buscarUsuarioPorId
      if (updatedUser) {
        updateAuth(updatedUser, true)
      }

      setIsEditing(false)
      Alert.alert("Éxito", "Perfil actualizado correctamente")
    } catch (err) {
      let errorMessage = "No se pudo actualizar el perfil. Por favor, intente de nuevo."
      
      if (err.response?.data) {
        const errorData = err.response.data
        
        if (typeof errorData === "string" && errorData.includes("palabras no permitidas")) {
          errorMessage = "El nombre de usuario contiene palabras no permitidas. Por favor, elija otro nombre."
        }
        else if (typeof errorData === "string" && errorData.includes("nombre de usuario ya está en uso")) {
          errorMessage = "El nombre de usuario ya está en uso. Por favor, elija otro nombre."
        }
        // Otros errores de validación
        else if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0]
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0]
          }
        }
        // Mensaje genérico del backend
        else if (errorData.message) {
          errorMessage = errorData.message
        }
        // Only log unexpected errors to console
        else {
          console.error("Error inesperado al actualizar datos de usuario:", errorData)
        }
      } else {
        // Only log unexpected errors to console
        console.error("Error al actualizar el perfil:", err)
      }
      
      Alert.alert("Error", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }


  const handleCancel = () => {
    setEditedUser({
      nombreUsuario: user.nombreUsuario || "",
      telefono: user.telefono?.replace(/\s/g, "") || "", // Reset telefono
    })

    if (user.telefono) {
      setPhoneNumber(user.telefono.replace(/\s/g, ""))
    } else {
      setPhoneNumber("")
    }

    setIsEditing(false)
  }


 



  const handleRefreshHistory = () => {
    loadUserReseñas()
    loadLugaresVisitados()
  }



  const handleEditReview = (reseña) => {
    setSelectedReviewToEdit(reseña)
    setEditedReviewData({
      puntuacion: reseña.puntuacion,
      comentario: reseña.comentario,
    })
    setShowEditReviewModal(true)
  }

  const handleUpdateReview = async () => {
    if (!selectedReviewToEdit) return

    if (editedReviewData.puntuacion === 0) {
      Alert.alert("Error", "Debes seleccionar una puntuación del 1 al 5")
      return
    }

    if (!editedReviewData.comentario.trim()) {
      Alert.alert("Error", "Debes escribir un comentario")
      return
    }

    try {
      await Apis.actualizarResenia(selectedReviewToEdit.id, {
        // Assuming actualizarResenia takes ID and data
        iD_Resenia: selectedReviewToEdit.id,
        iD_Usuario: user.iD_Usuario,
        iD_Comercio: selectedReviewToEdit.iD_Comercio,
        comentario: editedReviewData.comentario,
        puntuacion: editedReviewData.puntuacion,
        estado: false, // Volver a pendiente
        motivoRechazo: null, // Limpiar el motivo de rechazo
      })

      Alert.alert("¡Éxito!", "Tu reseña ha sido actualizada y está pendiente de aprobación por el administrador")
      setShowEditReviewModal(false)
      setSelectedReviewToEdit(null)
      loadUserReseñas() // Recargar reseñas
    } catch (error) {
      console.error("Error al actualizar reseña:", error)
      Alert.alert("Error", "No se pudo actualizar la reseña. Intenta de nuevo.")
    }
  }

 
const handleDeleteAccountRequest = () => {
    const tipoUsuario = user.iD_RolUsuario === 3 ? "comercio" : "comun"

    Alert.alert(
      "Eliminar Cuenta",
      user.iD_RolUsuario === 3
        ? "Al eliminar tu cuenta, se eliminarán también todos tus comercios, publicidades y reseñas asociadas. Esta acción no se puede deshacer. ¿Estás seguro?"
        : "Al eliminar tu cuenta, se eliminarán también todas tus reseñas y reservas. Esta acción no se puede deshacer. ¿Estás seguro?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true)
            try {
              console.log(`🗑️ Eliminando usuario ${user.iD_Usuario || user.uid} (${tipoUsuario})`)
              // Assuming eliminarUsuarioEnCascada is the new API call
              
              await eliminarUsuario(user.iD_Usuario)
              Alert.alert("Cuenta eliminada", "Tu cuenta y todos sus datos han sido eliminados exitosamente.")
              await logout()
            } catch (error) {
              console.error("❌ Error al eliminar cuenta:", error)
              // More specific error message
              Alert.alert("Error", `No se pudo eliminar la cuenta: ${error.message || "Error desconocido"}`)
            } finally {
              setIsLoading(false)
            }
          },
        },
      ],
    )
  }
  
  const handleLogout = () => {
    Alert.alert("Confirmar Cierre de Sesión", "¿Está seguro que desea cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar Sesión", style: "destructive", onPress: logout },
    ])
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No hay usuario autenticado</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D838F5" />
        <Text style={styles.loadingText}>Procesando...</Text>
      </View>
    )
  }

  if (isAdmin) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.adminHeader}>
          <Text style={styles.adminBadge}>👑 ADMINISTRADOR</Text>
          <Text style={styles.adminTitle}>Panel de Control</Text>
        </View>

        {user.photo && (
          <View style={styles.photoContainer}>
            <View style={styles.adminPhotoGlow}>
              <Image source={{ uri: user.photo }} style={styles.profilePhoto} />
            </View>
          </View>
        )}

        <View style={styles.adminStatsRow}>
          <View style={styles.adminStatCard}>
            <Text style={styles.adminStatIcon}>👥</Text>
            <Text style={styles.adminStatNumber}>{adminStats.totalUsuarios}</Text>
            <Text style={styles.adminStatLabel}>Usuarios Totales</Text>
            <Text style={styles.adminStatSubtext}>{adminStats.usuariosActivos} activos</Text>
          </View>

          <View style={styles.adminStatCard}>
            <Text style={styles.adminStatIcon}>🏪</Text>
            <Text style={styles.adminStatNumber}>{adminStats.totalComercios}</Text>
            <Text style={styles.adminStatLabel}>Comercios</Text>
            <Text style={styles.adminStatSubtext}>{adminStats.comerciosPendientes} pendientes</Text>
          </View>

          <View style={styles.adminStatCard}>
            <Text style={styles.adminStatIcon}>⭐</Text>
            <Text style={styles.adminStatNumber}>{adminStats.totalReseñas}</Text>
            <Text style={styles.adminStatLabel}>Reseñas</Text>
            <Text style={styles.adminStatSubtext}>{adminStats.reseñasPendientes} pendientes</Text>
          </View>
        </View>

        <View style={styles.adminInfoSection}>
          <Text style={styles.adminSectionTitle}>Información del Administrador</Text>

          <View style={styles.adminInfoCard}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.adminInfoValue}>{user.nombreUsuario || user.displayName || "Sin nombre"}</Text>
          </View>

          <View style={styles.adminInfoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.adminInfoValue}>{user.correo || user.email || "Sin email"}</Text>
          </View>

          <View style={styles.adminInfoCard}>
            <Text style={styles.infoLabel}>Rol</Text>
            <Text style={styles.adminInfoValue}>Administrador del Sistema</Text>
          </View>
        </View>

        <View style={styles.adminActionsSection}>
          <Text style={styles.adminSectionTitle}>Herramientas de Gestión</Text>

          <TouchableOpacity style={styles.adminActionButton} onPress={handleOpenActivity}>
            <Text style={styles.adminActionIcon}>🔥</Text>
            <View style={styles.adminActionTextContainer}>
              <Text style={styles.adminActionTitle}>Actividad Reciente</Text>
              <Text style={styles.adminActionSubtitle}>Últimas acciones y eventos del sistema</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showActivityModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowActivityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🔥 Actividad Reciente</Text>
                <TouchableOpacity onPress={() => setShowActivityModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {loadingActivity ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <Text style={styles.modalLoadingText}>Cargando actividad...</Text>
                </View>
              ) : (
                <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
                  {activityData.length > 0 ? (
                    activityData.map((item, index) => (
                      <View key={index} style={styles.activityItem}>
                        <Text style={styles.activityIcon}>{item.icon}</Text>
                        <View style={styles.activityInfo}>
                          <Text style={styles.activityTitle}>{item.titulo}</Text>
                          <Text style={styles.activityDescription}>{item.descripcion}</Text>
                          <Text style={styles.activityDate}>{getRelativeTime(item.fecha)}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyActivityText}>No hay actividad reciente</Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={logout}>
            <Text style={styles.buttonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // Agregar banner de usuario desactivado
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {user && !user.estado && (
          <View style={styles.desactivadoBanner}>
            <Text style={styles.desactivadoTitle}>⚠️ Cuenta Desactivada</Text>
            <Text style={styles.desactivadoText}>
              Tu cuenta ha sido temporalmente desactivada por inactividad. No te preocupes, puedes reactivarla fácilmente para seguir disfrutando de nuestra app.
            </Text>
            {user.motivoRechazo && (
              <View style={styles.motivoRechazoContainer}>
                <Text style={styles.motivoRechazoLabel}>Motivo:</Text>
                <Text style={styles.motivoRechazoText}>{user.motivoRechazo}</Text>
              </View>
            )}
            {!user.solicitudReactivacion ? (
              <TouchableOpacity
                style={styles.solicitarReactivacionButton}
                onPress={handleSolicitarReactivacion}
                disabled={solicitandoReactivacion}
              >
                {solicitandoReactivacion ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.solicitarReactivacionText}>Solicitar Reactivación</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.solicitudPendienteContainer}>
                <Text style={styles.solicitudPendienteText}>
                  ✓ Solicitud de reactivación enviada. Esperando respuesta del administrador.
                </Text>
              </View>
            )}
          </View>
        )}

        {user.photo && (
          <View style={styles.photoContainer}>
            <View style={isBarOwner ? styles.barOwnerPhotoGlow : styles.photoGlow}>
              <Image source={{ uri: user.photo }} style={styles.profilePhoto} />
            </View>
          </View>
        )}

        {!isEditing ? (
          <>
            {isBarOwner ? (
              <>
                <View style={styles.barOwnerHeader}>
                  <Text style={styles.barOwnerBadge}>🏪 DUEÑO DEL COMERCIO</Text>
                  <Text style={styles.barOwnerTitle}>Mi Negocio</Text>
                </View>
                {getBarOwnerBadges(comercioStats.totalPublicidades, comercioStats.totalReservas).length > 0 && (
                  <View style={styles.badgesContainer}>
                    {getBarOwnerBadges(comercioStats.totalPublicidades, comercioStats.totalReservas).map(
                      (badge, index) => (
                        <View key={index} style={[styles.badge, { borderColor: badge.color }]}>
                          <Text style={styles.badgeIcon}>{badge.icon}</Text>
                          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                        </View>
                      ),
                    )}
                  </View>
                )}

                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{comercioStats.reseñasRecibidas}</Text>
                    <Text style={styles.statLabel}>Reseñas Recibidas</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{comercioStats.visualizacionesTotales}</Text>
                    <Text style={styles.statLabel}>Visualizaciones</Text>
                  </View>
                </View>
            <View style={styles.historyContainer}>
                <View style={styles.historySection}>
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[styles.tab, activeTab === "reseñas" && styles.activeTab]}
                      onPress={() => setActiveTab("reseñas")}
                    >
                      <Text style={[styles.tabText, activeTab === "reseñas" && styles.activeTabText]}>
                        Reseñas Recibidas
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, activeTab === "publicidades" && styles.activeTab]}
                      onPress={() => setActiveTab("publicidades")}
                    >
                      <Text style={[styles.tabText, activeTab === "publicidades" && styles.activeTabText]}>
                        Mis Publicidades
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, activeTab === "reservas" && styles.activeTab]}
                      onPress={() => setActiveTab("reservas")}
                    >
                      <Text style={[styles.tabText, activeTab === "reservas" && styles.activeTabText]}>
                        Reservas Recibidas
                      </Text>
                    </TouchableOpacity>
                  </View>
</View>
                  <ScrollView style={styles.historyContent} showsVerticalScrollIndicator={false}>
                    {activeTab === "reseñas" ? (
                      reseñasRecibidas.length > 0 ? (
                        <>
                          {reseñasRecibidas.slice(0, 2).map((reseña) => (
                            <View key={reseña.id} style={styles.reviewCard}>
                              <View style={styles.reviewHeader}>
                                <View style={styles.reviewHeaderText}>
                                  <Text style={styles.reviewPlace}>{reseña.comercio}</Text>
                                  <Text style={styles.reviewUser}>Por: {reseña.usuario}</Text>
                                  <Text style={styles.reviewDate}>{getRelativeTime(reseña.fecha)}</Text>
                                </View>
                              </View>
                              <Text style={styles.reviewComment} numberOfLines={3}>
                                {reseña.comentario}
                              </Text>
                            </View>
                          ))}
                          {reseñasRecibidas.length > 2 && (
                            <TouchableOpacity
                              style={styles.verMasButton}
                              onPress={() => setShowReseñasRecibidasModal(true)}
                            >
                              <Text style={styles.verMasText}>Ver todas ({reseñasRecibidas.length})</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <Text style={styles.emptyText}>No has recibido reseñas aún</Text>
                      )
                    ) : activeTab === "publicidades" ? (
                      publicidades.length > 0 ? (
                        <>
                          {publicidades.slice(0, 2).map((pub) => {
                            const isExpirada = isPublicidadExpirada(pub.fechaExpiracion)

                            return (
                              <View key={pub.id} style={styles.publicidadCard}>
                                <View style={styles.publicidadHeader}>
                                  <View style={styles.publicidadInfo}>
                                    <Text style={styles.publicidadComercio}>{pub.comercio}</Text>
                                    <Text style={styles.publicidadDescripcion}>{pub.descripcion}</Text>
                                    <Text style={styles.publicidadDate}>{getRelativeTime(pub.fechaCreacion)}</Text>
                                  </View>
                                  <View style={styles.visualizacionesBadge}>
                                    <Text style={styles.visualizacionesNumber}>{pub.visualizaciones}</Text>
                                    <Text style={styles.visualizacionesLabel}>vistas</Text>
                                  </View>
                                </View>
                                <View style={styles.publicidadFooter}>
                                  {isExpirada ? (
                                    <View style={[styles.estadoBadge, styles.estadoExpirado]}>
                                      <Text style={styles.estadoText}>⌛ Expirada</Text>
                                    </View>
                                  ) : (
                                    <View
                                      style={[
                                        styles.estadoBadge,
                                        pub.estado ? styles.estadoActivo : styles.estadoInactivo,
                                      ]}
                                    >
                                      <Text style={styles.estadoText}>{pub.estado ? "Activa" : "Inactiva"}</Text>
                                    </View>
                                  )}
                                  {pub.fechaExpiracion && (
                                    <Text style={styles.expiracionText}>
                                      {isExpirada ? "Expiró:" : "Expira:"} {getRelativeTime(pub.fechaExpiracion)}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            )
                          })}
                          {publicidades.length > 2 && (
                            <TouchableOpacity
                              style={styles.verMasButton}
                              onPress={() => setShowPublicidadesModal(true)}
                            >
                              <Text style={styles.verMasText}>Ver todas ({publicidades.length})</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <Text style={styles.emptyText}>No tienes publicidades aún</Text>
                      )
                    ) : activeTab === "reservas" ? (
                      reservasRecibidas.length > 0 ? (
                        <>
                          {reservasRecibidas.slice(0, 2).map((reserva) => {
                            const estadoInfo = getReservaEstado(reserva)

                            return (
                              <View key={reserva.id} style={styles.reservaCard}>
                                <View style={styles.reservaHeader}>
                                  <View style={styles.reservaInfo}>
                                    <Text style={styles.reservaComercio}>{reserva.comercio}</Text>
                                    <Text style={styles.reservaUsuario}>Cliente: {reserva.usuario}</Text>
                                    <Text style={styles.reservaDate}>{getRelativeTime(reserva.fecha)}</Text>
                                  </View>
                                  <View style={styles.reservaPersonasBadge}>
                                    <Text style={styles.reservaPersonasNumber}>{reserva.cantidadPersonas}</Text>
                                    <Text style={styles.reservaPersonasLabel}>personas</Text>
                                  </View>
                                </View>
                                <View style={styles.reservaFooter}>
                                  <View style={[styles.estadoBadge, estadoInfo.style]}>
                                    <Text style={styles.estadoText}>{estadoInfo.text}</Text>
                                  </View>
                                </View>
                              </View>
                            )
                          })}
                          {reservasRecibidas.length > 2 && (
                            <TouchableOpacity
                              style={styles.verMasButton}
                              onPress={() => setShowReservasRecibidasModal(true)}
                            >
                              <Text style={styles.verMasText}>Ver todas ({reservasRecibidas.length})</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <Text style={styles.emptyText}>No has recibido reservas aún</Text>
                      )
                    ) : (
                      <></>
                    )}
                  </ScrollView>
                </View>
              </>
            ) : (
              <>
                <View style={styles.userHeader}>
                  <Text style={styles.userBadge}>👤 USUARIO</Text>
                  <Text style={styles.userTitle}>Mi Perfil</Text>
                </View>
                {getUserBadges(userStats.totalReseñas, userStats.lugaresVisitados).length > 0 && (
                  <View style={styles.badgesContainer}>
                    {getUserBadges(userStats.totalReseñas, userStats.lugaresVisitados).map((badge, index) => (
                      <View key={index} style={[styles.badge, { borderColor: badge.color }]}>
                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{userStats.totalReseñas}</Text>
                    <Text style={styles.statLabel}>Reseñas</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{userStats.lugaresVisitados}</Text>
                    <Text style={styles.statLabel}>Lugares</Text>
                  </View>
                </View>

                {/* History Section for Regular Users */}
                {!isBarOwner && (
                  <View style={styles.historyContainer}>
                    <View style={styles.tabsAndRefreshContainer}>
                      <View style={styles.tabsContainer}>
                        <TouchableOpacity
                          style={[styles.tab, activeTab === "reseñas" && styles.activeTab]}
                          onPress={() => setActiveTab("reseñas")}
                        >
                          <Text style={[styles.tabText, activeTab === "reseñas" && styles.activeTabText]}>
                            Mis Reseñas
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tab, activeTab === "lugares" && styles.activeTab]}
                          onPress={() => setActiveTab("lugares")}
                        >
                          <Text style={[styles.tabText, activeTab === "lugares" && styles.activeTabText]}>
                            Lugares Visitados
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={handleRefreshHistory}
                        disabled={refreshing}
                      >
                        <Text style={styles.refreshIcon}>{refreshing ? "⟳" : "↻"}</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.historyContent} showsVerticalScrollIndicator={false}>
                      {activeTab === "reseñas" ? (
                        reseñas.length > 0 ? (
                          <>
                            {reseñas.slice(0, 3).map((reseña) => {
                              const statusBadge = getReviewStatusBadge(reseña)
                              return (
                                <View key={reseña.id} style={styles.reviewCard}>
                                  <View style={styles.reviewHeader}>
                                    <PlaceIcon tipo={reseña.tipo} />
                                    <View style={styles.reviewHeaderText}>
                                      <Text style={styles.reviewPlace}>{reseña.lugar}</Text>
                                      <Text style={styles.reviewDate}>{getRelativeTime(reseña.fecha)}</Text>
                                    </View>
                                    {statusBadge && (
                                      <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
                                        <Text style={styles.statusBadgeText}>
                                          {statusBadge.icon} {statusBadge.text}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={styles.starsContainer}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Text key={star} style={styles.star}>
                                        {star <= reseña.puntuacion ? "⭐" : "☆"}
                                      </Text>
                                    ))}
                                  </View>
                                  <Text style={styles.reviewComment}>{reseña.comentario}</Text>
                                  {reseña.motivoRechazo && (
                                    <View style={styles.rejectionContainer}>
                                      <Text style={styles.rejectionLabel}>Motivo del rechazo:</Text>
                                      <Text style={styles.rejectionText}>{reseña.motivoRechazo}</Text>
                                      <TouchableOpacity
                                        style={styles.editReviewButton}
                                        onPress={() => handleEditReview(reseña)}
                                      >
                                        <Text style={styles.editReviewButtonText}>✏️ Editar y Reenviar</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              )
                            })}
                            {reseñas.length > 3 && (
                              <TouchableOpacity style={styles.verMasButton} onPress={() => setShowReseñasModal(true)}>
                                <Text style={styles.verMasText}>Ver todas ({reseñas.length})</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          <Text style={styles.emptyText}>No has dejado reseñas aún</Text>
                        )
                      ) : lugaresVisitados.length > 0 ? (
                        <>
                          {lugaresVisitados.slice(0, 3).map((lugar) => (
                            <View key={lugar.id} style={styles.placeCard}>
                              <View style={styles.placeHeader}>
                                <View style={styles.placeInfo}>
                                  <Text style={styles.placeName}>{lugar.nombre}</Text>
                                  <Text style={styles.placeAddress}>{lugar.direccion}</Text>
                                </View>
                                <View style={styles.visitBadge}>
                                  <Text style={styles.visitBadgeText}>{lugar.visitas} visitas</Text>
                                </View>
                              </View>
                              <Text style={styles.placeDate}>Última visita: {getRelativeTime(lugar.ultimaVisita)}</Text>
                            </View>
                          ))}
                          {lugaresVisitados.length > 3 && (
                            <TouchableOpacity style={styles.verMasButton} onPress={() => setShowLugaresModal(true)}>
                              <Text style={styles.verMasText}>Ver todos ({lugaresVisitados.length})</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <Text style={styles.emptyText}>No has visitado lugares aún</Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>Nombre de usuario *</Text>
            <TextInput
              style={styles.input}
              value={editedUser.nombreUsuario}
              onChangeText={(text) => setEditedUser({ ...editedUser, nombreUsuario: text })}
              placeholder="Nombre de usuario"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
            />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10)
                setPhoneNumber(cleaned)
              }}
              placeholder="1132419131 (10 dígitos)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Text style={styles.helperText}>Ingrese 10 dígitos sin espacios ni guiones</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.buttonText}>Guardar cambios</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Bar Owner Profile Section (New) */}
        {isBarOwner && !isAdmin && (
          <View style={styles.barOwnerProfileSection}>
            <Text style={styles.sectionTitle}>Configuración de Cuenta</Text>

           
                <View style={styles.userInfoCard}>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Nombre:</Text>
                    <Text style={styles.userInfoValue}>{user.nombreUsuario || user.displayName || "Sin nombre"}</Text>
                  </View>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Email:</Text>
                    <Text style={styles.userInfoValue}>{user.correo || user.email || "Sin email"}</Text>
                  </View>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Teléfono:</Text>
                    <Text style={styles.userInfoValue}>{user.telefono || "Sin teléfono"}</Text>
                  </View>
                </View>

                <View style={styles.userActionsContainer}>
                  <TouchableOpacity style={styles.userActionButton} onPress={() => setIsEditing(true)}>
                    <Text style={styles.userActionButtonText}>Editar Perfil</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.userActionButton, styles.deleteButton]}
                    onPress={handleDeleteAccountRequest}
                  >
                    <Text style={[styles.userActionButtonText, styles.deleteButtonText]}>Eliminar Perfil</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.userActionButton, styles.logoutButton]} onPress={handleLogout}>
                    <Text style={styles.userActionButtonText}>Cerrar Sesión</Text>
                  </TouchableOpacity>
                </View>
              
              
           
        
           
          </View>
        )}

        {/* Moved user info section below history */}
        {!isEditing && !isBarOwner && (
          <View style={styles.userInfoSection}>
            <View style={styles.userInfoCard}>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Nombre:</Text>
                <Text style={styles.userInfoValue}>{user.nombreUsuario || user.displayName || "Sin nombre"}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Email:</Text>
                <Text style={styles.userInfoValue}>{user.correo || user.email || "Sin email"}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Teléfono:</Text>
                <Text style={styles.userInfoValue}>{user.telefono || "Sin teléfono"}</Text>
              </View>
            </View>

            <View style={styles.userActionsContainer}>
              <TouchableOpacity style={styles.userActionButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.userActionButtonText}>Editar{"\n"}Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.userActionButton, styles.deleteButton]}
                onPress={handleDeleteAccountRequest}
              >
                <Text style={[styles.userActionButtonText, styles.deleteButtonText]}>Eliminar{"\n"}Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.userActionButton, styles.logoutButton]} onPress={handleLogout}>
                <Text style={styles.userActionButtonText}>Cerrar{"\n"}Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Modal
          visible={showReseñasRecibidasModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReseñasRecibidasModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⭐ Todas las Reseñas Recibidas</Text>
                <TouchableOpacity onPress={() => setShowReseñasRecibidasModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
                {reseñasRecibidas.map((reseña) => (
                  <View key={reseña.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewHeaderText}>
                        <Text style={styles.reviewPlace}>{reseña.comercio}</Text>
                        <Text style={styles.reviewUser}>Por: {reseña.usuario}</Text>
                        <Text style={styles.reviewDate}>{getRelativeTime(reseña.fecha)}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{reseña.comentario}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPublicidadesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPublicidadesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📢 Todas las Publicidades</Text>
                <TouchableOpacity onPress={() => setShowPublicidadesModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
                {publicidades.map((pub) => {
                  const isExpirada = isPublicidadExpirada(pub.fechaExpiracion)

                  return (
                    <View key={pub.id} style={styles.publicidadCard}>
                      <View style={styles.publicidadHeader}>
                        <View style={styles.publicidadInfo}>
                          <Text style={styles.publicidadComercio}>{pub.comercio}</Text>
                          <Text style={styles.publicidadDescripcion}>{pub.descripcion}</Text>
                          <Text style={styles.publicidadDate}>{getRelativeTime(pub.fechaCreacion)}</Text>
                        </View>
                        <View style={styles.visualizacionesBadge}>
                          <Text style={styles.visualizacionesNumber}>{pub.visualizaciones}</Text>
                          <Text style={styles.visualizacionesLabel}>vistas</Text>
                        </View>
                      </View>
                      <View style={styles.publicidadFooter}>
                        {isExpirada ? (
                          <View style={[styles.estadoBadge, styles.estadoExpirado]}>
                            <Text style={styles.estadoText}>⌛ Expirada</Text>
                          </View>
                        ) : (
                          <View style={[styles.estadoBadge, pub.estado ? styles.estadoActivo : styles.estadoInactivo]}>
                            <Text style={styles.estadoText}>{pub.estado ? "Activa" : "Inactiva"}</Text>
                          </View>
                        )}
                        {pub.fechaExpiracion && (
                          <Text style={styles.expiracionText}>
                            {isExpirada ? "Expiró:" : "Expira:"} {getRelativeTime(pub.fechaExpiracion)}
                          </Text>
                        )}
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showReseñasModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReseñasModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✍️ Todas mis Reseñas</Text>
                <TouchableOpacity onPress={() => setShowReseñasModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
                {reseñas.map((reseña) => {
                  const statusBadge = getReviewStatusBadge(reseña)
                  return (
                    <View key={reseña.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <PlaceIcon tipo={reseña.tipo} />
                        <View style={styles.reviewHeaderText}>
                          <Text style={styles.reviewPlace}>{reseña.lugar}</Text>
                          <Text style={styles.reviewDate}>{getRelativeTime(reseña.fecha)}</Text>
                        </View>
                        {statusBadge && (
                          <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
                            <Text style={styles.statusBadgeText}>
                              {statusBadge.icon} {statusBadge.text}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Text key={star} style={styles.star}>
                            {star <= reseña.puntuacion ? "⭐" : "☆"}
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.reviewComment}>{reseña.comentario}</Text>
                      {reseña.motivoRechazo && (
                        <View style={styles.rejectionContainer}>
                          <Text style={styles.rejectionLabel}>❌ Motivo del rechazo:</Text>
                          <Text style={styles.rejectionText}>{reseña.motivoRechazo}</Text>
                          <TouchableOpacity
                            style={styles.editReviewButton}
                            onPress={() => {
                              setShowReseñasModal(false)
                              handleEditReview(reseña)
                            }}
                          >
                            <Text style={styles.editReviewButtonText}>✏️ Editar y Reenviar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showLugaresModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowLugaresModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🗺️ Todos los Lugares Visitados</Text>
                <TouchableOpacity onPress={() => setShowLugaresModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
                {lugaresVisitados.map((lugar) => (
                  <View key={lugar.id} style={styles.placeCard}>
                    <View style={styles.placeHeader}>
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{lugar.nombre}</Text>
                        <Text style={styles.placeAddress}>{lugar.direccion}</Text>
                      </View>
                      <View style={styles.visitBadge}>
                        <Text style={styles.visitBadgeText}>{lugar.visitas} visitas</Text>
                      </View>
                    </View>
                    <Text style={styles.placeDate}>Última visita: {getRelativeTime(lugar.ultimaVisita)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showReservasRecibidasModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReservasRecibidasModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📅 Todas las Reservas Recibidas</Text>
                <TouchableOpacity onPress={() => setShowReservasRecibidasModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
                {reservasRecibidas.map((reserva) => {
                  const estadoInfo = getReservaEstado(reserva)

                  return (
                    <View key={reserva.id} style={styles.reservaCard}>
                      <View style={styles.reservaHeader}>
                        <View style={styles.reservaInfo}>
                          <Text style={styles.reservaComercio}>{reserva.comercio}</Text>
                          <Text style={styles.reservaUsuario}>Cliente: {reserva.usuario}</Text>
                          <Text style={styles.reservaDate}>{getRelativeTime(reserva.fecha)}</Text>
                        </View>
                        <View style={styles.reservaPersonasBadge}>
                          <Text style={styles.reservaPersonasNumber}>{reserva.cantidadPersonas}</Text>
                          <Text style={styles.reservaPersonasLabel}>personas</Text>
                        </View>
                      </View>
                      <View style={styles.reservaFooter}>
                        <View style={[styles.estadoBadge, estadoInfo.style]}>
                          <Text style={styles.estadoText}>{estadoInfo.text}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showEditReviewModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEditReviewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✏️ Editar Reseña</Text>
                <TouchableOpacity onPress={() => setShowEditReviewModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.editModalContent}>
                {selectedReviewToEdit && (
                  <>
                    <Text style={styles.editModalLabel}>Lugar:</Text>
                    <Text style={styles.editModalPlace}>{selectedReviewToEdit.lugar}</Text>

                    <Text style={styles.editModalLabel}>Puntuación:</Text>
                    <View style={styles.editStarsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setEditedReviewData({ ...editedReviewData, puntuacion: star })}
                        >
                          <Text style={styles.editStar}>{star <= editedReviewData.puntuacion ? "⭐" : "☆"}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.editModalLabel}>Comentario:</Text>
                    <TextInput
                      style={styles.editCommentInput}
                      multiline
                      numberOfLines={5}
                      value={editedReviewData.comentario}
                      onChangeText={(text) => setEditedReviewData({ ...editedReviewData, comentario: text })}
                      placeholder="Escribe tu comentario aquí..."
                      placeholderTextColor="#999"
                    />

                    <TouchableOpacity style={styles.updateReviewButton} onPress={handleUpdateReview}>
                      <Text style={styles.updateReviewButtonText}>Enviar Reseña</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#D838F5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    marginTop: 20,
    textAlign: "center",
    color: "#ffffff",
    textShadowColor: "rgba(216, 56, 245, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  photoGlow: {
    padding: 5,
    borderRadius: 60,
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#D838F5",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 25,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 15,
    padding: 20,
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
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  historySection: {
    marginBottom: 25,
  },
  tabsAndRefreshContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 25,
    padding: 4,
    flex: 1,
    marginRight: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "rgba(216, 56, 245, 0.3)",
    borderWidth: 1,
    borderColor: "#D838F5",
  },
  tabText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#D838F5",
  },
  historyContent: {
    maxHeight: 400,
  },
  reviewCard: {
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(157, 141, 241, 0.3)",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  placeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewPlace: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  reviewUser: {
    fontSize: 13,
    color: "rgba(216, 56, 245, 0.8)",
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  reviewComment: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  publicidadCard: {
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  publicidadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  publicidadInfo: {
    flex: 1,
  },
  publicidadComercio: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  publicidadDescripcion: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  publicidadDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  visualizacionesBadge: {
    backgroundColor: "rgba(216, 56, 245, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D838F5",
    alignItems: "center",
    minWidth: 60,
  },
  visualizacionesNumber: {
    fontSize: 18,
    color: "#D838F5",
    fontWeight: "bold",
  },
  visualizacionesLabel: {
    fontSize: 10,
    color: "rgba(216, 56, 245, 0.8)",
  },
  publicidadFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  estadoActivo: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderColor: "rgba(74, 222, 128, 0.5)",
  },
  estadoInactivo: {
    backgroundColor: "rgba(220, 53, 69, 0.2)",
    borderColor: "rgba(220, 53, 69, 0.5)",
  },
  estadoText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
  expiracionText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
  },
  estadoExpirado: {
    backgroundColor: "rgba(156, 163, 175, 0.2)",
    borderColor: "#9ca3af",
  },
  placeCard: {
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  visitBadge: {
    backgroundColor: "rgba(216, 56, 245, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D838F5",
  },
  visitBadgeText: {
    fontSize: 12,
    color: "#D838F5",
    fontWeight: "600",
  },
  placeDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  emptyText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    marginTop: 20,
    fontStyle: "italic",
  },
  verMasButton: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    alignItems: "center",
  },
  verMasText: {
    color: "#D838F5",
    fontSize: 14,
    fontWeight: "600",
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.2)",
  },
  infoLabel: {
    fontSize: 12,
    color: "rgba(216, 56, 245, 0.8)",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    color: "#ffffff",
  },
  info: {
    fontSize: 16,
    marginBottom: 15,
    color: "#ffffff",
  },
  comercioStatusContainer: {
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#D838F5",
  },
  pendingText: {
    color: "#ffc107",
    fontWeight: "bold",
    fontSize: 16,
  },
  approvedText: {
    color: "#4ade80",
    fontWeight: "bold",
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "rgba(216, 56, 245, 0.9)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "rgba(58, 9, 103, 0.2)",
    color: "#ffffff",
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: "rgba(58, 9, 103, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.4)",
  },
  saveButton: {
    backgroundColor: "rgba(74, 222, 128, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.5)",
  },
  cancelButton: {
    backgroundColor: "rgba(108, 117, 125, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(108, 117, 125, 0.4)",
  },
  logoutButton: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    borderColor: "#D838F5",
  },
  deleteButton: {
    backgroundColor: "rgba(220, 53, 69, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 18,
    color: "#D838F5",
    textAlign: "center",
    marginTop: 50,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 10,
  },
  areaCodePicker: {
    width: 150,
    height: 50,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    borderRadius: 10,
    backgroundColor: "rgba(58, 9, 103, 0.2)",
    color: "#ffffff",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(58, 9, 103, 0.2)",
    fontSize: 16,
    color: "#ffffff",
  },
  helperText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 15,
    fontStyle: "italic",
  },
  adminHeader: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  adminBadge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFD700",
    marginBottom: 10,
    letterSpacing: 2,
  },
  adminTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textShadowColor: "rgba(255, 215, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  adminPhotoGlow: {
    padding: 5,
    borderRadius: 60,
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  adminStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: 10,
  },
  adminStatCard: {
    flex: 1,
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  adminStatIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  adminStatNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  adminStatLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 5,
  },
  adminStatSubtext: {
    fontSize: 11,
    color: "rgba(255, 215, 0, 0.7)",
    textAlign: "center",
  },
  adminInfoSection: {
    marginBottom: 30,
  },
  adminSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  adminInfoCard: {
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  adminInfoValue: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  adminActionsSection: {
    marginBottom: 30,
  },
  adminActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  adminActionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  adminActionTextContainer: {
    flex: 1,
  },
  adminActionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  adminActionSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#FFD700",
    fontWeight: "bold",
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
  },
  modalLoadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#FFD700",
  },
  activityList: {
    padding: 20,
  },
  activityItem: {
    flexDirection: "row",
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  activityIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: "rgba(255, 215, 0, 0.7)",
  },
  emptyActivityText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
    marginTop: 40,
    fontStyle: "italic",
  },
  barOwnerHeader: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  barOwnerBadge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF8C00",
    backgroundColor: "rgba(255, 140, 0, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FF8C00",
    marginBottom: 10,
    letterSpacing: 2,
  },
  barOwnerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textShadowColor: "rgba(255, 140, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  barOwnerPhotoGlow: {
    padding: 5,
    borderRadius: 60,
    backgroundColor: "rgba(255, 140, 0, 0.3)",
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },

  userHeader: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  userBadge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#9D8DF1",
    backgroundColor: "rgba(157, 141, 241, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#9D8DF1",
    marginBottom: 10,
    letterSpacing: 2,
  },
  userTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textShadowColor: "rgba(157, 141, 241, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 9, 103, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  modalList: {
    padding: 20,
    maxHeight: "100%",
  },
  reservaCard: {
   backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  reservaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reservaInfo: {
    flex: 1,
  },
  reservaComercio: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  reservaUsuario: {
    fontSize: 14,
    color: "#B0B0B0",
    marginBottom: 2,
  },
  reservaDate: {
    fontSize: 12,
    color: "#808080",
  },
  reservaPersonasBadge: {
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    minWidth: 60,
  },
  reservaPersonasNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D838F5",
  },
  reservaPersonasLabel: {
    fontSize: 10,
    color: "#D838F5",
    textTransform: "uppercase",
  },
  reservaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  desactivadoBanner: {
    backgroundColor: "rgba(220, 53, 69, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(220, 53, 69, 0.5)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  desactivadoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff6b6b",
    marginBottom: 10,
    textAlign: "center",
  },
  desactivadoText: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  motivoRechazoContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  motivoRechazoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ff6b6b",
    marginBottom: 5,
  },
  motivoRechazoText: {
    fontSize: 14,
    color: "#ffffff",
    lineHeight: 20,
  },
  solicitarReactivacionButton: {
    backgroundColor: "rgba(216, 56, 245, 0.8)",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  solicitarReactivacionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  solicitudPendienteContainer: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.5)",
  },
  solicitudPendienteText: {
    color: "#4ade80",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  estadoRechazado: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#ef4444",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D838F5",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIcon: {
    fontSize: 20,
    color: "#D838F5",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  starsContainer: {
    flexDirection: "row",
    marginVertical: 8,
  },
  star: {
    fontSize: 18,
    marginRight: 4,
  },
  rejectionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(216, 56, 245, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d938f57e",
  },
  rejectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffeeeeff",
    marginBottom: 6,
  },
  rejectionText: {
    fontSize: 13,
    color: "#f1ebebff",
    marginBottom: 10,
  },
  editReviewButton: {
    backgroundColor: "#c408e942",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  editReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  editModalContent: {
    padding: 20,
  },
  editModalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#aca4a4ff",
    marginTop: 15,
    marginBottom: 8,
  },
  editModalPlace: {
    fontSize: 18,
    color: "#7c11a7ff",
    fontWeight: "bold",
  },
  editStarsContainer: {
    flexDirection: "row",
    marginVertical: 10,
  },
  editStar: {
    fontSize: 36,
    marginRight: 8,
  },
  editCommentInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 120,
  },
  updateReviewButton: {
    backgroundColor: "#a530db83",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  updateReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Styles added for user info and actions
  userInfoSection: {
    backgroundColor: "rgba(58, 9, 103, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.2)",
  },
  userInfoCard: {
    marginBottom: 15,
  },
  userInfoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  userInfoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(216, 56, 245, 0.8)",
    width: 100, // Adjust as needed for alignment
  },
  userInfoValue: {
    fontSize: 14,
    color: "#ffffff",
    flex: 1,
  },
  userActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  userActionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 30, 45, 0.8)",
    borderWidth: 2,
    borderColor: "rgba(157, 141, 241, 0.6)",
    shadowColor: "#9D8DF1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 45,
  },
  userActionButtonText: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: "rgba(40, 20, 30, 0.8)",
    borderColor: "rgba(216, 56, 245, 0.7)",
    shadowColor: "#D838F5",
  },
  deleteButtonText: {
    color: "#ffffff",
  },
  logoutButton: {
    backgroundColor: "rgba(30, 30, 45, 0.8)",
    borderColor: "rgba(216, 56, 245, 0.6)",
    shadowColor: "#D838F5",
  },
  barOwnerProfileSection: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF8C00", // Orange color for bar owner section title
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "rgba(255, 140, 0, 0.9)", // Orange color for labels
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  editSection: {
    marginTop: 20,
  },
})
