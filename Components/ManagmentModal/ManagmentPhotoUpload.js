import  { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BarPhotoUpload({ userId }) {
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setImage(result.uri);
      saveImage(result.uri);
    }
  };

  const saveImage = async (uri) => {
    try {
      const userData = await AsyncStorage.getItem(`user_${userId}`);
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        parsedUserData.barPhoto = uri;
        await AsyncStorage.setItem(`user_${userId}`, JSON.stringify(parsedUserData));
        Alert.alert('Éxito', 'La foto se ha guardado correctamente.');
      }
    } catch (error) {
      console.error('Error al guardar la foto:', error);
      Alert.alert('Error', 'No se pudo guardar la foto. Por favor, intente de nuevo.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Seleccionar foto</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image }} style={styles.image} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#5c288c',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
  },
});