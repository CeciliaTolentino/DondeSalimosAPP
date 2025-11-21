
import { createContext, useState, useCallback, useEffect } from "react"
import { GoogleSignin } from "./../firebase"
import { Alert } from "react-native"
import { getRoleIdByDescription, getRoleDescriptionById, ROLE_DESCRIPTIONS } from "../utils/roleHelper"
import { clearJwtToken, storeJwtToken, getJwtToken } from "../Apis/Apis"

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
  })
useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        console.log("Verificando autenticación inicial...")
        const token = await getJwtToken()
console.log("Token", token)
        if (token) {
          console.log("Token encontrado en AsyncStorage al iniciar")
          // Aquí podrías validar el token con el backend si quieres
          // Por ahora, simplemente lo limpiamos si no hay usuario en el estado
          console.log("Limpiando token antiguo...")
          await clearJwtToken()
          console.log("Token limpiado exitosamente")
        } else {
          console.log("No hay token guardado al iniciar")
        }
      } catch (error) {
        console.error("Error verificando autenticación inicial:", error)
      } finally {
        setAuthState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    checkInitialAuth()
  }, [])
  const updateAuth = useCallback(async (userData, isRegistered = false) => {
    console.log("Actualizando estado de autenticación:", { userData, isRegistered })

    let isAdmin = false
    let isBarOwner = false

    if (userData?.iD_RolUsuario) {
      try {
        const roleDescription = await getRoleDescriptionById(userData.iD_RolUsuario)
        isAdmin = roleDescription === ROLE_DESCRIPTIONS.ADMINISTRADOR
        isBarOwner = roleDescription === ROLE_DESCRIPTIONS.USUARIO_COMERCIO
        console.log(`Rol del usuario: ${roleDescription} (ID: ${userData.iD_RolUsuario})`)
      } catch (error) {
        console.error("Error al determinar rol del usuario:", error)
      }
    }

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

  const clearAuth = useCallback(() => {
    console.log("Limpiando estado de autenticación")
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
    })
  }, [])

  const formatISODate = (date) => {
    if (!date) return new Date().toISOString()

    const dateObj = new Date(date)
    return dateObj.toISOString()
  }

  const iniciarSesionConGoogle = useCallback(async (idToken) => {
    try {
      console.log("Validando usuario con Google usando el nuevo endpoint")
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
      console.log("Respuesta del endpoint iniciarSesionConGoogle:", result)

      if (response.ok) {
        if (result.jwtToken) {
          await storeJwtToken(result.jwtToken)
          setAuthState((prev) => ({ ...prev, jwtToken: result.jwtToken }))
          console.log("JWT token obtenido del login y guardado")
        }
        return result.usuario
      } else if (response.status === 400 && result.existeUsuario === false) {
        console.log("Usuario no registrado:", result.mensaje)

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
        console.error("Error al validar usuario con Google:", error)
      }
      throw error
    }
  }, [])
const refreshGoogleToken = useCallback(async () => {
    try {
      console.log("Refrescando token de Google...")
      const tokens = await GoogleSignin.getTokens()

      if (tokens.idToken) {
        console.log("Nuevo token de Google obtenido exitosamente")
        setAuthState((prev) => ({
          ...prev,
          googleIdToken: tokens.idToken,
        }))
        return tokens.idToken
      } else {
        throw new Error("No se pudo obtener un nuevo token de Google")
      }
    } catch (error) {
      console.error("Error al refrescar token de Google:", error)
      throw error
    }
  }, [])
  const autenticacionConGoogle = useCallback(
    async (roleDescription) => {
      try {
        console.log("Refrescando token antes de autenticar...")
        const freshToken = await refreshGoogleToken()

        const rolUsuario = await getRoleIdByDescription(roleDescription)
        console.log(`Autenticando con rol: ${roleDescription} (ID: ${rolUsuario})`)
const requestBody = {
          idToken: freshToken, // Usando el token fresco en lugar del guardado
          rolUsuario: rolUsuario,
        }
        console.log(" Request body para registrarseConGoogle:", JSON.stringify(requestBody, null, 2))
        console.log(" URL de la API:", `${API_BASE_URL}/api/Usuarios/registrarseConGoogle`)

        const response = await fetch(`${API_BASE_URL}/api/Usuarios/registrarseConGoogle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
           body: JSON.stringify(requestBody),
        })

        console.log(" Response status:", response.status)
        console.log(" Response ok:", response.ok)
     //   console.log(" Response headers:", JSON.stringify([...response.headers.entries()]))

        if (response.ok) {
          const result = await response.json()
          console.log("Usuario autenticado exitosamente:", result)
        if (result.jwtToken) {
             await storeJwtToken(result.jwtToken)
            setAuthState((prev) => ({ ...prev, jwtToken: result.jwtToken }))
            console.log("JWT token obtenido del registro y guardado")
          }
          const combinedUserData = {
            ...result.usuario,
            displayName: authState.googleUserData?.displayName,
            photo: authState.googleUserData?.photo,
            givenName: authState.googleUserData?.givenName,
            familyName: authState.googleUserData?.familyName,
          }

          console.log("Datos combinados del usuario:", combinedUserData)
          await updateAuth(combinedUserData, true)
          return { success: true, usuario: combinedUserData }
        } else {
         // const errorText = await response.text()
         // throw new Error(`Error en autenticación: ${errorText}`)
         let errorText = ""
          let errorJson = null

          try {
            errorText = await response.text()
            console.log("Response error text:", errorText)

            if (errorText) {
              try {
                errorJson = JSON.parse(errorText)
                console.log("Response error JSON:", errorJson)
              } catch (e) {
                console.log("Error text is not JSON")
              }
            }
          } catch (e) {
            console.error("Error reading response text:", e)
          }

          const errorMessage = errorJson?.mensaje || errorJson?.message || errorText || "Error desconocido"
          throw new Error(`Error en autenticación (${response.status}): ${errorMessage}`)
        }
      } catch (error) {
        console.error("Error en autenticacionConGoogle:", error)
         console.error("Error stack:", error.stack)
        throw error
      }
    },
    [authState.googleUserData, updateAuth, refreshGoogleToken], // Agregando refreshGoogleToken a las dependencias,
  )

  const loginWithGoogle = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }))
    try {
      console.log("Iniciando proceso de login con Google")
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

      await GoogleSignin.signOut()

      const userInfo = await GoogleSignin.signIn()

      console.log("Información de usuario de Google obtenida")

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
        console.log("Usuario registrado, actualizando estado de autenticación")

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
        console.log("Usuario no registrado")
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
        console.log("Usuario canceló el inicio de sesión con Google")
        // No mostrar error, solo limpiar el estado
        clearAuth()
        return { success: false, cancelled: true }
      }

      // Para otros errores, sí mostrar el error
      console.error("Error durante el inicio de sesión con Google:", error)
      clearAuth()
      throw error
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [iniciarSesionConGoogle, updateAuth, clearAuth])

  const buscarUsuarioPorId = useCallback(async (userId) => {
    try {
      console.log("Buscando usuario por ID:", userId)
      const response = await fetch(`${API_BASE_URL}/api/usuarios/buscarIdUsuario/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const user = await response.json()
        console.log("Usuario encontrado:", user)
        return user
      } else {
        const errorText = await response.text()
        throw new Error(`Error al buscar usuario: ${errorText}`)
      }
    } catch (error) {
      console.error("Error al buscar usuario:", error)
      throw error
    }
  }, [])

  const actualizarUsuario = useCallback(
    async (userId, userData) => {
      try {
        console.log("Actualizando usuario:", userId, userData)

        const dataToSend = {
          ...userData,
          fechaCreacion: formatISODate(userData.fechaCreacion),
        }

        console.log("Datos a enviar con fecha formateada:", dataToSend)

        const response = await fetch(`${API_BASE_URL}/api/usuarios/actualizar/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        })

        console.log("Status de respuesta:", response.status)

        if (response.ok) {
          const responseText = await response.text()
          console.log("Respuesta raw:", responseText)

          let updatedUser
          if (responseText.trim()) {
            try {
              updatedUser = JSON.parse(responseText)
            } catch (parseError) {
              console.log("Error al parsear JSON, usando datos locales")
              updatedUser = dataToSend
            }
          } else {
            console.log("Respuesta vacía, usando datos locales")
            updatedUser = dataToSend
          }

          console.log("Usuario actualizado exitosamente:", updatedUser)

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
        console.error("Error al actualizar usuario:", error)
        throw error
      }
    },
    [updateAuth, authState.googleUserData],
  )

  const eliminarUsuario = useCallback(
    async (userId) => {
      try {
        console.log("Eliminando usuario:", userId)
        const response = await fetch(`${API_BASE_URL}/api/usuarios/eliminar/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log("Usuario eliminado exitosamente")
          clearAuth()
          return { success: true }
        } else {
          const errorText = await response.text()
          throw new Error(`Error al eliminar usuario: ${errorText}`)
        }
      } catch (error) {
        console.error("Error al eliminar usuario:", error)
        throw error
      }
    },
    [clearAuth],
  )


  const logout = useCallback(async () => {
    try {
      console.log("Cerrando sesión...")
      await GoogleSignin.signOut()
      clearAuth()
    } catch (error) {
      console.error("Error during logout:", error)
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
        
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
