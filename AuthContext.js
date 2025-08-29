import { createContext, useState, useCallback } from "react"
import { GoogleSignin } from "./firebase"
import { Alert } from "react-native"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    isAdmin: false,
    isBarOwner: false,
    isApproved: false,
    isLoading: false,
    isAuthenticated: false,
    isRegistered: false,
    googleIdToken: null,
    googleUserData: null, // Guardar datos de Google por separado
  })

  const updateAuth = useCallback((userData, isRegistered = false) => {
    console.log("Actualizando estado de autenticación:", { userData, isRegistered })
    setAuthState((prevState) => ({
      ...prevState,
      user: userData,
      isAdmin: userData?.iD_RolUsuario === 2,
      isBarOwner: userData?.iD_RolUsuario === 3,
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

  // Función para formatear fecha en formato ISO correcto
  const formatISODate = (date) => {
    if (!date) return new Date().toISOString()

    // Si ya es una fecha válida, convertirla
    const dateObj = new Date(date)
    return dateObj.toISOString()
  }

  // Método que maneja tanto respuestas exitosas como el caso de usuario no registrado
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

  // Nueva API para autenticación con Google después del registro
  const autenticacionConGoogle = useCallback(
    async (rolUsuario) => {
      try {
        if (!authState.googleIdToken) {
          throw new Error("No hay token de Google disponible")
        }

        console.log("Registrando en la base y en firebase con rol:", rolUsuario)
        const response = await fetch(`${API_BASE_URL}/api/usuarios/registrarseConGoogle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken: authState.googleIdToken,
            rolUsuario: rolUsuario
          }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log("Usuario registrado exitosamente:", result)

          // CORREGIR: Combinar datos del servidor con datos de Google
          const combinedUserData = {
            ...result.usuario,
            // Preservar datos de Google
            displayName: authState.googleUserData?.displayName,
            photo: authState.googleUserData?.photo,
            givenName: authState.googleUserData?.givenName,
            familyName: authState.googleUserData?.familyName,
          }

          console.log("Datos combinados del usuario:", combinedUserData)
          updateAuth(combinedUserData, true)
          return { success: true, usuario: combinedUserData }
        } else {
          const errorText = await response.text()
          throw new Error(`Error en autenticación: ${errorText}`)
        }
      } catch (error) {
        console.error("Error en autenticacionConGoogle:", error)
        throw error
      }
    },
    [authState.googleIdToken, authState.googleUserData, updateAuth],
  )

  const loginWithGoogle = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }))
    try {
      console.log("Iniciando proceso de login con Google")
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

      await GoogleSignin.signOut()

      const userInfo = await GoogleSignin.signIn()

      console.log("Información de usuario de Google obtenida: " +userInfo.idToken)

      if (!userInfo.idToken) {
        throw new Error("No se pudo obtener el idToken de Google Sign-In")
      }

      // Guardar el token y datos de Google para reutilizar
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

        // Combinar datos del servidor con datos de Google
        const combinedUserData = {
          ...registeredUser,
          displayName: googleUserData.displayName,
          photo: googleUserData.photo,
          givenName: googleUserData.givenName,
          familyName: googleUserData.familyName,
        }

        updateAuth(combinedUserData, true)
        return { success: true, user: combinedUserData, isRegistered: true }
      } else {
        console.log("Usuario no registrado")
        updateAuth(googleUserData, false)
        return { success: true, user: googleUserData, isRegistered: false }
      }
    } catch (error) {
      console.error("Error durante el inicio de sesión con Google:", error)
      clearAuth()
      throw error
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [iniciarSesionConGoogle, updateAuth, clearAuth])

  // Buscar usuario por ID
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

  // Actualizar usuario (solo nombreUsuario y teléfono)
  const actualizarUsuario = useCallback(
    async (userId, userData) => {
      try {
        console.log("Actualizando usuario:", userId, userData)

        // Formatear la fecha correctamente
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
          // Verificar si hay contenido en la respuesta
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

          // Preservar datos de Google al actualizar
          const combinedUserData = {
            ...updatedUser,
            displayName: authState.googleUserData?.displayName,
            photo: authState.googleUserData?.photo,
            givenName: authState.googleUserData?.givenName,
            familyName: authState.googleUserData?.familyName,
          }

          updateAuth(combinedUserData, true)
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

  // Eliminar usuario
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

  const registerComercio = useCallback(async (comercioData) => {
    try {
      console.log("Registrando comercio:", comercioData)

      // Formatear la fecha correctamente
      const dataToSend = {
        ...comercioData,
        fechaCreacion: formatISODate(comercioData.fechaCreacion),
      }

      console.log("Datos de comercio con fecha formateada:", dataToSend)

      const response = await fetch(`${API_BASE_URL}/api/comercios/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      })

      console.log("Status de respuesta del comercio:", response.status)

      if (response.ok) {
        // CORREGIR: Manejar respuesta que puede ser texto plano o JSON
        const responseText = await response.text()
        console.log("Respuesta raw del comercio:", responseText)

        let result
        try {
          // Intentar parsear como JSON
          result = JSON.parse(responseText)
          console.log("Comercio registrado exitosamente (JSON):", result)
        } catch (parseError) {
          // Si no es JSON, usar el texto como mensaje de éxito
          console.log("Comercio registrado exitosamente (texto):", responseText)
          result = { mensaje: responseText, success: true }
        }

        return result
      } else {
        const errorText = await response.text()
        throw new Error(`Error al registrar comercio: ${errorText}`)
      }
    } catch (error) {
      console.error("Error registering comercio:", error)
      throw error
    }
  }, [])

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
        registerComercio,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
