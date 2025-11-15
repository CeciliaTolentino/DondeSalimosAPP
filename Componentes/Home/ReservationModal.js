import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { AuthContext } from "../../AuthContext"
import Apis from "../../Apis"

const CustomDatePicker = ({ visible, onClose, onSelectDate, minDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const isDateDisabled = (day) => {
    const date = new Date(currentYear, currentMonth, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleDateSelect = (day) => {
    if (!isDateDisabled(day)) {
      const selectedDate = new Date(currentYear, currentMonth, day)
      onSelectDate(selectedDate)
      onClose()
    }
  }

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(day)
      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.dayCell, disabled && styles.dayCellDisabled]}
          onPress={() => handleDateSelect(day)}
          disabled={disabled}
        >
          <Text style={[styles.dayText, disabled && styles.dayTextDisabled]}>{day}</Text>
        </TouchableOpacity>,
      )
    }

    return days
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.datePickerOverlay}>
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerHeader}>
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthButton}>
              <AntDesign name="left" size={20} color="#5c288c" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthButton}>
              <AntDesign name="right" size={20} color="#5c288c" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysContainer}>
            {["D", "L", "M", "M", "J", "V", "S"].map((day, index) => (
              <View key={index} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>{renderCalendar()}</View>

          <TouchableOpacity style={styles.closeDatePickerButton} onPress={onClose}>
            <Text style={styles.closeDatePickerText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const ReservationModal = ({ visible, onClose, comercio }) => {
  const { user, isAuthenticated } = useContext(AuthContext)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [availabilityMap, setAvailabilityMap] = useState({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [comensales, setComensales] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(15 * 60)
  const [timerExpired, setTimerExpired] = useState(false)

  useEffect(() => {
    if (!visible) {
      setTimeRemaining(15 * 60)
      setTimerExpired(false)
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerExpired(true)
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [visible])

  useEffect(() => {
    if (comercio?.horaIngreso && comercio?.horaCierre) {
      const slots = generateTimeSlots(comercio.horaIngreso, comercio.horaCierre)
      setTimeSlots(slots)
    }
  }, [comercio])

  useEffect(() => {
    if (selectedDate && timeSlots.length > 0) {
      fetchAvailability()
    }
  }, [selectedDate, timeSlots])

  if (!comercio) {
    console.error("❌ ReservationModal: No hay datos del comercio")
    return null
  }

  if (!user && isAuthenticated === undefined) {
    console.error("❌ ReservationModal: AuthContext no está disponible")
    return null
  }

  if (!visible) {
    return null
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const generateTimeSlots = (horaIngreso, horaCierre) => {
    const slots = []

    const parseTime = (timeStr) => {
      if (!timeStr) return null
      const parts = timeStr.split(":")
      return {
        hours: Number.parseInt(parts[0]),
        minutes: Number.parseInt(parts[1] || 0),
      }
    }

    const inicio = parseTime(horaIngreso)
    const cierre = parseTime(horaCierre)

    if (!inicio || !cierre) return slots

    let currentHour = inicio.hours
    let currentMinute = inicio.minutes

    const crossesMidnight = cierre.hours < inicio.hours
    const endHour = crossesMidnight ? cierre.hours + 24 : cierre.hours

    while (true) {
      const displayHour = currentHour % 24
      const timeString = `${displayHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`
      const isNextDay = currentHour >= 24

      slots.push({
        time: timeString,
        hours: displayHour,
        minutes: currentMinute,
        isNextDay: isNextDay,
      })

      if (currentHour === endHour && currentMinute === cierre.minutes) {
        break
      }

      currentMinute += 30
      if (currentMinute >= 60) {
        currentMinute = 0
        currentHour += 1
      }

      if (slots.length > 48) break
    }

    return slots
  }

  const fetchAvailability = async () => {
    if (!comercio?.iD_Comercio) return

    setLoadingAvailability(true)
    try {
      const response = await Apis.obtenerReservasListado()
      const allReservations = response.data || []

      const dateStr = selectedDate.toISOString().split("T")[0]

      const relevantReservations = allReservations.filter((reserva) => {
        if (reserva.iD_Comercio !== comercio.iD_Comercio) return false
        // Count both pending (estado: false) and approved (estado: true) reservations
        if (reserva.estado !== false && reserva.estado !== true) return false

        const reservaDate = new Date(reserva.fechaReserva)
        const reservaDateStr = reservaDate.toISOString().split("T")[0]

        return reservaDateStr === dateStr
      })

      console.log("Reservas relevantes para disponibilidad:", relevantReservations.length)

      const availability = {}
      timeSlots.forEach((slot) => {
        const totalComensales = relevantReservations.reduce((sum, reserva) => {
          const reservaDate = new Date(reserva.fechaReserva)
          const reservaHour = reservaDate.getHours()
          const reservaMinute = reservaDate.getMinutes()

          if (reservaHour === slot.hours && reservaMinute === slot.minutes) {
            console.log(`Horario ${slot.time}: +${reserva.comenzales} comensales (estado: ${reserva.estado})`)
            return sum + (reserva.comenzales || 0)
          }
          return sum
        }, 0)

        const available = comercio.capacidad - totalComensales
        availability[slot.time] = {
          available: Math.max(0, available),
          occupied: totalComensales,
          isFull: available <= 0,
        }

        console.log(
          `Disponibilidad ${slot.time}: ${available}/${comercio.capacidad} (ocupados: ${totalComensales})`,
        )
      })

      setAvailabilityMap(availability)
    } catch (error) {
      console.error("Error al obtener disponibilidad:", error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedTimeSlot(null)
  }

  const handleTimeSlotSelect = (slot) => {
    const availability = availabilityMap[slot.time]
    if (availability && !availability.isFull) {
      setSelectedTimeSlot(slot)
    }
  }

  const handleCreateReservation = async () => {
    if (timerExpired) {
      Alert.alert("Tiempo expirado", "El tiempo para realizar la reserva ha caducado. Por favor, intenta nuevamente.")
      onClose()
      return
    }

    if (!isAuthenticated || !user) {
      Alert.alert("Error", "Debes iniciar sesión para hacer una reserva")
      return
    }

    if (!selectedTimeSlot) {
      Alert.alert("Error", "Por favor selecciona un horario")
      return
    }

    if (!comensales || Number.parseInt(comensales) <= 0) {
      Alert.alert("Error", "Por favor ingresa un número válido de comensales")
      return
    }

    const numComensales = Number.parseInt(comensales)

    const availability = availabilityMap[selectedTimeSlot.time]
    if (availability && numComensales > availability.available) {
      Alert.alert("Capacidad insuficiente", `Solo hay ${availability.available} lugares disponibles en este horario`)
      return
    }

    setIsLoading(true)

    try {
      const reservationDate = new Date(selectedDate)
      reservationDate.setHours(selectedTimeSlot.hours, selectedTimeSlot.minutes, 0, 0)

      if (selectedTimeSlot.isNextDay) {
        reservationDate.setDate(reservationDate.getDate() + 1)
      }

      const requestBody = {
        fechaReserva: reservationDate.toISOString(),
        tiempoTolerancia: "00:15:00",
        comenzales: numComensales,
        estado: false,
        fechaCreacion: new Date().toISOString(),
        iD_Usuario: user.iD_Usuario,
        iD_Comercio: comercio.iD_Comercio,
      }

      await Apis.crearReserva(requestBody)

      Alert.alert(
        "Reserva creada",
        "Tu reserva ha sido creada exitosamente y está pendiente de aprobación por el comercio.",
        [
          {
            text: "OK",
            onPress: () => {
              onClose()
              setComensales("")
              setSelectedDate(new Date())
              setSelectedTimeSlot(null)
            },
          },
        ],
      )
    } catch (error) {
      
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data
        
        // Usuario inactivo o desactivado
        if (errorMessage?.includes("inactivo") || errorMessage?.includes("desactivado")) {
          Alert.alert(
            "Cuenta Desactivada",
            "Tu cuenta ha sido desactivada. Por favor, contacta al administrador o solicita la reactivación desde tu perfil para poder realizar reservas.",
            [{ text: "Entendido" }]
          )
        }
        // Comercio inactivo
        else if (errorMessage?.includes("comercio") && errorMessage?.includes("inactivo")) {
          Alert.alert(
            "Comercio No Disponible",
            "Este comercio no está disponible para reservas en este momento.",
            [{ text: "Entendido" }]
          )
        }
        // Reserva duplicada
        else if (errorMessage?.includes("duplicada") || errorMessage?.includes("ya existe una reserva")) {
          Alert.alert(
            "Reserva Duplicada",
            "Ya tienes una reserva para este comercio con la misma fecha, hora y cantidad de comensales. Por favor, verifica tus reservas existentes.",
            [{ text: "Entendido" }]
          )
        }
        // Error genérico de validación
        else {
          Alert.alert(
            "Error de Validación",
            errorMessage || "No se pudo crear la reserva. Verifica los datos ingresados.",
            [{ text: "Entendido" }]
          )
        }
      } else if (error.response?.status === 404) {
        Alert.alert(
          "Error",
          "No se encontró el usuario o el comercio. Por favor, intenta nuevamente.",
          [{ text: "Entendido" }]
        )
      } else {
        Alert.alert(
          "Error",
          "No se pudo crear la reserva. Intenta nuevamente más tarde.",
          [{ text: "Entendido" }]
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const getFilteredTimeSlots = () => {
    const today = new Date()
    const isToday =
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()

    if (!isToday) {
      return timeSlots
    }

    // Si es hoy, filtrar solo horarios futuros
    const currentHour = today.getHours()
    const currentMinute = today.getMinutes()

    return timeSlots.filter((slot) => {
      if (slot.hours > currentHour) return true
      if (slot.hours === currentHour && slot.minutes > currentMinute) return true
      return false
    })
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <AntDesign name="close" size={24} color="black" />
          </TouchableOpacity>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Hacer Reserva</Text>
            <Text style={styles.subtitle}>{comercio?.nombre}</Text>

            <View style={[styles.timerBanner, timeRemaining < 300 && styles.timerBannerWarning]}>
              <Text style={styles.timerText}>⏱️ Tiempo restante: {formatTime(timeRemaining)}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Fecha de reserva:</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>📅 {formatDateDDMMYYYY(selectedDate)}</Text>
              </TouchableOpacity>
            </View>

            <CustomDatePicker
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              onSelectDate={handleDateSelect}
              minDate={new Date()}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Número de comensales:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 4"
                keyboardType="numeric"
                value={comensales}
                onChangeText={setComensales}
                maxLength={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Horario:</Text>
              {loadingAvailability ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#5c288c" />
                  <Text style={styles.loadingText}>Consultando disponibilidad...</Text>
                </View>
              ) : (
                <>
                  {getFilteredTimeSlots().length === 0 ? (
                    <View style={styles.noSlotsContainer}>
                      <Text style={styles.noSlotsText}>⏰ No hay horarios disponibles para hoy.</Text>
                      <Text style={styles.noSlotsSubtext}>Por favor selecciona otra fecha.</Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.timeSlotsContainer}
                      contentContainerStyle={styles.timeSlotsContentContainer}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                        <View style={styles.timeSlotsGrid}>
                          {getFilteredTimeSlots().map((slot, index) => {
                            const availability = availabilityMap[slot.time] || { available: 0, isFull: true }
                            const isSelected = selectedTimeSlot?.time === slot.time
                            const isFull = availability.isFull

                            return (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.timeSlotButton,
                                  isSelected && styles.timeSlotSelected,
                                  isFull && styles.timeSlotFull,
                                ]}
                                onPress={() => handleTimeSlotSelect(slot)}
                                disabled={isFull}
                              >
                                <Text
                                  style={[
                                    styles.timeSlotText,
                                    isSelected && styles.timeSlotTextSelected,
                                    isFull && styles.timeSlotTextFull,
                                  ]}
                                >
                                  {slot.time}
                                </Text>
                                <Text style={[styles.availabilityText, isFull && styles.availabilityTextFull]}>
                                  {isFull ? "Completo" : "Disponible"}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                      </ScrollView>
                    
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
              onPress={handleCreateReservation}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar Reserva</Text>
              )}
            </TouchableOpacity>

            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>ℹ️ Tu reserva quedará pendiente hasta que el comercio la apruebe</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "93%",
    maxWidth: 500, // Agregando maxWidth para pantallas grandes
    maxHeight: "90%", // Aumentando a 90% para más espacio
  },
  modalScrollView: {
    width: "100%",
  },
  modalScrollContent: {
    alignItems: "center",
    paddingBottom: 10,
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 1000,
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
    color: "#5c288c",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  contentScrollView: {
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 10,
  },
  infoContainer: {
    backgroundColor: "#e7f3ff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    width: "100%",
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 3,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  dateButton: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  confirmButtonDisabled: {
    backgroundColor: "#6c757d",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  retryButton: {
    backgroundColor: "#5c288c",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  retryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  noteText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthButton: {
    padding: 10,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5c288c",
  },
  weekDaysContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    color: "#333",
  },
  dayTextDisabled: {
    color: "#999",
  },
  closeDatePickerButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeDatePickerText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  timeSlotsWrapper: {
    width: "100%",
  },
  timeSlotsContainer: {
     maxHeight: 280,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 10,
  },
  timeSlotsGrid: {

     flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  timeSlotButton: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
      width: "30%",
    alignItems: "center",
  },
  timeSlotSelected: {
    backgroundColor: "#5c288c",
    borderColor: "#5c288c",
  },
  timeSlotFull: {
    backgroundColor: "#f0f0f0",
    borderColor: "#ccc",
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  timeSlotTextSelected: {
    color: "white",
  },
  timeSlotTextFull: {
    color: "#999",
  },
  availabilityText: {
    fontSize: 11,
    color: "#28a745",
    marginTop: 4,
  },
  availabilityTextFull: {
    color: "#dc3545",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: "#666",
  },
  timerBanner: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  timerBannerWarning: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
  },
  noteContainer: {
    backgroundColor: "#ede9fe",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },
  noteText: {
    fontSize: 13,
    color: "#5b21b6",
    textAlign: "center",
    fontWeight: "500",
  },
  noSlotsContainer: {
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#856404",
    textAlign: "center",
    marginBottom: 5,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: "#856404",
    textAlign: "center",
  },
})

export default ReservationModal