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
} from "react-native"
import { AuthContext } from "../../AuthContext"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

export default function Reserva() {
  const { user, isAuthenticated, isBarOwner } = useContext(AuthContext)
  const [reservas, setReservas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [comercioInfo, setComercioInfo] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user && isBarOwner) {
      loadComercioAndReservas()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, isBarOwner])

  const loadComercioAndReservas = async () => {
    try {
      // Primero obtener información del comercio
      const comerciosResponse = await fetch(`${API_BASE_URL}/api/comercios/listado`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (comerciosResponse.ok) {
        const comercios = await comerciosResponse.json()
        const userComercio = comercios.find((comercio) => comercio.iD_Usuario === user.iD_Usuario)

        if (userComercio && userComercio.estado) {
          setComercioInfo(userComercio)
          await loadReservas(userComercio.nombre)
        } else {
          setComercioInfo(null)
          setReservas([])
        }
      }
    } catch (error) {
      console.error("Error al cargar comercio:", error)
      Alert.alert("Error", "No se pudo cargar la información del comercio.")
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const loadReservas = async (nombreComercio) => {
    try {
      console.log("Cargando reservas para comercio:", nombreComercio)

      const response = await fetch(
        `${API_BASE_URL}/api/reservas/buscarNombreComercio/${encodeURIComponent(nombreComercio)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (response.ok) {
        const reservasData = await response.json()
        console.log("Reservas cargadas:", reservasData)
        setReservas(reservasData)
      } else {
        console.log("No se encontraron reservas o error en la respuesta")
        setReservas([])
      }
    } catch (error) {
      console.error("Error al cargar reservas:", error)
      setReservas([])
    }
  }

  const handleReservaAction = async (reserva, aprobar) => {
    try {
      const updatedReserva = {
        ...reserva,
        estado: aprobar, // true para aprobar, false para rechazar
      }

      console.log("Actualizando reserva:", updatedReserva)

      const response = await fetch(`${API_BASE_URL}/api/reservas/actualizar/${reserva.iD_Reserva}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedReserva),
      })

      if (response.ok) {
        Alert.alert("Éxito", `Reserva ${aprobar ? "aprobada" : "rechazada"} correctamente.`)
        await loadReservas(comercioInfo.nombre) // Recargar reservas
      } else {
        throw new Error("Error al actualizar reserva")
      }
    } catch (error) {
      console.error("Error al actualizar reserva:", error)
      Alert.alert("Error", "No se pudo actualizar la reserva.")
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadComercioAndReservas()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (estado) => {
    if (estado === true) return "#28a745" // Verde para aprobado
    if (estado === false) return "#dc3545" // Rojo para rechazado
    return "#ffc107" // Amarillo para pendiente
  }

  const getStatusText = (estado) => {
    if (estado === true) return "Aprobada"
    if (estado === false) return "Rechazada"
    return "Pendiente"
  }

  const renderReservaItem = ({ item }) => (
    <View style={styles.reservaItem}>
      <View style={styles.reservaHeader}>
        <Text style={styles.clientName}>{item.usuario?.nombreUsuario || "Cliente"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{getStatusText(item.estado)}</Text>
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
      {item.tiempoTolerancia && (
        <Text style={styles.reservaDetail}>
          <Text style={styles.label}>Tolerancia:</Text> {item.tiempoTolerancia}
        </Text>
      )}

      {item.estado === null && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleReservaAction(item, true)}
          >
            <Text style={styles.actionButtonText}>Aprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReservaAction(item, false)}
          >
            <Text style={styles.actionButtonText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  // Verificaciones de acceso
  if (!isAuthenticated) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Debe iniciar sesión para acceder a esta sección.</Text>
      </View>
    )
  }

  if (!isBarOwner || user.iD_RolUsuario !== 3) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No tiene permisos para acceder a esta sección.</Text>
        <Text style={styles.errorSubText}>Solo los dueños de bares pueden ver las reservas.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7f00b2" />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
      </View>
    )
  }

  if (!comercioInfo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Comercio no encontrado o no aprobado</Text>
        <Text style={styles.errorSubText}>Debe tener un comercio aprobado para ver las reservas.</Text>
      </View>
    )
  }

  const pendingReservas = reservas.filter((r) => r.estado === null)
  const approvedReservas = reservas.filter((r) => r.estado === true)
  const rejectedReservas = reservas.filter((r) => r.estado === false)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservas - {comercioInfo.nombre}</Text>
        <Text style={styles.subtitle}>
          Total: {reservas.length} | Pendientes: {pendingReservas.length} | Aprobadas: {approvedReservas.length} |
          Rechazadas: {rejectedReservas.length}
        </Text>
      </View>

      {reservas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📅</Text>
          <Text style={styles.emptyTitle}>No hay reservas</Text>
          <Text style={styles.emptySubtitle}>Las reservas de los clientes aparecerán aquí cuando las realicen.</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7f00b2",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  listContainer: {
    padding: 15,
  },
  reservaItem: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
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
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  reservaDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#28a745",
  },
  rejectButton: {
    backgroundColor: "#dc3545",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
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
    fontSize: 20,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  errorSubText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
})
