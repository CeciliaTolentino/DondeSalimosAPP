import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { checkUserAuthentication, showAuthenticationAlert } from './../utils/auth';
const { width, height } = Dimensions.get('window');

const Reserva = ({ route }) => {
  const { place, userId } = route.params;
  const [guests, setGuests] = useState('1');
  const [selectedDate, setSelectedDate] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await checkUserAuthentication();
      if (!isAuthenticated) {
        showAuthenticationAlert(navigation);
        navigation.goBack();
      }
    };
    checkAuth();
  }, [navigation]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          Alert.alert("Tiempo agotado", "El tiempo para hacer la reserva ha expirado.");
          navigation.goBack();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  const formatTime = useCallback((time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleConfirmReservation = async () => {
    const isAuthenticated = await checkUserAuthentication();
    if (!isAuthenticated) {
      showAuthenticationAlert(navigation);
      return;
    }

    if (!selectedDate) {
      Alert.alert('Error', 'Por favor, selecciona una fecha para la reserva.');
      return;
    }

    setIsLoading(true);

    try {
      // Simular una demora en la red
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Fecha:', selectedDate);
      console.log('Cantidad de personas:', guests);
      console.log('ID del bar:', place.id);
      console.log('ID del cliente:', userId);

      Alert.alert(
        'Reserva Enviada',
        `La confirmación está pendiente por parte de ${place.name}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error al procesar la reserva:', error);
      Alert.alert('Error', 'Hubo un problema al procesar tu reserva. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = useCallback((day) => {
    const selectedDate = day.dateString;
    const currentDate = new Date().toISOString().split('T')[0];
    if (selectedDate < currentDate) {
      Alert.alert('Fecha no válida', 'No se puede seleccionar una fecha anterior a la actual.');
    } else {
      console.log('Fecha seleccionada:', selectedDate);
      setSelectedDate(selectedDate);
    }
  }, []);

  const handleGuestsChange = useCallback((text) => {
    setGuests(text.replace(/[^0-9]/g, ''));
  }, []);

  const currentDate = new Date();
  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: '#5c288c' }
  };

  // Deshabilitar fechas pasadas
  for (let i = 1; i < currentDate.getDate(); i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dateString = date.toISOString().split('T')[0];
    markedDates[dateString] = { disabled: true, disableTouchEvent: true };
  }

  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <AntDesign name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.title}>Reserva</Text>
            <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
          </View>
          
          <Text style={styles.placeName}>{place?.name}</Text>
          <Text style={styles.placeAddress}>{place?.address}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Número de personas:</Text>
            <TextInput
              style={styles.input}
              value={guests}
              onChangeText={handleGuestsChange}
              keyboardType="number-pad"
              placeholder="Ingrese el número de personas"
              returnKeyType="done"
            />
          </View>
          
          <Text style={styles.label}>Selecciona la fecha:</Text>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            minDate={currentDate.toISOString().split('T')[0]}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#5c288c',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#5c288c',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#5c288c',
              selectedDotColor: '#ffffff',
              arrowColor: '#5c288c',
              monthTextColor: '#5c288c',
              indicatorColor: '#5c288c',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 16
            }}
          />
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={handleConfirmReservation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirmar Reserva</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: width * 0.95,
    maxHeight: height * 0.9,
  },
  scrollViewContent: {
    flexGrow: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  closeButton: {
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5c288c',
  },
  placeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    width: '100%',
  },
  confirmButton: {
    backgroundColor: '#5c288c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Reserva;