import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Google Maps API
const GOOGLE_BASE_URL = "https://maps.googleapis.com/maps/api/place"
const GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode"
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_API_KEY

// Backend API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const getAuthHeaders = async () => {
  const token = await getJwtToken()
  const headers = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("jwtToken")
      console.log(" Interceptor ejecutándose, token encontrado:", token ? "SÍ" : "NO")

      if (token) {
        if (!config.headers) {
          config.headers = {}
        }
        config.headers["Authorization"] = `Bearer ${token}`
      } else {
        console.log(" No JWT token found in AsyncStorage")
      }
    } catch (error) {
      console.error(" Error getting JWT token:", error)
    }
    return config
  },
  (error) => {
    console.error(" Error in request interceptor:", error)
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log(" Token expired or invalid, clearing token")
      await AsyncStorage.removeItem("jwtToken")
    }
    return Promise.reject(error)
  }
)

export const storeJwtToken = async (token) => {
  try {
    await AsyncStorage.setItem("jwtToken", token)
    console.log(" JWT token stored successfully")
  } catch (error) {
    console.error(" Error storing JWT token:", error)
  }
}

export const getJwtToken = async () => {
  try {
    const token = await AsyncStorage.getItem("jwtToken")
    return token
  } catch (error) {
    console.error(" Error getting JWT token:", error)
    return null
  }
}

export const clearJwtToken = async () => {
  try {
    await AsyncStorage.removeItem("jwtToken")
    console.log(" JWT token cleared")
  } catch (error) {
    console.error(" Error clearing JWT token:", error)
  }
}

// ============================================
// GOOGLE MAPS APIs
// ============================================

const nearByPlace = (lat, lng, type, keyword, filters) => {
  const filterString = filters === "" ? "" : filters
  console.log("El filter string queda de la siguiente forma " + filterString)
  const url = `${GOOGLE_BASE_URL}/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${type}&keyword=${keyword},${filterString}&key=${GOOGLE_API_KEY}`
  console.log("URL de nearByPlace:", url)
  return apiClient.get(url)
}

const getDetallesLugar = (placeId) =>
  apiClient.get(
    GOOGLE_BASE_URL +
      "/details/json?" +
      "place_id=" +
      placeId +
      "&fields=name,formatted_phone_number,website" +
      "&key=" +
      GOOGLE_API_KEY
  )

const geocodeAddress = (address) => {
  const encodedAddress = encodeURIComponent(address)
  const url = `${GEOCODING_URL}/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`
  console.log("Geocoding URL:", url)
  return apiClient.get(url)
}

const reverseGeocode = (lat, lng) => {
  const url = `${GEOCODING_URL}/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
  return apiClient.get(url)
}

// ============================================
// BACKEND APIs - RESERVAS
// ============================================

const crearReserva = async (reservaData) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Creando reserva con JWT")

    const response = await apiClient.post("/api/Reservas/crear", reservaData, { headers })
    console.log(" Reserva creada exitosamente")
    return response
  } catch (error) {
    const errorMsg = error.response?.data
    if (errorMsg && typeof errorMsg === "string") {
      const isControlledError =
        errorMsg.toLowerCase().includes("inactiv") ||
        errorMsg.toLowerCase().includes("desactivado") ||
        errorMsg.toLowerCase().includes("disponible") ||
        errorMsg.toLowerCase().includes("pendiente de aprobación") ||
        errorMsg.toLowerCase().includes("reserva aprobada") ||
        errorMsg.toLowerCase().includes("seleccione otra fecha")

      if (!isControlledError) {
        console.error(" Error inesperado al crear reserva:", errorMsg)
      }
    } else if (error.message) {
      console.error(" Error inesperado al crear reserva:", error.message)
    }
    throw error
  }
}

const obtenerReservasPorUsuario = async (idUsuario) => {
  try {
    const headers = await getAuthHeaders()
    const response = await apiClient.get(`/api/Reservas/usuario/${idUsuario}`, { headers })
    return response
  } catch (error) {
    console.error(" Error al obtener reservas del usuario:", error.response?.data || error.message)
    throw error
  }
}

const obtenerReservasPorComercio = async (comercio) => {
  try {
    const headers = await getAuthHeaders()
    const response = await apiClient.get(`/api/Reservas/buscarNombreComercio/${comercio}`, { headers })
    return response
  } catch (error) {
    console.error(" Error al obtener reservas del comercio:", error.response?.data || error.message)
    throw error
  }
}

export const actualizarEstadoReserva = async (reserva, aprobar, motivoRechazo = null) => {
  try {
    if (!reserva || !reserva.iD_Reserva) {
      console.log(" Error: Reserva inválida o sin ID")
      console.log(" Reserva recibida:", reserva)
      throw new Error("Reserva inválida o sin ID de reserva")
    }

    const headers = await getAuthHeaders()
    console.log(`📝 Actualizando estado de reserva: ${reserva.iD_Reserva} - ${aprobar ? "Aprobar" : "Rechazar"}`)

    const body = {
      iD_Reserva: reserva.iD_Reserva,
      iD_Usuario: reserva.iD_Usuario,
      iD_Comercio: reserva.iD_Comercio,
      fechaReserva: reserva.fechaReserva,
      comenzales: reserva.comenzales,
      estado: aprobar,
      motivoRechazo: aprobar ? null : motivoRechazo,
    }

    console.log("Body enviado:", JSON.stringify(body, null, 2))

    const response = await apiClient.put(`/api/Reservas/actualizar/${reserva.iD_Reserva}`, body, { headers })

    console.log(" Reserva actualizada exitosamente")
    return response
  } catch (error) {
    console.log(" Error al actualizar estado de reserva:", error.response?.data || error.message)
    console.log(" Error completo:", error)
    throw error
  }
}

const eliminarReserva = async (idReserva) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Eliminando reserva con JWT")

    const response = await apiClient.delete(`/api/Reservas/eliminar/${idReserva}`, { headers })
    console.log(" Reserva eliminada exitosamente")
    return response
  } catch (error) {
    console.error(" Error al eliminar reserva:", error.response?.data || error.message)
    throw error
  }
}

const obtenerReservasListado = async () => {
  try {
    const response = await apiClient.get(`/api/Reservas/listado`)
    return response
  } catch (error) {
    console.error("Error al obtener listado de reservas:", error.response?.data || error.message)
    throw error
  }
}

// ============================================
// BACKEND APIs - RESEÑAS
// ============================================

const crearResenia = async (reseniaData) => {
  try {
    console.log(" Creando reseña:", reseniaData)
    const response = await apiClient.post(`/api/Resenias/crear`, reseniaData, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    console.log(" Reseña creada exitosamente:", response.data)
    return response
  } catch (error) {
    const errorMsg = error.response?.data

    if (errorMsg && typeof errorMsg === "string") {
      const isControlledError =
        errorMsg.toLowerCase().includes("inactiv") ||
        errorMsg.toLowerCase().includes("desactivado") ||
        errorMsg.toLowerCase().includes("reserva aprobada") ||
        errorMsg.toLowerCase().includes("sin reserva") ||
        errorMsg.toLowerCase().includes("ya tienes una reseña") ||
        errorMsg.toLowerCase().includes("reseña pendiente") ||
        errorMsg.toLowerCase().includes("reseña aprobada") ||
        errorMsg.toLowerCase().includes("comercio no existe")

      if (!isControlledError) {
        console.error(" Error inesperado al crear reseña:", errorMsg)
      }
    } else if (error.message) {
      console.error(" Error inesperado al crear reseña:", error.message)
    }
    throw error
  }
}

const obtenerResenias = async () => {
  try {
    const response = await apiClient.get("/api/Resenias/listado")
    return response
  } catch (error) {
    console.error("Error al obtener reseñas:", error.response?.data || error.message)
    throw error
  }
}

const obtenerReseniasPorComercio = async (nombreComercio) => {
  try {
    const response = await apiClient.get(`/api/Resenias/buscarNombreComercio/${nombreComercio}`)
    return response
  } catch (error) {
    console.error("Error al obtener reseñas del comercio:", error.response?.data || error.message)
    throw error
  }
}

const actualizarResenia = async (idResenia, reseniaData) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Actualizando reseña con JWT")

    const response = await apiClient.put(`/api/Resenias/actualizar/${idResenia}`, reseniaData, { headers })
    console.log(" Reseña actualizada exitosamente")
    return response
  } catch (error) {
    console.error(" Error al actualizar reseña:", error.response?.data || error.message)
    throw error
  }
}

const eliminarResenia = async (idResenia) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Eliminando reseña con JWT")

    const response = await apiClient.delete(`/api/Resenias/eliminar/${idResenia}`, { headers })
    console.log(" Reseña eliminada exitosamente")
    return response
  } catch (error) {
    console.error(" Error al eliminar reseña:", error.response?.data || error.message)
    throw error
  }
}

// ============================================
// BACKEND APIs - COMERCIOS
// ============================================

const obtenerComerciosListado = async () => {
  try {
    const response = await apiClient.get("/api/Comercios/listado")
    return response
  } catch (error) {
    console.error("Error al obtener comercios:", error.response?.data || error.message)
    throw error
  }
}

const obtenerComercioPorId = async (idComercio) => {
  try {
    const response = await apiClient.get(`/api/Comercios/buscarIdComercio/${idComercio}`)
    return response
  } catch (error) {
    console.error("Error al obtener comercio:", error.response?.data || error.message)
    throw error
  }
}

const crearComercio = async (comercioData) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Creando comercio con JWT")

    const response = await apiClient.post("/api/Comercios/crear", comercioData, { headers })
    console.log(" Comercio creado exitosamente")
    return response
  } catch (error) {
    console.log("Error response data:", error.response?.data)
    console.log("Error response data type:", typeof error.response?.data)
    console.log("Error al crear comercio:", error.response?.data || error.message)
    throw error
  }
}

const actualizarComercio = async (idComercio, comercioData) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Actualizando comercio con JWT")

    const response = await apiClient.put(`/api/Comercios/actualizar/${idComercio}`, comercioData, { headers })
    console.log(" Comercio actualizado exitosamente")
    return response
  } catch (error) {
    console.error(" Error al actualizar comercio:", error.response?.data || error.message)
    throw error
  }
}

const obtenerComerciosPorUsuario = async (usuarioID) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Obteniendo comercios por usuario con JWT")

    const response = await apiClient.get(`/api/Comercios/buscarComerciosPorUsuario/${usuarioID}`, { headers })

    return response
  } catch (error) {
    console.error(" Error al obtener comercios del usuario:", error.response?.data || error.message)
    throw error
  }
}

const eliminarComercio = async (idComercio) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Eliminando comercio con JWT")

    const response = await apiClient.delete(`/api/Comercios/eliminar/${idComercio}`, { headers })
    console.log(" Comercio eliminado exitosamente")
    return response
  } catch (error) {
    console.log(" Error al eliminar comercio:", error.response?.data || error.message)
    throw error
  }
}

// ============================================
// BACKEND APIs - PUBLICIDADES
// ============================================

const obtenerPublicidadesListado = async () => {
  try {
    const response = await apiClient.get(`/api/Publicidades/listado`)
    return response
  } catch (error) {
    console.error("❌ Error al obtener publicidades activas:", error.response?.data || error.message)
    throw error
  }
}

const obtenerPublicidadesPorNombreComercio = async (comercio) => {
  try {
    const response = await apiClient.get(`/api/Publicidades/buscarNombrecomercio/${comercio}`)
    return response
  } catch (error) {
    console.error("Error al obtener publicidades del comercio:", error.response?.data || error.message)
    throw error
  }
}

const obtenerPublicidadesPorId = async (idPublicidad) => {
  try {
    const response = await apiClient.get(`/api/Publicidades/buscarIdPublicidad/${idPublicidad}`)
    return response
  } catch (error) {
    console.error("Error al obtener el id de publicidades del comercio:", error.response?.data || error.message)
    throw error
  }
}

const crearPublicidad = async (publicidadData) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Creando publicidad con JWT")

    const body = {
      Descripcion: publicidadData.descripcion || "Publicidad",
      Visualizaciones: publicidadData.visualizaciones || 0,
      Tiempo: publicidadData.tiempo,
      Estado: publicidadData.estado !== undefined ? publicidadData.estado : false,
      FechaCreacion: publicidadData.fechaCreacion || new Date().toISOString(),
      ID_Comercio: publicidadData.iD_Comercio,
      ID_TipoComercio: publicidadData.iD_TipoComercio,
      Imagen: publicidadData.foto || "",
    }

    const response = await apiClient.post("/api/Publicidades/crear", body, { headers })

    console.log(" Publicidad creada exitosamente, status:", response.status)
    return response
  } catch (error) {
    console.error(" Error al crear publicidad:", error.response?.data || error.message)
    throw error
  }
}

const actualizarPublicidad = async (id, publicidadData) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Actualizando publicidad con JWT")

    const body = {
      ID_Publicidad: id,
      Descripcion: publicidadData.descripcion || "Publicidad",
      Visualizaciones: publicidadData.visualizaciones || 0,
      Tiempo: publicidadData.tiempo,
      Estado: publicidadData.estado !== undefined ? publicidadData.estado : false,
      FechaCreacion: publicidadData.fechaCreacion || new Date().toISOString(),
      ID_Comercio: publicidadData.iD_Comercio,
      ID_TipoComercio: publicidadData.iD_TipoComercio || null,
      Imagen: publicidadData.imagen || publicidadData.foto || "",
      MotivoRechazo: publicidadData.motivoRechazo || null,
      Pago: publicidadData.pago !== undefined ? publicidadData.pago : false,
    }

    const url = `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Publicidades/actualizar/${id}`
    console.log(" URL de actualización:", url)
    console.log(
      " Body a enviar:",
      JSON.stringify({ ...body, Imagen: body.Imagen ? `[${body.Imagen.length} chars]` : "No image" }, null, 2)
    )

    const response = await apiClient.put(`/api/Publicidades/actualizar/${id}`, body, { headers })

    console.log(" Publicidad actualizada exitosamente, status:", response.status)
    return response
  } catch (error) {
    console.error(" Error al actualizar publicidad:", error.response?.data || error.message)
    throw error
  }
}

const eliminarPublicidad = async (id) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Eliminando publicidad con JWT")

    const response = await apiClient.delete("/api/Publicidades/eliminar/" + id, { headers })

    console.log("Publicidad eliminada exitosamente")
    return response
  } catch (error) {
    console.error("Error al eliminar publicidad:", error.response?.data || error.message)

    throw error
  }
}

export const actualizarPublicidadRechazadaPagada = async (publicidadId, newImageBase64) => {
  try {
    const headers = await getAuthHeaders()
    console.log("[API] Actualizando publicidad rechazada pagada...")

    // Primero obtener la publicidad actual
    const currentPublicidad = await obtenerPublicidadesPorId(publicidadId)
    const pubData = currentPublicidad.data

    const body = {
      ID_Publicidad: publicidadId,
      Descripcion: pubData.descripcion || "Publicidad",
      Visualizaciones: pubData.visualizaciones || 0,
      Tiempo: pubData.tiempo,
      Estado: false, 
      FechaCreacion: pubData.fechaCreacion,
      ID_Comercio: pubData.iD_Comercio,
      ID_TipoComercio: pubData.iD_TipoComercio || null,
      Imagen: newImageBase64, 
      MotivoRechazo: null, 
      Pago: true, 
    }

    console.log("[API] Body a enviar (sin imagen):", JSON.stringify({ ...body, Imagen: "[BASE64]" }, null, 2))

    const response = await apiClient.put(`/api/Publicidades/actualizar/${publicidadId}`, body, { headers })
    console.log("[API] Publicidad rechazada pagada actualizada exitosamente")
    return response
  } catch (error) {
    console.error("[API] Error al actualizar publicidad rechazada pagada:", error.response?.data || error.message)
    throw error
  }
}

// ==================== PREFERENCIAS DE PAGOS ====================

const crearPreferenciaPago = async (publicidadData) => {
  try {
    const headers = await getAuthHeaders()
    console.log("[API] Creando preferencia de pago en Mercado Pago...")
    console.log("[API] Datos recibidos:", publicidadData)

    const body = {
      Titulo: publicidadData.titulo,
      Precio: publicidadData.precio,
      PublicidadId: Number.parseInt(publicidadData.publicidadId),
      IsWeb: false, // Para la app móvil
    }

    console.log("[API] Body a enviar:", JSON.stringify(body, null, 2))

    const response = await apiClient.post(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Pagos/crear-preferencia`,
      body,
      { headers }
    )

    console.log("[API] Preferencia de pago creada:", response.data)
    return response
  } catch (error) {
    console.error(
      "[API] Error al crear preferencia de pago:",
      JSON.stringify(error.response?.data, null, 2) || error.message
    )
    throw error
  }
}

/**
 * Verificar y activar un pago
 * @param {string} paymentId - ID del pago de Mercado Pago
 * @param {string} preferenceId - ID de la preferencia (opcional)
 * @returns {Promise} - Respuesta del servidor
 */
const verificarYActivarPago = async (paymentId, preferenceId) => {
  try {
    console.log("[API] Verificando pago:", { paymentId, preferenceId })
    const headers = await getAuthHeaders()

    const response = await apiClient.post(
      `/api/Pagos/verificar-pago`,
      {
        paymentId: paymentId?.toString(),
        preferenceId: preferenceId?.toString(),
      },
      { headers }
    )

    console.log("[API] Pago verificado:", response.data)
    return response
  } catch (error) {
    console.error("[API] Error al verificar pago:", error.response?.data || error.message)
    throw error
  }
}


const verificarEstadoPublicidad = async (publicidadId) => {
  try {
    console.log("[API] Verificando estado de publicidad:", publicidadId)
    const response = await obtenerPublicidadesPorId(publicidadId)
    return response.data
  } catch (error) {
    console.error("[API] Error al verificar estado de publicidad:", error)
    throw error
  }
}

const incrementarVisualizacion = async (publicidadId) => {
  try {
    const response = await apiClient.put(`/api/Publicidades/incrementar-visualizacion/${publicidadId}`)
    return response
  } catch (error) {
    console.error(" Error al incrementar visualización:", error.response?.data || error.message)
    return null
  }
}

export const authenticatedFetch = async (url, options = {}) => {
  try {
    const token = await getJwtToken()

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log(" JWT token added to fetch request")
    } else {
      console.log(" No JWT token available for fetch request")
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      console.log(" 401 error in fetch, clearing token")
      await clearJwtToken()
    }

    return response
  } catch (error) {
    console.error(" Error in authenticatedFetch:", error)
    throw error
  }
}

// ==================== USUARIOS ====================

const obtenerUsuarios = async () => {
  try {
    const headers = await getAuthHeaders()
    const response = await apiClient.get("/api/Usuarios/listado", { headers })
    return response
  } catch (error) {
    console.error("Error al obtener usuarios:", error.response?.data || error.message)
    throw error
  }
}

const actualizarEstadoUsuario = async (usuario, nuevoEstado) => {
  try {
    const headers = await getAuthHeaders()
    console.log(" Actualizando estado de usuario con JWT")
    const body = {
      iD_Usuario: usuario.iD_Usuario,
      NombreUsuario: usuario.nombreUsuario,
      Correo: usuario.correo,
      Telefono: usuario.telefono || "",
      Uid: usuario.uid,
      Estado: nuevoEstado,
      FechaCreacion: usuario.fechaCreacion,
      iD_RolUsuario: usuario.iD_RolUsuario,
    }

    console.log(" Body que se enviará:", JSON.stringify(body, null, 2))

    const response = await apiClient.put(`/api/Usuarios/actualizar/${usuario.iD_Usuario}`, body, { headers })
    console.log(" Estado de usuario actualizado exitosamente")
    return response
  } catch (error) {
    const errorMsg = error.response?.data
    if (errorMsg && typeof errorMsg === "string") {
      const isControlledError =
        errorMsg.includes("palabras no permitidas") || errorMsg.includes("nombre de usuario ya está en uso")

      if (!isControlledError) {
        console.error(" Error inesperado al actualizar estado de usuario:", errorMsg)
      }
    } else {
      console.error(" Error inesperado al actualizar estado de usuario:", error.message)
    }
    throw error
  }
}

const actualizardatosUsuario = async (usuario) => {
  try {
    const headers = await getAuthHeaders()
    console.log("Actualizando datos de usuario con JWT")
    const body = {
      iD_Usuario: usuario.iD_Usuario,
      NombreUsuario: usuario.nombreUsuario,
      Correo: usuario.correo,
      Telefono: usuario.telefono || "",
      Uid: usuario.uid,
      Estado: true,
      FechaCreacion: usuario.fechaCreacion,
      iD_RolUsuario: usuario.iD_RolUsuario,
    }

    console.log(" Body que se enviará:", JSON.stringify(body, null, 2))

    const response = await apiClient.put(`/api/Usuarios/actualizar/${usuario.iD_Usuario}`, body, { headers })
    console.log(" Estado de usuario actualizado exitosamente")
    return response
  } catch (error) {
    const errorMsg = error.response?.data
    if (errorMsg && typeof errorMsg === "string") {
      const isControlledError =
        errorMsg.includes("palabras no permitidas") || errorMsg.includes("nombre de usuario ya está en uso")

      if (!isControlledError) {
        console.error(" Error inesperado al actualizar estado de usuario:", errorMsg)
      }
    } else {
      console.error(" Error inesperado al actualizar estado de usuario:", error.message)
    }
    throw error
  }
}

export default {
  // Publicidades
  obtenerPublicidadesListado,
  obtenerPublicidadesPorNombreComercio,
  obtenerPublicidadesPorId,
  crearPublicidad,
  actualizarPublicidad,
  eliminarPublicidad,
  actualizarPublicidadRechazadaPagada,

  // Comercios
  obtenerComercioPorId,
  obtenerComerciosListado,
  crearComercio,
  actualizarComercio,
  eliminarComercio,
  obtenerComerciosPorUsuario,

  // Reservas
  obtenerReservasListado,
  actualizarEstadoReserva,
  obtenerReservasPorComercio,
  obtenerReservasPorUsuario,
  crearReserva,
  eliminarReserva,

  // Reseñas
  eliminarResenia,
  actualizarResenia,
  obtenerReseniasPorComercio,
  obtenerResenias,
  crearResenia,

  // Google Maps
  nearByPlace,
  getDetallesLugar,
  geocodeAddress,
  reverseGeocode,

  // Pagos
  crearPreferenciaPago,
  verificarYActivarPago,
  verificarEstadoPublicidad,
  incrementarVisualizacion,

  // Usuarios
  authenticatedFetch,
  obtenerUsuarios,
  actualizarEstadoUsuario,
  actualizardatosUsuario,
}