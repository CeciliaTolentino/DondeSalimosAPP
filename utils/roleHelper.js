// Helper para manejar roles de usuario de forma dinámica
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

// Cache para los roles para evitar múltiples llamadas a la API
let rolesCache = null
let rolesCacheTimestamp = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Constantes para las descripciones de roles (para evitar typos)
export const ROLE_DESCRIPTIONS = {
  USUARIO: "Usuario",
  ADMINISTRADOR: "Administrador",
  USUARIO_COMERCIO: "Usuario_Comercio",
}

// Función para obtener todos los roles desde la API
export const fetchRoles = async () => {
  try {
    // Verificar si tenemos cache válido
    const now = Date.now()
    if (rolesCache && rolesCacheTimestamp && now - rolesCacheTimestamp < CACHE_DURATION) {
      console.log("Usando roles desde cache")
      return rolesCache
    }

    console.log("Obteniendo roles desde la API")
    const response = await fetch(`${API_BASE_URL}/api/RolesUsuario/listado`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const roles = await response.json()
      console.log("Roles obtenidos:", roles)

      // Actualizar cache
      rolesCache = roles
      rolesCacheTimestamp = now

      return roles
    } else {
      throw new Error("Error al obtener roles de la API")
    }
  } catch (error) {
    console.error("Error al obtener roles:", error)
    throw error
  }
}

// Función para obtener el ID de un rol por su descripción
export const getRoleIdByDescription = async (description) => {
  try {
    const roles = await fetchRoles()
    const role = roles.find((r) => r.descripcion === description)

    if (!role) {
      throw new Error(`No se encontró el rol con descripción: ${description}`)
    }

    console.log(`Rol encontrado: ${description} -> ID: ${role.iD_RolUsuario}`)
    return role.iD_RolUsuario
  } catch (error) {
    console.error("Error al buscar rol por descripción:", error)
    throw error
  }
}

// Función para obtener la descripción de un rol por su ID
export const getRoleDescriptionById = async (roleId) => {
  try {
    const roles = await fetchRoles()
    const role = roles.find((r) => r.iD_RolUsuario === roleId)

    if (!role) {
      throw new Error(`No se encontró el rol con ID: ${roleId}`)
    }

    console.log(`Rol encontrado: ID ${roleId} -> ${role.descripcion}`)
    return role.descripcion
  } catch (error) {
    console.error("Error al buscar rol por ID:", error)
    throw error
  }
}

// Función helper para verificar si un usuario es administrador
export const isAdminRole = async (roleId) => {
  try {
    const description = await getRoleDescriptionById(roleId)
    return description === ROLE_DESCRIPTIONS.ADMINISTRADOR
  } catch (error) {
    console.error("Error al verificar rol de administrador:", error)
    return false
  }
}

// Función helper para verificar si un usuario es dueño de comercio
export const isBarOwnerRole = async (roleId) => {
  try {
    const description = await getRoleDescriptionById(roleId)
    return description === ROLE_DESCRIPTIONS.USUARIO_COMERCIO
  } catch (error) {
    console.error("Error al verificar rol de dueño de comercio:", error)
    return false
  }
}

// Función helper para verificar si un usuario es usuario común
export const isRegularUserRole = async (roleId) => {
  try {
    const description = await getRoleDescriptionById(roleId)
    return description === ROLE_DESCRIPTIONS.USUARIO
  } catch (error) {
    console.error("Error al verificar rol de usuario común:", error)
    return false
  }
}

// Función para limpiar el cache (útil para testing o cuando se actualizan roles)
export const clearRolesCache = () => {
  rolesCache = null
  rolesCacheTimestamp = null
  console.log("Cache de roles limpiado")
}
