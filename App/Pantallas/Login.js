import { useState, useContext, useEffect, useCallback } from "react"
import { AuthContext } from "../../AuthContext"
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { useNavigation } from "@react-navigation/native"

export default function Login() {
  const navigation = useNavigation()
  const {
    user,
    isLoading,
    isAuthenticated,
    isRegistered,
    loginWithGoogle,
    autenticacionConGoogle,
    logout,
    registerComercio,
  } = useContext(AuthContext)

  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [isBarOwner, setIsBarOwner] = useState(false)
  const [comercioData, setComercioData] = useState({
    ID_TipoComercio: 1,
    Nombre: "",
    Capacidad: "",
    Mesas: "",
    GeneroMusical: "",
    TipoDocumento: "CUIT",
    NroDocumento: "",
    Direccion: "",
    Telefono: "",
  })

  // Prellenar el correo cuando el usuario esté disponible
  useEffect(() => {
    if (user && user.email) {
      setComercioData((prev) => ({
        ...prev,
        Correo: user.email,
      }))
    }
  }, [user])

  useEffect(() => {
    console.log("Estado de autenticación actualizado en Login:", { isAuthenticated, isRegistered, user })
    if (isAuthenticated && !isRegistered) {
      console.log("Usuario autenticado pero no registrado, mostrando formulario de registro")
      setShowRegistrationForm(true)
    } else if (isAuthenticated && isRegistered) {
      console.log("Usuario autenticado y registrado, navegando a Profile")
      navigation.navigate("Profile")
    }
  }, [isAuthenticated, isRegistered, user, navigation])

  const handleGoogleAuth = async () => {
    try {
      console.log("Iniciando autenticación con Google")
      const result = await loginWithGoogle()
      console.log("Resultado de autenticación:", result)

      if (result.success && !result.isRegistered) {
        console.log("Usuario autenticado pero no registrado, mostrando formulario de registro")
        setShowRegistrationForm(true)
      } else if (result.success && result.isRegistered) {
        console.log("Usuario ya registrado, navegando a Profile")
        navigation.navigate("Profile")
      }
    } catch (error) {
      console.error("Error durante la autenticación con Google:", error)
      Alert.alert("Error de autenticación", "No se pudo autenticar con Google. Por favor, intente de nuevo.")
    }
  }

  const handleRegistration = useCallback(async () => {
    try {
      // Determinar el rol basado en la selección del usuario
      const rolUsuario = isBarOwner ? 3 : 1

      console.log("Enviando autenticación con Google con rol:", rolUsuario)

      // Usar la nueva API autenticacionConGoogle
      const result = await autenticacionConGoogle(rolUsuario)
      console.log("Resultado completo de autenticacionConGoogle:", result)

      if (result.success) {
        if (isBarOwner) {
          // Validar que tenemos todos los datos necesarios del comercio
          if (!comercioData.Nombre || !comercioData.NroDocumento || !comercioData.Direccion || !comercioData.Telefono) {
            Alert.alert("Error", "Por favor, complete todos los campos obligatorios del comercio.")
            return
          }

          // Si es dueño de bar, registrar el comercio
          const comercioDataToSend = {
            iD_Comercio: 0,
            nombre: comercioData.Nombre,
            capacidad: Number.parseInt(comercioData.Capacidad) || 0,
            mesas: Number.parseInt(comercioData.Mesas) || 0,
            generoMusical: comercioData.GeneroMusical,
            tipoDocumento: comercioData.TipoDocumento,
            nroDocumento: comercioData.NroDocumento,
            direccion: comercioData.Direccion,
            correo: user.email, // Usar el email de Google
            telefono: comercioData.Telefono,
            estado: false,
            fechaCreacion: new Date().toISOString(),
            iD_Usuario: result.usuario.iD_Usuario, // CORREGIR: usar result.usuario
            iD_TipoComercio: comercioData.ID_TipoComercio,
          }

          console.log("=== DATOS DEL COMERCIO A ENVIAR ===")
          console.log("Nombre del comercio:", comercioDataToSend.nombre)
          console.log("Tipo de comercio:", comercioDataToSend.iD_TipoComercio)
          console.log("Capacidad:", comercioDataToSend.capacidad)
          console.log("Mesas:", comercioDataToSend.mesas)
          console.log("Género musical:", comercioDataToSend.generoMusical)
          console.log("CUIT:", comercioDataToSend.nroDocumento)
          console.log("Dirección:", comercioDataToSend.direccion)
          console.log("Correo:", comercioDataToSend.correo)
          console.log("Teléfono:", comercioDataToSend.telefono)
          console.log("ID Usuario:", comercioDataToSend.iD_Usuario)
          console.log("Estado:", comercioDataToSend.estado)
          console.log("=== FIN DATOS COMERCIO ===")

          try {
            await registerComercio(comercioDataToSend)
            console.log("✅ Comercio registrado exitosamente")

            // CORREGIR: Mostrar el alert DESPUÉS del registro exitoso
            Alert.alert(
              "Registro pendiente de aprobación",
              "Su solicitud ha sido enviada al administrador para su aprobación. Recibirá una notificación cuando sea aprobada.",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    console.log("Usuario confirmó mensaje de aprobación")
                    await logout()
                    setShowRegistrationForm(false)
                  },
                },
              ],
            )
          } catch (comercioError) {
            console.error("Error al registrar comercio:", comercioError)
            Alert.alert("Error", "No se pudo registrar el comercio. Por favor, intente de nuevo.")
          }
        } else {
          Alert.alert("Registro exitoso", "Sus datos han sido registrados correctamente.")
          navigation.navigate("Profile")
        }
      }
    } catch (error) {
      console.error("Error al registrar:", error)
      Alert.alert("Error", "No se pudo completar el registro. Por favor, intente de nuevo.")
    }
  }, [isBarOwner, comercioData, autenticacionConGoogle, registerComercio, logout, navigation, user])

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Image source={require("../../img/login.png")} style={styles.logo} />
        <View style={styles.tarjeta}>
          {!isAuthenticated || (isAuthenticated && !isRegistered) ? (
            !showRegistrationForm ? (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cajaBoton} onPress={handleGoogleAuth}>
                  <Text style={styles.Textoboton}>Iniciar sesión / Registrarse con Google</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.registrationForm}>
                <Text style={styles.formTitle}>Complete su registro</Text>
                <View style={styles.welcomeMessage}>
                  <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
                  <Text style={styles.welcomeText}>
                    Estás a un paso de descubrir los mejores lugares para salir y disfrutar
                  </Text>
                </View>
                <View style={styles.switchContainer}>
                  <Text>¿Es dueño de un bar/boliche?</Text>
                  <Switch
                    value={isBarOwner}
                    onValueChange={(value) => {
                      setIsBarOwner(value)
                    }}
                  />
                </View>
                {isBarOwner && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre del comercio *"
                      value={comercioData.Nombre}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Nombre: text }))}
                    />
                    <Picker
                      selectedValue={comercioData.ID_TipoComercio}
                      style={styles.picker}
                      onValueChange={(itemValue) =>
                        setComercioData((prevState) => ({ ...prevState, ID_TipoComercio: itemValue }))
                      }
                    >
                      <Picker.Item label="Bar" value={1} />
                      <Picker.Item label="Boliche" value={2} />
                    </Picker>
                    <TextInput
                      style={styles.input}
                      placeholder="Capacidad"
                      value={comercioData.Capacidad}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Capacidad: text }))}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Número de mesas"
                      value={comercioData.Mesas}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Mesas: text }))}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Género musical"
                      value={comercioData.GeneroMusical}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, GeneroMusical: text }))}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="CUIT *"
                      value={comercioData.NroDocumento}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, NroDocumento: text }))}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Dirección *"
                      value={comercioData.Direccion}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Direccion: text }))}
                    />
                    {/* Campo de correo deshabilitado y prellenado */}
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      placeholder="Correo electrónico"
                      value={user?.email || ""}
                      editable={false}
                      keyboardType="email-address"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Teléfono *"
                      value={comercioData.Telefono}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Telefono: text }))}
                      keyboardType="phone-pad"
                    />
                  </>
                )}
                <TouchableOpacity style={styles.cajaBoton} onPress={handleRegistration}>
                  <Text style={styles.Textoboton}>Completar registro</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Hola, {user?.nombreUsuario || user?.displayName || "Usuario"}!</Text>
              <Text style={styles.userTypeText}>Email: {user?.correo || user?.email}</Text>
              <Text style={styles.userTypeText}>
                Tipo de usuario:{" "}
                {user?.iD_RolUsuario === 3
                  ? "Dueño de bar"
                  : user?.iD_RolUsuario === 2
                    ? "Administrador"
                    : "Usuario común"}
              </Text>
              {user?.iD_RolUsuario === 3 && !user?.estado && (
                <Text style={styles.pendingApprovalText}>
                  Su cuenta está pendiente de aprobación por el administrador.
                </Text>
              )}
              <TouchableOpacity style={styles.cajaBoton} onPress={logout}>
                <Text style={styles.Textoboton}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  tarjeta: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    marginTop: 20,
  },
  cajaBoton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  Textoboton: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  registrationForm: {
    marginTop: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  picker: {
    marginBottom: 15,
  },
  userInfo: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  userTypeText: {
    fontSize: 16,
    marginBottom: 5,
  },
  pendingApprovalText: {
    color: "orange",
    fontStyle: "italic",
    marginBottom: 10,
  },
  welcomeMessage: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
})
