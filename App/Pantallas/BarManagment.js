import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import auth from '@react-native-firebase/auth';

export default function BarManagement() {
  const [barInfo, setBarInfo] = useState(null);
  const [openingHours, setOpeningHours] = useState('');
  const [closingHours, setClosingHours] = useState('');
  const [businessImage, setBusinessImage] = useState(null);
  const [advertisingImage, setAdvertisingImage] = useState(null);
  const [advertisingVideo, setAdvertisingVideo] = useState(null);

  useEffect(() => {
    loadBarInfo();
    const timer = setTimeout(() => {
      if (!barInfo) {
        Alert.alert('Error', 'No se pudo cargar la información del bar. Por favor, intente de nuevo más tarde.');
      }
    }, 5000); // 5 segundos de timeout
  
    return () => clearTimeout(timer);
  }, []);
  const loadBarInfo = async () => {
    const user = auth().currentUser;
    if (user) {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          if (parsedUserData.userType === 'barOwner' && parsedUserData.approved) {
            setBarInfo(parsedUserData);
            setOpeningHours(parsedUserData.openingHours || '');
            setClosingHours(parsedUserData.closingHours || '');
            setBusinessImage(parsedUserData.businessImage);
            setAdvertisingImage(parsedUserData.advertisingImage);
            setAdvertisingVideo(parsedUserData.advertisingVideo);
          } else if (parsedUserData.userType === 'barOwner' && !parsedUserData.approved) {
            Alert.alert('Registro pendiente', 'Su registro aún no ha sido aprobado por el administrador.');
          } else {
            Alert.alert('Error', 'No tiene permisos para acceder a esta sección.');
          }
        } else {
          Alert.alert('Error', 'No se encontró información del usuario.');
        }
      } catch (error) {
        console.error('Error al cargar la información del bar:', error);
        Alert.alert('Error', 'No se pudo cargar la información del bar.');
      }
    } else {
      Alert.alert('Error', 'No se ha iniciado sesión.');
    }
  };

  const handleImagePicker = async (setImageFunction, imageType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.cancelled) {
        setImageFunction(result.uri);
        await saveImage(result.uri, imageType);
      }
    } catch (error) {
      console.error('Error al seleccionar la imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Por favor, intente de nuevo.');
    }
  };

  const handleVideoPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.cancelled) {
        if (result.duration > 60000) {
          Alert.alert('Error', 'El video no debe durar más de 1 minuto.');
          return;
        }
        if (result.fileSize > 540 * 1024 * 1024) {
          Alert.alert('Error', 'El archivo no debe pesar más de 540 MB.');
          return;
        }
        setAdvertisingVideo(result.uri);
        await saveImage(result.uri, 'advertisingVideo');
      }
    } catch (error) {
      console.error('Error al seleccionar el video:', error);
      Alert.alert('Error', 'No se pudo seleccionar el video. Por favor, intente de nuevo.');
    }
  };

  const saveImage = async (uri, imageType) => {
    const user = auth().currentUser;
    if (user && barInfo) {
      try {
        const updatedBarInfo = {
          ...barInfo,
          [imageType]: uri,
        };
        await AsyncStorage.setItem(`user_${user.uid}`, JSON.stringify(updatedBarInfo));
        setBarInfo(updatedBarInfo);
        Alert.alert('Éxito', `La ${imageType === 'businessImage' ? 'imagen del negocio' : 'publicidad'} se ha guardado correctamente.`);
      } catch (error) {
        console.error('Error al guardar la imagen:', error);
        Alert.alert('Error', 'No se pudo guardar la imagen. Por favor, intente de nuevo.');
      }
    }
  };

  const handleSave = async () => {
    const user = auth().currentUser;
    if (user && barInfo) {
      try {
        const updatedBarInfo = {
          ...barInfo,
          openingHours,
          closingHours,
          businessImage,
          advertisingImage,
          advertisingVideo,
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedBarInfo));
        setBarInfo(updatedBarInfo);
        Alert.alert('Éxito', 'La información del bar ha sido actualizada.');
  
        if (advertisingImage || advertisingVideo) {
          Alert.alert(
            'Pago de Publicidad',
            'Su evento aparecerá en las historias por diez días al precio de $1000 pesos. Será redirigido a MercadoPago para realizar el pago.',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  // Aquí iría la lógica para redirigir a MercadoPago
                  console.log('Redirigiendo a MercadoPago...');
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error al guardar la información del bar:', error);
        Alert.alert('Error', 'No se pudo guardar la información. Por favor, intente de nuevo.');
      }
    }
  };

  if (!barInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando información del bar...</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Gestión de {barInfo.barName}</Text>
      <TextInput
        style={styles.input}
        placeholder="Horario de apertura"
        value={openingHours}
        onChangeText={setOpeningHours}
      />
      <TextInput
        style={styles.input}
        placeholder="Horario de cierre"
        value={closingHours}
        onChangeText={setClosingHours}
      />
      <TouchableOpacity style={styles.imageButton} onPress={() => handleImagePicker(setBusinessImage, 'businessImage')}>
        <Text>Seleccionar imagen del negocio</Text>
      </TouchableOpacity>
      {businessImage && <Image source={{ uri: businessImage }} style={styles.previewImage} />}
      <TouchableOpacity style={styles.imageButton} onPress={() => handleImagePicker(setAdvertisingImage, 'advertisingImage')}>
        <Text>Seleccionar imagen de publicidad (opcional)</Text>
      </TouchableOpacity>
      {advertisingImage && <Image source={{ uri: advertisingImage }} style={styles.previewImage} />}
      <TouchableOpacity style={styles.imageButton} onPress={handleVideoPicker}>
        <Text>Seleccionar video de publicidad (opcional)</Text>
      </TouchableOpacity>
      {advertisingVideo && <Text>Video seleccionado</Text>}
      {(advertisingImage || advertisingVideo) && (
        <Text style={styles.advertisingInfo}>
          Su evento aparecerá en las historias por diez días al precio de $1000 pesos
        </Text>
      )}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Guardar cambios</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#7f00b2',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  imageButton: {
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 10,
    borderRadius: 5,
  },
  advertisingInfo: {
    marginTop: 10,
    marginBottom: 10,
    fontStyle: 'italic',
    color: '#7f00b2',
  },
  saveButton: {
    backgroundColor: '#7f00b2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#7f00b2',
  },
});