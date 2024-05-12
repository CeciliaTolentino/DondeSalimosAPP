import { Text, View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigation from './App/Navigation/TabNavigation';
import { useEffect,useState } from 'react';
import * as Location from 'expo-location';
import { UserLocationContext } from './App/Context/UserLocationContext';
import {useFonts} from 'expo-font';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();

// Pantalla de carga inicial
const SplashScreen = ({ navigation }) => {
  // Navegar a la pantalla principal después de 2 segundos
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('TabNavigation');
    }, 2000); // 2000 milisegundos = 2 segundos

    // Limpiar el temporizador cuando el componente se desmonte
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        style={styles.logo}
        source={require('./img/logo3color.png')} // Ruta de la imagen del logo de la aplicación
        resizeMode="contain"
      />
      <ActivityIndicator // Un indicador de actividad para mostrar que la aplicación está cargando 
        size="large" color="#0000ff"
      />
    </View>
  );
};


export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fontsLoaded]=useFonts({
    'roboto_regular':require('./assets/Fonts/Roboto-Regular.ttf'),
    'roboto_bold':require('./assets/Fonts/Roboto-Bold.ttf')
  })
  useEffect(() => {
    (async () => {
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      console.log(location)

    })();
  }, []);

  
  
  return (
    <UserLocationContext.Provider 
    value={{location,setLocation}}>
    <NavigationContainer>
    <Stack.Navigator>
          {/* Pantalla de carga inicial */}
          <Stack.Screen
            name="SplashScreen"
            component={SplashScreen}
            options={{ headerShown: false }} // Oculta la barra de navegación
          />
          {/* Pantalla principal */}
          <Stack.Screen
            name="TabNavigation"
            component={TabNavigation}
            options={{ headerShown: false }} // Oculta la barra de navegación
          />
        </Stack.Navigator>
    </NavigationContainer>
    </UserLocationContext.Provider>
  );
}
// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Centra verticalmente
    alignItems: 'center', // Centra horizontalmente
  },
  logo: {
    width: 300,
    height: 500,
  },
});