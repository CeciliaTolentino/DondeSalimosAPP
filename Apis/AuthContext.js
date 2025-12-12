import { createContext, useState, useCallback, useEffect, useRef } from "react"
import { GoogleSignin } from "./../firebase"
import { Alert, Linking } from "react-native"
import { getRoleIdByDescription, getRoleDescriptionById, ROLE_DESCRIPTIONS } from "../utils/roleHelper"
import { clearJwtToken, storeJwtToken, getJwtToken } from "../Apis/Apis"
import AsyncStorage from "@react-native-async-storage/async-storage"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    isAdmin: false,
    isBarOwner: false,
    isApproved: false,
    isLoading: true,
    isAuthenticated: false,
    isRegistered: false,
    googleIdToken: null,
    googleUserData: null,
    pendingPaymentNavigation: null,
  })

  const isRestoringSession = useRef(false)
  const hasProcessedInitialUrl = useRef(false)

  // =====================================================
  // FUNCIONES DE PERSISTENCIA DE DATOS
  // =====================================================

  // Guardar datos del usuario en AsyncStorage
  const persistUserData = async (userData) => {
    try {
      if (userData) {
        await AsyncStorage.setItem("userData", JSON.stringify(userData))
        console.log("[AuthContext] Datos de usuario persistidos")
      }
    } catch (error) {
      console.error("[AuthContext] Error persistiendo datos de usuario:", error)
    }
  }

  // Restaurar datos del usuario desde AsyncStorage
  const restoreUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData")
      if (userDataString) {
        const userData = JSON.parse(userDataString)
        console.log("[AuthContext] Datos de usuario restaurados:", userData?.correo)
        return userData
      }
      return null
    } catch (error) {
      console.error("[AuthContext] Error restaurando datos de usuario:", error)
      return null
    }
  }

  // Limpiar datos persistidos
  const clearPersistedData = async () => {
    try {
      await AsyncStorage.multiRemove(["userData", "jwtToken", "pendingPayment"])
      console.log("[AuthContext] Datos persistidos limpiados")
    } catch (error) {
      console.error("[AuthContext] Error limpiando datos persistidos:", error)
    }
  }

  // =====================================================
  // FUNCIONES DE PAGO PENDIENTE (AsyncStorage fallback)
  // =====================================================

  // Guardar pago pendiente antes de ir a Mercado Pago
  const savePendingPayment = async (publicidadId, preferenceId) => {
    try {
      await AsyncStorage.setItem("pendingPayment", JSON.stringify({
        publicidadId,
        preferenceId,
        timestamp: Date.now()
      }))
      console.log("[AuthContext] Pago pendiente guardado:", publicidadId)
    } catch (error) {
      console.error("[AuthContext] Error guardando pago pendiente:", error)
    }
  }

  // Recuperar pago pendiente
  const getPendingPayment = async () => {
    try {
      const data = await AsyncStorage.getItem("pendingPayment")
      if (data) {
        const parsed = JSON.parse(data)
        // Solo usar si es reciente (menos de 10 minutos)
        if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
          console.log("[AuthContext] Pago pendiente recuperado:", parsed)
          return parsed
        } else {
          // Limpiar si es muy viejo
          await AsyncStorage.removeItem("pendingPayment")
          console.log("[AuthContext] Pago pendiente expirado, eliminado")
        }
      }
      return null
    } catch (error) {
      console.error("[AuthContext] Error recuperando pago pendiente:", error)
      return null
    }
  }

  // Limpiar pago pendiente
  const clearPendingPayment = async () => {
    try {
      await AsyncStorage.removeItem("pendingPayment")
      console.log("[AuthContext] Pago pendiente limpiado")
    } catch (error) {
      console.error("[AuthContext] Error limpiando pago pendiente:", error)
    }
  }

  // =====================================================
  // FUNCIÓN PARA PROCESAR DEEP LINKS DE PAGO
  // =====================================================

  const handlePaymentDeepLink = useCallback((url) => {
    if (!url) return false

    console.log("[AuthContext] Deep link recibido:", url)

    // Verificar si es un deep link de pago
    if (url.includes("payment/success") || url.includes("payment/failure") || 
        url.includes("payment/pending") || url.includes("payment_id")) {
      
      console.log("[AuthContext] Es un deep link de pago")

      let status = "unknown"
      let paymentId = null
      let preferenceId = null
      let publicidadId = null

      // Determinar el status
      if (url.includes("payment/success") || url.includes("status=approved")) {
        status = "success"
      } else if (url.includes("payment/failure") || url.includes("status=rejected")) {
        status = "failure"
      } else if (url.includes("payment/pending") || url.includes("status=pending")) {
        status = "pending"
      }

      // Extraer parámetros
      const paymentIdMatch = url.match(/payment_id=([^&]+)/)
      const preferenceIdMatch = url.match(/preference_id=([^&]+)/)
      const publicidadIdMatch = url.match(/publicidad_id=([^&]+)/)
      const externalRefMatch = url.match(/external_reference=([^&]+)/)

      paymentId = paymentIdMatch?.[1]
      preferenceId = preferenceIdMatch?.[1]
      publicidadId = publicidadIdMatch?.[1] || externalRefMatch?.[1]

      console.log("[AuthContext] Datos del pago:", { status, paymentId, preferenceId, publicidadId })

      // Guardar la navegación pendiente
      setAuthState((prev) => ({
        ...prev,
        pendingPaymentNavigation: {
          status,
          paymentId,
          preferenceId,
          publicidadId,
          timestamp: Date.now(),
        },
      }))

      // Limpiar el pago pendiente de AsyncStorage ya que el deep link funcionó
      clearPendingPayment()

      return true
    }

    return false
  }, [])

  // =====================================================
  // useEffect PRINCIPAL - Inicialización de la app
  // =====================================================

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("[AuthContext] Inicializando app...")
        isRestoringSession.current = true

        // PASO 1: Obtener la URL inicial ANTES de cualquier otra cosa
        let initialUrl = null
        try {
          initialUrl = await Linking.getInitialURL()
          if (initialUrl) {
            console.log("[AuthContext] URL inicial detectada:", initialUrl)
          } else {
            console.log("[AuthContext] No hay URL inicial")
          }
        } catch (error) {
          console.error("[AuthContext] Error obteniendo URL inicial:", error)
        }

        // PASO 2: Restaurar sesión
        console.log("[AuthContext] Verificando autenticación inicial...")
        const token = await getJwtToken()
        const userData = await restoreUserData()

        if (token && userData) {
          console.log("[AuthContext] Sesión encontrada, restaurando...")
          
          let isAdmin = false
          let isBarOwner = false

          if (userData?.iD_RolUsuario) {
            try {
              const roleDescription = await getRoleDescriptionById(userData.iD_RolUsuario)
              isAdmin = roleDescription === ROLE_DESCRIPTIONS.ADMINISTRADOR
              isBarOwner = roleDescription === ROLE_DESCRIPTIONS.USUARIO_COMERCIO
            } catch (error) {
              console.error("[AuthContext] Error determinando rol:", error)
            }
          }

          setAuthState((prev) => ({
            ...prev,
            user: userData,
            isAdmin,
            isBarOwner,
            isApproved: userData?.estado,
            isLoading: false,
            isAuthenticated: true,
            isRegistered: true,
          }))

          console.log("[AuthContext] Sesión restaurada exitosamente")

          // PASO 3: Procesar deep link si existe
          let paymentProcessed = false

          if (initialUrl && !hasProcessedInitialUrl.current) {
            hasProcessedInitialUrl.current = true
            console.log("[AuthContext] Procesando URL inicial...")
            // Pequeño delay para asegurar que el estado se actualizó
            setTimeout(() => {
              paymentProcessed = handlePaymentDeepLink(initialUrl)
            }, 300)
          }

          // PASO 4: Si no hubo deep link, verificar si hay un pago pendiente en AsyncStorage
          // Usamos un timeout mayor para dar tiempo al deep link
          setTimeout(async () => {
            if (!hasProcessedInitialUrl.current || !initialUrl) {
              const pendingPayment = await getPendingPayment()
              if (pendingPayment) {
                console.log("[AuthContext] Verificando pago pendiente desde AsyncStorage...")
                setAuthState((prev) => ({
                  ...prev,
                  pendingPaymentNavigation: {
                    status: "pending_verification",
                    publicidadId: pendingPayment.publicidadId,
                    preferenceId: pendingPayment.preferenceId,
                    timestamp: Date.now(),
                  },
                }))
              }
            }
          }, 1000)

        } else {
          console.log("[AuthContext] No hay sesión guardada")
          setAuthState((prev) => ({ ...prev, isLoading: false }))
        }

      } catch (error) {
        console.error("[AuthContext] Error en inicialización:", error)
        setAuthState((prev) => ({ ...prev, isLoading: false }))
      } finally {
        isRestoringSession.current = false
      }
    }

    initializeApp()

    // Escuchar deep links mientras la app está abierta
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link recibido (app abierta):", event.url)
      handlePaymentDeepLink(event.url)
    })

    return () => {
      subscription?.remove()
    }
  }, [handlePaymentDeepLink])

  // =====================================================
  // FUNCIONES DE AUTENTICACIÓN
  // =====================================================

  const clearPendingPaymentNavigation = useCallback(() => {
    setAuthState((prev) => ({
      ...prev,
      pendingPaymentNavigation: null,
    }))
  }, [])

  const updateAuth = useCallback(async (userData, isRegistered = false) => {
    console.log("[AuthContext] Actualizando estado de autenticación:", { userData, isRegistered })

    let isAdmin = false
    let isBarOwner = false

    if (userData?.iD_RolUsuario) {
      try {
        const roleDescription = await getRoleDescriptionById(userData.iD_RolUsuario)
        isAdmin = roleDescription === ROLE_DESCRIPTIONS.ADMINISTRADOR
        isBarOwner = roleDescription === ROLE_DESCRIPTIONS.USUARIO_COMERCIO
        console.log(`[AuthContext] Rol del usuario: ${roleDescription} (ID: ${userData.iD_RolUsuario})`)
      } catch (error) {
        console.error("[AuthContext] Error al determinar rol del usuario:", error)
      }
    }

    await persistUserData(userData)

    setAuthState((prevState) => ({
      ...prevState,
      user: userData,
      isAdmin,
      isBarOwner,
      isApproved: userData?.estado,
      isLoading: false,
      isAuthenticated: !!userData,
      isRegistered: isRegistered,
    }))
  }, [])

  const clearAuth = useCallback(async () => {
    console.log("[AuthContext] Limpiando estado de autenticación")
    await clearPersistedData()
    setAuthState({
      user: null,
      isAdmin: false,
      isBarOwner: false,
      isApproved: false,
      isLoading: false,
      isAuthenticated: false,
      isRegistered: false,
      googleIdToken: null,
      googleUserData: null,
      pendingPaymentNavigation: null,
    })
  }, [])

  const formatISODate = (date) => {
    if (!date) return new Date().toISOString()
    const dateObj = new Date(date)
    return dateObj.toISOString()
  }

  const iniciarSesionConGoogle = useCallback(async (idToken) => {
    try {
      console.log("[AuthContext] Validando usuario con Google...")
      const response = await fetch(`${API_BASE_URL}/api/usuarios/iniciarSesionConGoogle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: idToken,
        }),
      })

      const result = await response.json()
      console.log("[AuthContext] Respuesta del endpoint iniciarSesionConGoogle")

      if (response.ok) {
        if (result.jwtToken) {
          await storeJwtToken(result.jwtToken)
          setAuthState((prev) => ({ ...prev, jwtToken: result.jwtToken }))
          console.log("[AuthContext] JWT token guardado")
        }
        return result.usuario
      } else if (response.status === 400 && result.existeUsuario === false) {
        console.log("[AuthContext] Usuario no registrado:", result.mensaje)

        Alert.alert("Registro requerido", result.mensaje, [
          {
            text: "OK",
            onPress: () => console.log("Usuario confirmó que necesita registrarse"),
          },
        ])

        return null
      } else {
        const errorText = await response.text()
        throw new Error(`Error inesperado en la API: ${errorText}`)
      }
    } catch (error) {
      if (error.message && !error.message.includes("Usuario no existe")) {
        console.error("[AuthContext] Error al validar usuario con Google:", error)
      }
      throw error
    }
  }, [])

  const refreshGoogleToken = useCallback(async () => {
    try {
      console.log("[AuthContext] Refrescando token de Google...")
      const tokens = await GoogleSignin.getTokens()

      if (tokens.idToken) {
        console.log("[AuthContext] Nuevo token de Google obtenido")
        setAuthState((prev) => ({
          ...prev,
          googleIdToken: tokens.idToken,
        }))
        return tokens.idToken
      } else {
        throw new Error("No se pudo obtener un nuevo token de Google")
      }
    } catch (error) {
      console.error("[AuthContext] Error al refrescar token de Google:", error)
      throw error
    }
  }, [])

  const autenticacionConGoogle = useCallback(
    async (roleDescription) => {
      try {
        console.log("[AuthContext] Refrescando token antes de autenticar...")
        const freshToken = await refreshGoogleToken()

        const rolUsuario = await getRoleIdByDescription(roleDescription)
        console.log(`[AuthContext] Autenticando con rol: ${roleDescription} (ID: ${rolUsuario})`)

        const requestBody = {
          idToken: freshToken,
          rolUsuario: rolUsuario,
        }

        const response = await fetch(`${API_BASE_URL}/api/Usuarios/registrarseConGoogle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        if (response.ok) {
          const result = await response.json()
          console.log("[AuthContext] Usuario autenticado exitosamente")

          if (result.jwtToken) {
            await storeJwtToken(result.jwtToken)
            setAuthState((prev) => ({ ...prev, jwtToken: result.jwtToken }))
          }

          const combinedUserData = {
            ...result.usuario,
            displayName: authState.googleUserData?.displayName,
            photo: authState.googleUserData?.photo,
            givenName: authState.googleUserData?.givenName,
            familyName: authState.googleUserData?.familyName,
          }

          await updateAuth(combinedUserData, true)
          return { success: true, usuario: combinedUserData }
        } else {
          let errorText = ""
          let errorJson = null

          try {
            errorText = await response.text()
            if (errorText) {
              try {
                errorJson = JSON.parse(errorText)
              } catch (e) {}
            }
          } catch (e) {}

          const errorMessage = errorJson?.mensaje || errorJson?.message || errorText || "Error desconocido"
          throw new Error(`Error en autenticación (${response.status}): ${errorMessage}`)
        }
      } catch (error) {
        console.error("[AuthContext] Error en autenticacionConGoogle:", error)
        throw error
      }
    },
    [authState.googleUserData, updateAuth, refreshGoogleToken]
  )

  const loginWithGoogle = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }))
    try {
      console.log("[AuthContext] Iniciando proceso de login con Google")
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      await GoogleSignin.signOut()

      const userInfo = await GoogleSignin.signIn()
      console.log("[AuthContext] Información de usuario de Google obtenida")

      if (!userInfo.idToken) {
        throw new Error("No se pudo obtener el idToken de Google Sign-In")
      }

      const googleUserData = {
        email: userInfo.user.email,
        displayName: userInfo.user.name,
        uid: userInfo.user.id,
        givenName: userInfo.user.givenName,
        familyName: userInfo.user.familyName,
        photo: userInfo.user.photo,
      }

      setAuthState((prev) => ({
        ...prev,
        googleIdToken: userInfo.idToken,
        googleUserData: googleUserData,
      }))

      const registeredUser = await iniciarSesionConGoogle(userInfo.idToken)

      if (registeredUser) {
        console.log("[AuthContext] Usuario registrado, actualizando estado")

        const combinedUserData = {
          ...registeredUser,
          displayName: googleUserData.displayName,
          photo: googleUserData.photo,
          givenName: googleUserData.givenName,
          familyName: googleUserData.familyName,
        }

        await updateAuth(combinedUserData, true)
        return { success: true, user: combinedUserData, isRegistered: true }
      } else {
        console.log("[AuthContext] Usuario no registrado")
        await updateAuth(googleUserData, false)
        return { success: true, user: googleUserData, isRegistered: false }
      }
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || ""
      const isCancelled =
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("Sign in action cancelled")

      if (isCancelled) {
        console.log("[AuthContext] Usuario canceló el inicio de sesión")
        clearAuth()
        return { success: false, cancelled: true }
      }

      console.error("[AuthContext] Error durante el inicio de sesión:", error)
      clearAuth()
      throw error
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [iniciarSesionConGoogle, updateAuth, clearAuth])

  const buscarUsuarioPorId = useCallback(async (userId) => {
    try {
      console.log("[AuthContext] Buscando usuario por ID:", userId)
      const response = await fetch(`${API_BASE_URL}/api/usuarios/buscarIdUsuario/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const user = await response.json()
        return user
      } else {
        const errorText = await response.text()
        throw new Error(`Error al buscar usuario: ${errorText}`)
      }
    } catch (error) {
      console.error("[AuthContext] Error al buscar usuario:", error)
      throw error
    }
  }, [])

  const actualizarUsuario = useCallback(
    async (userId, userData) => {
      try {
        console.log("[AuthContext] Actualizando usuario:", userId)

        const dataToSend = {
          ...userData,
          fechaCreacion: formatISODate(userData.fechaCreacion),
        }

        const response = await fetch(`${API_BASE_URL}/api/usuarios/actualizar/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        })

        if (response.ok) {
          const responseText = await response.text()
          let updatedUser
          if (responseText.trim()) {
            try {
              updatedUser = JSON.parse(responseText)
            } catch (parseError) {
              updatedUser = dataToSend
            }
          } else {
            updatedUser = dataToSend
          }

          const combinedUserData = {
            ...updatedUser,
            displayName: authState.googleUserData?.displayName,
            photo: authState.googleUserData?.photo,
            givenName: authState.googleUserData?.givenName,
            familyName: authState.googleUserData?.familyName,
          }

          await updateAuth(combinedUserData, true)
          return combinedUserData
        } else {
          const errorText = await response.text()
          throw new Error(`Error al actualizar usuario: ${response.status} - ${errorText}`)
        }
      } catch (error) {
        console.error("[AuthContext] Error al actualizar usuario:", error)
        throw error
      }
    },
    [updateAuth, authState.googleUserData]
  )

  const eliminarUsuario = useCallback(
    async (userId) => {
      try {
        console.log("[AuthContext] Eliminando usuario:", userId)
        const response = await fetch(`${API_BASE_URL}/api/usuarios/eliminar/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log("[AuthContext] Usuario eliminado exitosamente")
          clearAuth()
          return { success: true }
        } else {
          const errorText = await response.text()
          throw new Error(`Error al eliminar usuario: ${errorText}`)
        }
      } catch (error) {
        console.error("[AuthContext] Error al eliminar usuario:", error)
        throw error
      }
    },
    [clearAuth]
  )

  const logout = useCallback(async () => {
    try {
      console.log("[AuthContext] Cerrando sesión...")
      await GoogleSignin.signOut()
      await clearAuth()
    } catch (error) {
      console.error("[AuthContext] Error during logout:", error)
    }
  }, [clearAuth])

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        loginWithGoogle,
        autenticacionConGoogle,
        logout,
        updateAuth,
        clearAuth,
        buscarUsuarioPorId,
        actualizarUsuario,
        eliminarUsuario,
        clearPendingPaymentNavigation,
        savePendingPayment, 
        clearPendingPayment, 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}