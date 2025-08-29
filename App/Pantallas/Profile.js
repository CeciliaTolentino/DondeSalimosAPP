import { useState, useContext, useEffect } from "react"
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native"
import { AuthContext } from "../../AuthContext"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const ComercioStatus = ({ userId }) => {
  const [comercioStatus, setComercioStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComercioStatus()
  }, [userId])

  const fetchComercioStatus = async () => {
    try {
      // Obtener todos los comercios y buscar el que pertenece al usuario
      const response = await fetch(`${API_BASE_URL}/api/comercios/listado`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const comercios = await response.json()
        console.log("Buscando comercio para usuario:", userId)

        // Buscar el comercio que pertenece al usuario actual
        const userComercio = comercios.find((comercio) => comercio.iD_Usuario === userId)

        if (userComercio) {
          console.log("Comercio encontrado:", userComercio)
          setComercioStatus(userComercio)
        } else {
          console.log("No se encontró comercio para el usuario")
          setComercioStatus(null)
        }
      } else {
        setComercioStatus(null)
      }
    } catch (error) {
      console.error("Error al obtener estado del comercio:", error)
      setComercioStatus(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Text style={styles.info}>
        <Text style={styles.infoLabel}>Estado del comercio:</Text> Cargando...
      </Text>
    )
  }

  if (!comercioStatus) {
    return (
      <Text style={styles.info}>
        <Text style={styles.infoLabel}>Estado del comercio:</Text> No registrado
      </Text>
    )
  }

  return (
    <View style={styles.comercioStatusContainer}>
      <Text style={styles.info}>
        <Text style={styles.infoLabel}>Comercio:</Text> {comercioStatus.nombre}
      </Text>
      <Text style={styles.info}>
        <Text style={styles.infoLabel}>Tipo:</Text> {comercioStatus.tipoComercio?.descripcion || "No especificado"}
      </Text>
      <Text style={styles.info}>
        <Text style={styles.infoLabel}>Estado:</Text>{" "}
        <Text style={comercioStatus.estado ? styles.approvedText : styles.pendingText}>
          {comercioStatus.estado ? "✅ Aprobado" : "⏳ Pendiente de aprobación"}
        </Text>
      </Text>
    </View>
  )
}

export default function Profile() {
  const { user, updateAuth, buscarUsuarioPorId, actualizarUsuario, eliminarUsuario, logout } = useContext(AuthContext)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editedUser, setEditedUser] = useState({
    nombreUsuario: "",
    telefono: "",
  })

  useEffect(() => {
    if (user) {
      setEditedUser({
        nombreUsuario: user.nombreUsuario || "",
        telefono: user.telefono || "",
      })
    }
  }, [user])

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No hay usuario autenticado</Text>
      </View>
    )
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editedUser.nombreUsuario.trim()) {
      Alert.alert("Error", "El nombre de usuario es obligatorio")
      return
    }

    setIsLoading(true)
    try {
      // Preparar datos para actualizar (solo los campos permitidos)
      const updateData = {
        iD_Usuario: user.iD_Usuario,
        nombreUsuario: editedUser.nombreUsuario.trim(),
        telefono: editedUser.telefono.trim(),
        correo: user.correo,
        uid: user.uid,
        estado: user.estado,
        fechaCreacion: user.fechaCreacion,
        iD_RolUsuario: user.iD_RolUsuario,
      }

      console.log("Actualizando usuario con datos:", updateData)
      await actualizarUsuario(user.iD_Usuario, updateData)

      setIsEditing(false)
      Alert.alert("Éxito", "Perfil actualizado correctamente")

      // Verificar que los cambios se guardaron correctamente
      const updatedUser = await buscarUsuarioPorId(user.iD_Usuario)
      console.log("Usuario actualizado verificado:", updatedUser)
    } catch (error) {
      console.error("Error al actualizar el perfil:", error)
      Alert.alert("Error", "No se pudo actualizar el perfil. Por favor, intente de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditedUser({
      nombreUsuario: user.nombreUsuario || "",
      telefono: user.telefono || "",
    })
    setIsEditing(false)
  }

  const handleDeleteProfile = () => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Está seguro que desea eliminar su perfil? Esta acción no se puede deshacer.",
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
              await eliminarUsuario(user.iD_Usuario)
              Alert.alert("Perfil eliminado", "Su perfil ha sido eliminado exitosamente.")
            } catch (error) {
              console.error("Error al eliminar perfil:", error)
              Alert.alert("Error", "No se pudo eliminar el perfil. Por favor, intente de nuevo.")
            } finally {
              setIsLoading(false)
            }
          },
        },
      ],
    )
  }

  const getUserType = () => {
    if (user.iD_RolUsuario === 1) return "Usuario común"
    if (user.iD_RolUsuario === 2) return "Administrador"
    if (user.iD_RolUsuario === 3) return "Dueño de bar"
    return "Desconocido"
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5c288c" />
        <Text style={styles.loadingText}>Procesando...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil del Usuario</Text>

      {/* Foto de perfil */}
      {user.photo && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: user.photo }} style={styles.profilePhoto} />
        </View>
      )}

      {isEditing ? (
        <>
          <Text style={styles.label}>Nombre de usuario *</Text>
          <TextInput
            style={styles.input}
            value={editedUser.nombreUsuario}
            onChangeText={(text) => setEditedUser({ ...editedUser, nombreUsuario: text })}
            placeholder="Nombre de usuario"
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={editedUser.telefono}
            onChangeText={(text) => setEditedUser({ ...editedUser, telefono: text })}
            placeholder="Número de teléfono"
            keyboardType="phone-pad"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.buttonText}>Guardar cambios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.infoContainer}>
            <Text style={styles.info}>
              <Text style={styles.infoLabel}>Nombre:</Text> {user.nombreUsuario || user.displayName || "Sin nombre"}
            </Text>
            <Text style={styles.info}>
              <Text style={styles.infoLabel}>Email:</Text> {user.correo || user.email || "Sin email"}
            </Text>
            <Text style={styles.info}>
              <Text style={styles.infoLabel}>Teléfono:</Text> {user.telefono || "No especificado"}
            </Text>
            <Text style={styles.info}>
              <Text style={styles.infoLabel}>Tipo de usuario:</Text> {getUserType()}
            </Text>
            {user.iD_RolUsuario === 3 && <ComercioStatus userId={user.iD_Usuario} />}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.editButton]} onPress={handleEdit}>
              <Text style={styles.buttonText}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={logout}>
              <Text style={styles.buttonText}>Cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteProfile}>
              <Text style={styles.buttonText}>Borrar perfil</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#5c288c",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#5c288c",
  },
  infoContainer: {
    marginBottom: 30,
  },
  info: {
    fontSize: 16,
    marginBottom: 15,
    color: "#333",
  },
  infoLabel: {
    fontWeight: "bold",
    color: "#5c288c",
  },
  comercioStatusContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#5c288c",
  },
  pendingText: {
    color: "#ffc107",
    fontWeight: "bold",
    fontSize: 16,
  },
  approvedText: {
    color: "#28a745",
    fontWeight: "bold",
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "white",
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: "#5c288c",
  },
  saveButton: {
    backgroundColor: "#28a745",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  logoutButton: {
    backgroundColor: "#007bff",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
    marginTop: 50,
  },
})
