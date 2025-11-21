
import { useState, useContext, useEffect, useCallback } from "react"
import { AuthContext } from "../../Apis/AuthContext"
import { ROLE_DESCRIPTIONS } from "../../utils/roleHelper"
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
import { validateCUIT, formatCUIT } from "../../utils/cuitValidator"
import Apis from "../../Apis/Apis"
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
    Correo: "",
    Telefono: "",
  })
 const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  useEffect(() => {
    //console.log("Estado de autenticación actualizado en Login:", { isAuthenticated, isRegistered, user })
    if (isAuthenticated && !isRegistered) {
     // console.log("Usuario autenticado pero no registrado, mostrando formulario de registro")
      setShowRegistrationForm(true)
    } else if (isAuthenticated && isRegistered) {
     // console.log("Usuario autenticado y registrado, navegando a Profile")
      navigation.navigate("Profile")
    }
  }, [isAuthenticated, isRegistered, user, navigation])

  const handleGoogleAuth = async () => {
    try {
   //   console.log("Iniciando autenticación con Google")
      const result = await loginWithGoogle()
     // console.log("Resultado de autenticación:", result)
  if (result?.cancelled) {
        console.log("Autenticación cancelada por el usuario")
        return
      }
      if (result.success && !result.isRegistered) {
        console.log("Usuario autenticado pero no registrado, mostrando formulario de registro")
        setShowRegistrationForm(true)
      } else if (result.success && result.isRegistered) {
        console.log("Usuario ya registrado, navegando a Profile")
        navigation.navigate("Profile")
      }
    } catch (error) {
      console.error("Error durante la autenticación con Google:", error)
       Alert.alert(
        "Error de autenticación",
        "Hubo un problema al conectar con Google. Por favor, verifica tu conexión e intenta nuevamente.",
      )
    }
  }

  const handleRegistration = useCallback(async () => {
    try {
      
        if (isBarOwner) {
          if (
            !comercioData.Nombre ||
            !comercioData.NroDocumento ||
            !comercioData.Direccion ||
            !comercioData.Telefono ||
            !comercioData.Correo
          ) {
            Alert.alert("Error", "Por favor, complete todos los campos obligatorios del comercio.")
            return
          }
        
           if (!validateEmail(comercioData.Correo)) {
          Alert.alert("Email inválido", "Por favor, ingrese un email válido con el formato: ejemplo@dominio.com")
          return
        }

          const cuitValidation = validateCUIT(comercioData.NroDocumento)
          if (!cuitValidation.valid) {
            Alert.alert("Error de validación", cuitValidation.message)
            return
          }

          if (comercioData.Telefono.length < 10) {
            Alert.alert("Error", "El número de teléfono debe tener 10 dígitos.")
            return
          }
}

      const roleDescription = isBarOwner ? ROLE_DESCRIPTIONS.USUARIO_COMERCIO : ROLE_DESCRIPTIONS.USUARIO

      console.log("Enviando autenticación con Google con rol:", roleDescription)

      const result = await autenticacionConGoogle(roleDescription)
      console.log("Resultado completo de autenticacionConGoogle:", result)

      if (result.success) {
        if (isBarOwner) {
         
          const comercioDataToSend = {
            iD_Comercio: 0,
            nombre: comercioData.Nombre,
            capacidad: Number.parseInt(comercioData.Capacidad) || 0,
            mesas: Number.parseInt(comercioData.Mesas) || 0,
            generoMusical: comercioData.GeneroMusical,
            tipoDocumento: comercioData.TipoDocumento.trim(),
            nroDocumento: formatCUIT(comercioData.NroDocumento),
            direccion: comercioData.Direccion,
            correo: comercioData.Correo,
            telefono: comercioData.Telefono,
            estado: false,
            fechaCreacion: new Date().toISOString(),
            iD_Usuario: result.usuario.iD_Usuario,
            iD_TipoComercio: comercioData.ID_TipoComercio,
          }

          try {
            const comercioResponse = await Apis.crearComercio(comercioDataToSend)
            console.log("Comercio registrado exitosamente:", comercioResponse.data)

            Alert.alert(
               "Registro exitoso",
              "Su comercio ha sido registrado y está pendiente de aprobación por el administrador. Puede ver el estado en la sección 'Bar Management'.",
              [
                {
                  text: "OK",
                  
                   onPress: () => {
                    console.log("Usuario confirmó mensaje de registro exitoso")
                    setShowRegistrationForm(false)
                    navigation.navigate("Profile")
                  },
                },
              ],
            )
          } catch (comercioError) {
            console.log("Error al registrar comercio:", comercioError)
             let errorMessage = "No se pudo registrar el comercio. Por favor, intente de nuevo."

            let errorTitle = "Error al registrar comercio"

            // Detectar error de CUIT duplicado
            const errorData = comercioError.response?.data
            const errorText = JSON.stringify(errorData).toLowerCase()

            if (errorText.includes("cuit") || errorText.includes("nrodocumento")) {
              errorTitle = "Usuario creado - Comercio pendiente"
              errorMessage =
                "Su usuario ha sido creado exitosamente, pero no se pudo registrar el comercio porque el CUIT ingresado ya está en uso por otro comercio.\n\nPor favor, verifique el número de CUIT e intente crear el comercio nuevamente desde la sección 'Bar Management'."
            } else if (errorData?.errors?.Correo) {
                
              "El correo ingresado es inválido. Por favor, verifique el formato (ejemplo@dominio.com) e intente nuevamente."
            } else if (errorData?.errors) {
              const errorMessages = Object.values(errorData.errors).flat()
                errorMessage = errorMessages.join("\n")
             } else if (errorData?.message) {
              errorMessage = errorData.message
            }

            Alert.alert(errorTitle, errorMessage, [
              {
                text: "OK",
                onPress: () => {
                  // Si el error es de CUIT duplicado, navegar a Profile para que pueda acceder a Bar Management
                  if (errorText.includes("cuit") || errorText.includes("nrodocumento")) {
                    setShowRegistrationForm(false)
                    navigation.navigate("Profile")
                  }
                  // Si es otro error, mantener el formulario abierto para corrección
                },
              },
            ])
          }
        } else {
          Alert.alert("Registro exitoso", "Sus datos han sido registrados correctamente.")
          navigation.navigate("Profile")
        }
      }
    } catch (error) {
      console.log("Error al registrar:", error)
      Alert.alert("Error", "No se pudo completar el registro. Por favor, intente de nuevo.")
    }
  }, [isBarOwner, comercioData,  autenticacionConGoogle,   navigation])

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
        <View style={[styles.tarjeta, showRegistrationForm && styles.tarjetaExpanded]}>
          {!isAuthenticated || (isAuthenticated && !isRegistered) ? (
            !showRegistrationForm ? (
             
                <TouchableOpacity style={styles.cajaBoton1} onPress={handleGoogleAuth}>
                  <Image
                  source={require("../../img/gmail.png")}
                  style={styles.googleLogo}
                />
                  <Text style={styles.Textoboton}>Continuar con Google</Text>
                </TouchableOpacity>
              
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
                  <Text style={styles.Texto}>¿Es dueño de un bar/boliche?</Text>
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
                      placeholderTextColor="#b0b0b0"
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
                      placeholderTextColor="#b0b0b0"
                      value={comercioData.Capacidad}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Capacidad: text }))}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Número de mesas"
                      placeholderTextColor="#b0b0b0"
                      value={comercioData.Mesas}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Mesas: text }))}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Género musical"
                      placeholderTextColor="#b0b0b0"
                      value={comercioData.GeneroMusical}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, GeneroMusical: text }))}
                    />
                     <TextInput
                      style={styles.input}
                      placeholder="Dirección del comercio *"
                      placeholderTextColor="#b0b0b0"
                      value={comercioData.Direccion}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Direccion: text }))}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Correo del comercio *"
                      placeholderTextColor="#b0b0b0"
                      value={comercioData.Correo}
                      onChangeText={(text) => setComercioData((prevState) => ({ ...prevState, Correo: text }))}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="CUIT"
                      placeholderTextColor="#b0b0b0"
                      value={comercioData.NroDocumento}
                      onChangeText={(text) => {
                        const formatted = formatCUIT(text)
                        setComercioData((prevState) => ({ ...prevState, NroDocumento: formatted }))
                      }}
                      keyboardType="numeric"
                      maxLength={13}
                    />
                    <Text style={styles.helperText}>Formato: 20-12345678-9 (11 dígitos con guiones)</Text>
                    <Text style={styles.label}>Teléfono del comercio *</Text>
                    <View style={styles.phoneContainer}>
                     
                      <TextInput
                        style={styles.input}
                        placeholder="1132419131 (10 dígitos)"
                        placeholderTextColor="#b0b0b0"
                        value={comercioData.Telefono}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10)
                          setComercioData((prevState) => ({ ...prevState, Telefono: cleaned }))
                        }}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>
                    <Text style={styles.helperText}>Ingrese 10 dígitos sin espacios ni guiones</Text>
                  </>
                )}
                <TouchableOpacity style={styles.cajaBoton1} onPress={handleRegistration}>
                  <Text style={styles.Textoboton}>Completar registro</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Hola, {user?.nombreUsuario || user?.displayName || "Usuario"}!</Text>
              <Text style={styles.userTypeText}>Email: {user?.correo || user?.email}</Text>
              <Text style={styles.userTypeText}>Tipo de usuario: {user?.roleDescription || "Cargando..."}</Text>
              {user?.isBarOwner && !user?.estado && (
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
    backgroundColor: "#1a1a2e", // Azul oscuro profundo
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
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "rgba(167, 139, 250, 0.6)", 
    backgroundColor: "rgba(255, 255, 255, 0.95)", 
  },
  tarjeta: {
    backgroundColor: "rgba(42, 42, 62, 0.5)", 
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)", 
    shadowColor: "#8b5cf6",
   shadowOffset: {
      width: 0,
     height: 8,
    },
    shadowOpacity: 10.2,
    shadowRadius: 20,
    elevation: 100,
  },
   tarjetaExpanded: {
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 200, // Mayor elevación para el formulario de registro
  },
 cajaBoton1:{
  backgroundColor: "rgba(151, 60, 236, 0.23)", // este es el feo
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(130, 10, 241, 0.3)", // Borde fuscia sutil visto y no es
   shadowColor: "#db32f1ff", // visto y no es
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 106},
  cajaBoton: {
  backgroundColor: "rgba(151, 60, 236, 0.23)", 
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(130, 10, 241, 0.3)", 
   shadowColor: "#db32f1ff", 
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 106,
  },
  Textoboton: {
    color: "#ffffff",
    fontSize: 16,
  
  },
  registrationForm: {
    marginTop: 20,
  },
  formTitle: {
    fontSize: 20,
  
    marginBottom: 15,
    textAlign: "center",
    color: "#b4a0ff", 
  },
  input: {
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.3)", 
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 15,
    backgroundColor: "rgba(26, 26, 46, 0.4)", 
    color: "#e8e8e8", 
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    padding: 12,
    backgroundColor: "rgba(26, 26, 46, 0.4)", 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)", 
  },
  picker: {
    marginBottom: 15,
    backgroundColor: "rgba(26, 26, 46, 0.4)", 
    borderRadius: 10,
    color: "#e8e8e8", 
  },
  userInfo: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 18,
   
    marginBottom: 10,
    color: "#b4a0ff", 
  },
  userTypeText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#e8e8e8", 
  },
  Texto:{color: "#e8e8e8"},
  pendingApprovalText: {
    color: "#f9a8d4", 
    fontStyle: "italic",
    marginBottom: 10,
    fontWeight: "600",
  },
  welcomeMessage: {
    backgroundColor: "rgba(26, 26, 46, 0.4)", 
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(236, 72, 153, 0.7)", 
  },
  welcomeTitle: {
    fontSize: 18,
   
    color: "#f9a8d4", 
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
  
    marginBottom: 5,
    marginTop: 10,
    color: "#b4a0ff", 
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },

  phoneInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.3)", 
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(26, 26, 46, 0.4)", 
    color: "#e8e8e8", 
  },
  helperText: {
    fontSize: 12,
    color: "#b0b0b0",
    marginBottom: 10,
    fontStyle: "italic",
  },
})
