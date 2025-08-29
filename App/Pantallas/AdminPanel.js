import { useState, useEffect, useContext } from "react"
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
} from "react-native"
import { AuthContext } from "../../AuthContext"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

export default function AdminPanel() {
  const { user, isAuthenticated } = useContext(AuthContext)
  const [comercios, setComercios] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedComercio, setSelectedComercio] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  console.log("API_BASE_URL:", API_BASE_URL)
  console.log("Full URL:", `${API_BASE_URL}/api/comercios/listado`)

  useEffect(() => {
    if (isAuthenticated && user?.iD_RolUsuario === 2) {
      loadComercios()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  const loadComercios = async () => {
    try {
      setIsLoading(true)
      console.log("Cargando lista de comercios...")

      const response = await fetch(`${API_BASE_URL}/api/comercios/listado`, {
        method: "GET", // Cambiar a GET
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Comercios cargados:", data)
        setComercios(data)
      } else {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error al obtener comercios: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error al cargar comercios:", error)
      Alert.alert("Error", `No se pudieron cargar los comercios: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveComercio = async (comercio) => {
    try {
      // Enviar solo los campos básicos del comercio, sin las relaciones anidadas
      const updatedComercio = {
        iD_Comercio: comercio.iD_Comercio,
        nombre: comercio.nombre,
        capacidad: comercio.capacidad,
        mesas: comercio.mesas,
        generoMusical: comercio.generoMusical,
        tipoDocumento: comercio.tipoDocumento,
        nroDocumento: comercio.nroDocumento,
        direccion: comercio.direccion,
        correo: comercio.correo,
        telefono: comercio.telefono,
        estado: true, // Cambiar a aprobado
        fechaCreacion: comercio.fechaCreacion,
        iD_Usuario: comercio.iD_Usuario,
        iD_TipoComercio: comercio.iD_TipoComercio,
      }

      console.log("Aprobando comercio:", updatedComercio)

      const response = await fetch(`${API_BASE_URL}/api/comercios/actualizar/${comercio.iD_Comercio}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedComercio),
      })

      console.log("Response status:", response.status)

      if (response.ok) {
        Alert.alert("Éxito", "Comercio aprobado correctamente")
        await loadComercios()
        setModalVisible(false)
      } else {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error al aprobar comercio: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error al aprobar comercio:", error)
      Alert.alert("Error", `No se pudo aprobar el comercio: ${error.message}`)
    }
  }

  const handleRejectComercio = async (comercio) => {
    Alert.alert(
      "Rechazar comercio",
      "¿Está seguro que desea rechazar este comercio? Esta acción eliminará el registro.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/comercios/${comercio.iD_Comercio}`, {
                method: "DELETE",
              })

              if (response.ok) {
                Alert.alert("Comercio rechazado", "El comercio ha sido rechazado y eliminado.")
                await loadComercios()
                setModalVisible(false)
              } else {
                throw new Error("Error al rechazar comercio")
              }
            } catch (error) {
              console.error("Error al rechazar comercio:", error)
              Alert.alert("Error", "No se pudo rechazar el comercio")
            }
          },
        },
      ],
    )
  }

  const handleDeleteComercio = async (comercio) => {
    Alert.alert(
      "Eliminar comercio",
      `¿Está seguro que desea eliminar el comercio "${comercio.nombre}"? Esta acción no se puede deshacer.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/comercios/${comercio.iD_Comercio}`, {
                method: "DELETE",
              })

              if (response.ok) {
                Alert.alert("Comercio eliminado", "El comercio ha sido eliminado exitosamente.")
                await loadComercios()
                setModalVisible(false)
              } else {
                throw new Error("Error al eliminar comercio")
              }
            } catch (error) {
              console.error("Error al eliminar comercio:", error)
              Alert.alert("Error", "No se pudo eliminar el comercio")
            }
          },
        },
      ],
    )
  }

  const handleComercioPress = (comercio) => {
    setSelectedComercio(comercio)
    setModalVisible(true)
  }

  const renderComercioItem = ({ item }) => {
    const getStatusColor = () => {
      if (item.estado === true) return "#28a745" // Verde para aprobado
      if (item.estado === false) return "#ffc107" // Amarillo para pendiente
      return "#6c757d" // Gris para otros estados
    }

    const getStatusText = () => {
      if (item.estado === true) return "Aprobado"
      if (item.estado === false) return "Pendiente"
      return "Desconocido"
    }

    return (
      <TouchableOpacity style={styles.comercioItem} onPress={() => handleComercioPress(item)}>
        <View style={styles.comercioHeader}>
          <Text style={styles.comercioName}>{item.nombre}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.comercioDetails}>Tipo: {item.tipoComercio?.descripcion || "No especificado"}</Text>
        <Text style={styles.comercioDetails}>Propietario: {item.usuario?.nombreUsuario || "No especificado"}</Text>
        <Text style={styles.comercioDetails}>Email: {item.correo}</Text>
        <Text style={styles.comercioDetails}>Dirección: {item.direccion}</Text>
      </TouchableOpacity>
    )
  }

  // Verificación de acceso
  if (!isAuthenticated || user?.iD_RolUsuario !== 2) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No tiene permisos para acceder al panel de administración.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7f00b2" />
        <Text style={styles.loadingText}>Cargando comercios...</Text>
      </View>
    )
  }

  const pendingComercios = comercios.filter((c) => c.estado === false)
  const approvedComercios = comercios.filter((c) => c.estado === true)

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>

      <Text style={styles.sectionTitle}>Comercios Pendientes ({pendingComercios.length})</Text>
      {pendingComercios.length > 0 ? (
        <FlatList
          data={pendingComercios}
          renderItem={renderComercioItem}
          keyExtractor={(item) => item.iD_Comercio.toString()}
          style={styles.list}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay comercios pendientes de aprobación.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Comercios Aprobados ({approvedComercios.length})</Text>
      {approvedComercios.length > 0 ? (
        <FlatList
          data={approvedComercios}
          renderItem={renderComercioItem}
          keyExtractor={(item) => item.iD_Comercio.toString()}
          style={styles.list}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay comercios aprobados.</Text>
        </View>
      )}

      {/* Modal de detalles del comercio */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedComercio && (
              <>
                <Text style={styles.modalTitle}>{selectedComercio.nombre}</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: selectedComercio.estado ? "#28a745" : "#ffc107",
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>{selectedComercio.estado ? "Aprobado" : "Pendiente"}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Tipo de comercio:</Text>
                  <Text style={styles.detailValue}>
                    {selectedComercio.tipoComercio?.descripcion || "No especificado"}
                  </Text>
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
                    onPress={() => setModalVisible(false)}
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
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#7f00b2",
  },
  list: {
    maxHeight: 300,
    marginBottom: 10,
  },
  comercioItem: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  comercioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  comercioName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  comercioDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#7f00b2",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#d32f2f",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7f00b2",
    textAlign: "center",
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    width: 120,
  },
  detailValue: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  buttonContainer: {
    marginTop: 30,
    gap: 10,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#28a745",
  },
  rejectButton: {
    backgroundColor: "#ffc107",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})
