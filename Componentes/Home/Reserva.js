
import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
   Modal,
  TextInput,
} from "react-native"
import { AuthContext } from "../../AuthContext"
import Apis from "../../Apis"

export default function Reservas() {
  const { user, isAuthenticated, isBarOwner } = useContext(AuthContext)
  const [reservas, setReservas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [comerciosList, setComerciosList] = useState([])
  const [selectedComercio, setSelectedComercio] = useState(null)
const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [reservaToReject, setReservaToReject] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      if (isBarOwner) {
        loadComerciosAndReservas()
      } else {
        loadUserReservas()
      }
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, isBarOwner])

  const filterFutureReservas = (reservasList) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return reservasList.filter((reserva) => {
      const reservaDate = new Date(reserva.fechaReserva)
      reservaDate.setHours(0, 0, 0, 0)
      return reservaDate >= today
    })
  }

  const loadUserReservas = async () => {
    try {
      const response = await Apis.obtenerReservasListado()

      if (response.status === 200 && response.data) {
        const allReservas = response.data
        const userReservas = allReservas.filter((r) => r.iD_Usuario == user.iD_Usuario)

        //const futureReservas = filterFutureReservas(userReservas)
        setReservas(userReservas)
      } else {
        setReservas([])
      }
    } catch (error) {
      console.error("❌ Error al cargar reservas del usuario:", error)
      setReservas([])
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const loadComerciosAndReservas = async () => {
    try {
      const comerciosResponse = await Apis.obtenerComerciosListado()

      if (comerciosResponse.status === 200 && comerciosResponse.data) {
        const comercios = comerciosResponse.data
        const userComercios = comercios.filter((comercio) => comercio.iD_Usuario === user.iD_Usuario && comercio.estado)

        if (userComercios.length > 0) {
          setComerciosList(userComercios)
          setSelectedComercio(userComercios[0])
          await loadReservas(userComercios[0].nombre)
        } else {
          setComerciosList([])
          setSelectedComercio(null)
          setReservas([])
        }
      }
    } catch (error) {
      console.error("Error al cargar comercios:", error)
      Alert.alert("Error", "No se pudo cargar la información de los comercios.")
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const loadReservas = async (nombreComercio) => {
    try {
      const response = await Apis.obtenerReservasPorComercio(nombreComercio)

      if (response.status === 200 && response.data) {
        const futureReservas = filterFutureReservas(response.data)
        const activeReservas = futureReservas.filter((reserva) => !(reserva.estado === false && reserva.motivoRechazo))
        setReservas(activeReservas)
      } else {
        setReservas([])
      }
    } catch (error) {
      console.error("Error al cargar reservas:", error)
      setReservas([])
    }
  }
const handleUserDeleteReserva = (reservaId) => {
    Alert.alert("Eliminar Reserva", "¿Estás seguro de que deseas eliminar esta reserva?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await Apis.eliminarReserva(reservaId)

            if (response.status === 204 || response.status === 200) {
              setReservas((prevReservas) => prevReservas.filter((r) => r.iD_Reserva !== reservaId))
              Alert.alert("Éxito", "Reserva eliminada correctamente.")
            } else {
              throw new Error("Error al eliminar reserva")
            }
          } catch (error) {
            console.error("Error al eliminar reserva:", error)
            Alert.alert("Error", "No se pudo eliminar la reserva.")
          }
        },
      },
    ])
  }
  const handleSelectComercio = async (comercio) => {
    setSelectedComercio(comercio)
    setIsLoading(true)
    await loadReservas(comercio.nombre)
    setIsLoading(false)
  }

  const handleReservaAction = async (reserva, aprobar) => {
    try {
      const response = await Apis.actualizarEstadoReserva(reserva, aprobar)

      if (response.status === 204) {
        Alert.alert("Éxito", `Reserva ${aprobar ? "aprobada" : "rechazada"} correctamente.`)
        await loadReservas(selectedComercio.nombre)
      } else {
        throw new Error("Error al actualizar reserva")
      }
    } catch (error) {
      console.error("Error al actualizar reserva:", error)
      Alert.alert("Error", "No se pudo actualizar la reserva.")
    }
  }

const handleDeleteReserva = async (reserva) => {
    console.log(" Opening rejection modal for reserva:", reserva.iD_Reserva)
    setReservaToReject(reserva)
    setRejectionReason("")
    setShowRejectionModal(true)
  }

  const processRejection = async () => {
    console.log(" Processing rejection with reason:", rejectionReason)

    if (!rejectionReason || rejectionReason.trim() === "") {
      Alert.alert("Error", "Debes ingresar un motivo de rechazo.")
      return
    }

    try {
      const response = await Apis.actualizarEstadoReserva(reservaToReject, false, rejectionReason.trim())

      console.log(" Rejection response status:", response.status)

      if (response.status === 204 || response.status === 200) {
        setReservas((prevReservas) => prevReservas.filter((r) => r.iD_Reserva !== reservaToReject.iD_Reserva))
        setShowRejectionModal(false)
        setRejectionReason("")
        setReservaToReject(null)
        Alert.alert("Éxito", "Reserva rechazada correctamente.")
        //await loadReservas(selectedComercio.nombre)
      } else {
        throw new Error("Error al rechazar reserva")
      }
    } catch (error) {
      console.error(" Error al rechazar reserva:", error)
      Alert.alert("Error", "No se pudo rechazar la reserva.")
    }
  }
  const onRefresh = () => {
    setRefreshing(true)
    if (isBarOwner) {
      loadComerciosAndReservas()
    } else {
      loadUserReservas()
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

 const getStatusColor = (estado, motivoRechazo) => {
    if (estado === true) return "#d1fae5"
    if (estado === false && motivoRechazo) return "#fecaca" // Rechazada (rojo suave)
    if (estado === false) return "#ede9fe" // Pendiente
    return "#ede9fe"
  }
   const getStatusText = (estado, motivoRechazo) => {
    if (estado === true) return "Aprobada"
    if (estado === false && motivoRechazo) return "Rechazada"
    if (estado === false) return "Pendiente de aprobación"
    return "Pendiente de aprobación"
  }

  const getStatusTextColor = (estado, motivoRechazo) => {
    if (estado === true) return "#059669"
    if (estado === false && motivoRechazo) return "#dc2626" // Rechazada (rojo)
    if (estado === false) return "#7c3aed" // Pendiente (morado)
    return "#7c3aed"
  }

  const renderUserReservaItem = ({ item }) => (
    <View style={styles.reservaItem}>
      <View style={styles.reservaHeader}>
        <Text style={styles.clientName}>{item.comercio?.nombre || "Comercio"}</Text>
         <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado, item.motivoRechazo) }]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(item.estado, item.motivoRechazo) }]}>
            {getStatusText(item.estado, item.motivoRechazo)}
             </Text>
        </View>
      </View>

      <Text style={styles.reservaDetail}>
        <Text style={styles.label}>Fecha:</Text> {formatDate(item.fechaReserva)}
      </Text>
      <Text style={styles.reservaDetail}>
        <Text style={styles.label}>Comensales:</Text> {item.comenzales}
      </Text>
      {item.comercio?.direccion && (
        <Text style={styles.reservaDetail}>
          <Text style={styles.label}>Dirección:</Text> {item.comercio.direccion}
        </Text>
      )}
      {item.comercio?.telefono && (
        <Text style={styles.reservaDetail}>
          <Text style={styles.label}>Teléfono:</Text> {item.comercio.telefono}
        </Text>
      )}
     
      {item.motivoRechazo && item.motivoRechazo.trim() !== "" && (
        <View style={styles.rejectionReasonContainer}>
          <Text style={styles.rejectionReasonLabel}>Motivo de rechazo:</Text>
          <Text style={styles.rejectionReasonText}>{item.motivoRechazo}</Text>
        </View>
      )}
       <TouchableOpacity style={styles.deleteButton} onPress={() => handleUserDeleteReserva(item.iD_Reserva)}>
        <Text style={styles.deleteButtonIcon}>🗑️</Text>
        <Text style={styles.deleteButtonText}>Eliminar Reserva</Text>
      </TouchableOpacity>
    </View>
  )
    

  const renderReservaItem = ({ item }) => (
    <View style={styles.reservaItem}>
      <View style={styles.reservaHeader}>
        <Text style={styles.clientName}>{item.usuario?.nombreUsuario || "Cliente"}</Text>
       <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado, item.motivoRechazo) }]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(item.estado, item.motivoRechazo) }]}>
            {getStatusText(item.estado, item.motivoRechazo)}
          </Text>
        </View>
      </View>

      <Text style={styles.reservaDetail}>
        <Text style={styles.label}>Fecha:</Text> {formatDate(item.fechaReserva)}
      </Text>
      <Text style={styles.reservaDetail}>
        <Text style={styles.label}>Comensales:</Text> {item.comenzales}
      </Text>
      <Text style={styles.reservaDetail}>
        <Text style={styles.label}>Email:</Text> {item.usuario?.correo || "No especificado"}
      </Text>
      <Text style={styles.reservaDetail}>
        <Text style={styles.label}>Teléfono:</Text> {item.usuario?.telefono || "No especificado"}
      </Text>

       {item.estado === false && !item.motivoRechazo && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleReservaAction(item, true)}
          >
            <Text style={styles.actionButtonText}>Aprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleDeleteReserva(item)}
          >
            <Text style={styles.actionButtonText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  if (!isAuthenticated) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Debe iniciar sesión para acceder a esta sección.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
      </View>
    )
  }

  if (isBarOwner) {
    if (comerciosList.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No tienes comercios aprobados</Text>
          <Text style={styles.errorSubText}>Debes tener al menos un comercio aprobado para ver las reservas.</Text>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Reservas</Text>
          <Text style={styles.subtitle}>Gestiona las reservas de tus comercios</Text>
        </View>

        {comerciosList.length > 1 ? (
           <View style={styles.comerciosSelectorContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.comerciosSelectorContent}
            >
              {comerciosList.map((comercio, index) => (
                <TouchableOpacity
                  key={comercio.iD_Comercio}
                  style={[
                    styles.comercioTab,
                    selectedComercio?.iD_Comercio === comercio.iD_Comercio && styles.comercioTabActive,
                  ]}
                  onPress={() => handleSelectComercio(comercio)}
                >
                  <Text
                    style={[
                      styles.comercioTabText,
                      selectedComercio?.iD_Comercio === comercio.iD_Comercio && styles.comercioTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {comercio.nombre}
                  </Text>
                  {selectedComercio?.iD_Comercio === comercio.iD_Comercio && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.singleComercioHeader}>
            <Text style={styles.singleComercioName}>{selectedComercio?.nombre}</Text>
            <View style={styles.singleComercioUnderline} />
          </View>
        )}

        {reservas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>Sin reservas pendientes</Text>
            <Text style={styles.emptySubtitle}>
              Cuando tus clientes realicen reservas en {selectedComercio?.nombre}, aparecerán aquí para que puedas
              gestionarlas.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reservas}
            renderItem={renderReservaItem}
            keyExtractor={(item) => item.iD_Reserva.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <Modal
          visible={showRejectionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRejectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rechazar Reserva</Text>
              <Text style={styles.modalSubtitle}>Ingresa el motivo del rechazo que verá el cliente:</Text>

              <TextInput
                style={styles.textInput}
                placeholder="Ej: No hay disponibilidad para esa fecha"
                placeholderTextColor="#999"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                maxLength={200}
                autoFocus
              />

              <Text style={styles.characterCount}>{rejectionReason.length}/200 caracteres</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowRejectionModal(false)
                    setRejectionReason("")
                    setReservaToReject(null)
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.confirmRejectButton]} onPress={processRejection}>
                  <Text style={styles.confirmButtonText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reservas</Text>
      </View>

      {reservas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📅</Text>
          <Text style={styles.emptyTitle}>No tienes reservas</Text>
          <Text style={styles.emptySubtitle}>
            Busca un bar o club en el mapa y haz tu primera reserva desde el botón "Hacer Reserva".
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservas}
          renderItem={renderUserReservaItem}
          keyExtractor={(item) => item.iD_Reserva.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    backgroundColor: "rgba(42, 42, 62, 0.8)",
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(216, 56, 245, 0.5)",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e0e0e0",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#b0b0b0",
  },
  comerciosSelectorContainer: {
    backgroundColor: "rgba(26, 26, 46, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216, 56, 245, 0.15)",
    paddingVertical: 4,
  },
  comerciosSelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  comercioTab: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    position: "relative",
  },
  comercioTabActive: {
    backgroundColor: "transparent",
  },
  comercioTabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b6b7b",
    letterSpacing: 0.5,
  },
  comercioTabTextActive: {
    color: "#D838F5",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#D838F5",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  singleComercioHeader: {
    backgroundColor: "rgba(26, 26, 46, 0.6)",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216, 56, 245, 0.15)",
    alignItems: "center",
  },
  singleComercioName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D838F5",
    letterSpacing: 1,
  },
  singleComercioUnderline: {
    marginTop: 8,
    width: 60,
    height: 2,
    backgroundColor: "#D838F5",
    shadowColor: "#D838F5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  listContainer: {
    padding: 15,
  },
  reservaItem: {
    backgroundColor: "rgba(42, 42, 62, 0.5)",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(58, 9, 103, 0.3)",
    shadowColor: "#3a0967",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  reservaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e0e0e0",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reservaDetail: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 5,
  },
  label: {
    fontWeight: "bold",
    color: "#D838F5",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  approveButton: {
    backgroundColor: "rgba(5, 150, 105, 0.8)",
    borderColor: "rgba(5, 150, 105, 0.5)",
  },
  rejectButton: {
    backgroundColor: "rgba(220, 38, 38, 0.8)",
    borderColor: "rgba(220, 38, 38, 0.5)",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    fontSize: 16,
    color: "#D838F5",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e",
  },
  errorText: {
    fontSize: 20,
    color: "#D838F5",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  errorSubText: {
    fontSize: 16,
    color: "#b0b0b0",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    backgroundColor: "rgba(216, 56, 245, 0.1)",
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e0e0e0",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  rejectionReasonContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "rgba(220, 38, 38, 0.15)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: "#fecaca",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#2a2a3e",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 2,
    borderColor: "rgba(216, 56, 245, 0.3)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e0e0e0",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#b0b0b0",
    marginBottom: 20,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: "rgba(42, 42, 62, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(216, 56, 245, 0.5)",
    borderRadius: 12,
    padding: 12,
    color: "#e0e0e0",
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: "rgba(42, 42, 62, 0.8)",
    borderColor: "rgba(216, 56, 245, 0.5)",
  },
  cancelButtonText: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmRejectButton: {
    backgroundColor: "rgba(220, 38, 38, 0.8)",
    borderColor: "rgba(220, 38, 38, 0.5)",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220, 38, 38, 0.8)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.5)",
    gap: 8,
  },
  deleteButtonIcon: {
    fontSize: 18,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
})
