import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../AuthContext';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '../../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { 
  saveUserData, 
  getUserData, 
  savePendingApproval, 
  updateApprovalStatus,
  checkUserAuthentication,
  setUserLoggedOut,
  setUserLoggedIn
} from './../../Componentes/utils/auth';

export default function Login() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isBarOwner, setIsBarOwner] = useState(false);
  const [barName, setBarName] = useState('');
  const [barType, setBarType] = useState('bar');
  const [barCuit, setBarCuit] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [closingHours, setClosingHours] = useState('');
  const { updateAuth, clearAuth } = useContext(AuthContext);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, []);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = useCallback(async () => {
    try {
      const userData = await getUserData();
      if (userData && userData.isLoggedIn) {
        const isAuthenticated = await checkUserAuthentication();
        if (isAuthenticated) {
          setUser(userData);
          updateAuth(userData);
        } else {
          await handleLogout();
        }
      }
      setInitializing(false);
    } catch (error) {
      console.error('Error al verificar el usuario actual:', error);
      setInitializing(false);
    }
  }, [updateAuth, handleLogout]);

  function onAuthStateChanged(firebaseUser) {
    setInitializing(false);
    if (firebaseUser) {
      console.log('Estado de autenticación cambiado: Usuario autenticado');
      checkUserRegistration(firebaseUser.uid, firebaseUser.email, false, firebaseUser);
    } else {
      setUser(null);
      setIsRegistering(false);
    }
  }

  const handleLogout = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      await setUserLoggedOut();
      clearAuth();
      setUser(null);
      setIsRegistering(false);
      navigation.navigate('Home');
      console.log('Sesión cerrada y estado de usuario actualizado');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, [navigation, clearAuth]);

  async function onGoogleButtonPress(isRegistration = false) {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      console.log('Google Sign-In exitoso', JSON.stringify(userInfo, null, 2));

      if (!userInfo.idToken) {
        throw new Error('No se pudo obtener el idToken de Google Sign-In');
      }

      const googleCredential = auth.GoogleAuthProvider.credential(userInfo.idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      console.log('Usuario autenticado en Firebase:', JSON.stringify(userCredential.user, null, 2));
      
      await checkUserRegistration(userCredential.user.uid, userCredential.user.email, isRegistration, userInfo.user);
    } catch (error) {
      console.error('Error en la autenticación:', error);
      Alert.alert('Error de autenticación', 'No se pudo iniciar sesión. Por favor, intente de nuevo.');
    }
  }

  const checkUserRegistration = useCallback(async (userId, email, isRegistration, googleUser) => {
    try {
      console.log('Verificando registro para el usuario ID:', userId);
      let userData = await getUserData();
      console.log('Datos del usuario desde AsyncStorage:', userData);
  
      if (email === 'cecilia.e.tolentino@gmail.com') {
        const adminData = { 
          email, 
          userType: 'admin', 
          googleId: userId,
          photoURL: googleUser.photo,
          name: googleUser.name,
          approved: true,
          isLoggedIn: true
        };
        await saveUserData(adminData);
        setUser(adminData);
        updateAuth(adminData);
        console.log('Datos del administrador guardados:', adminData);
        return;
      }
  
      if (!userData || userData.googleId !== userId) {
        setIsRegistering(true);
        setUser({ 
          uid: userId, 
          email, 
          photoURL: googleUser.photo, 
          name: googleUser.name,
          givenName: googleUser.givenName,
          familyName: googleUser.familyName,
          googleId: userId,
          isLoggedIn: false
        });
      } else {
        userData.isLoggedIn = true;
        await saveUserData(userData);
        setUser(userData);
        updateAuth(userData);
        setIsRegistering(false);
      }
    } catch (error) {
      console.error('Error en checkUserRegistration:', error);
      Alert.alert('Error', 'Hubo un problema al verificar el registro. Por favor, intente de nuevo.');
      await handleLogout();
    }
  }, [handleLogout, updateAuth]);

  async function handleRegistration() {
    if (!name || !lastName || (isBarOwner && (!barName || !barCuit || !barAddress || !openingHours || !closingHours))) {
      Alert.alert('Error', 'Por favor, complete todos los campos obligatorios.');
      return;
    }

    const userData = {
      googleId: user.uid,
      email: user.email,
      photoURL: user.photoURL,
      name,
      lastName,
      userType: isBarOwner ? 'barOwner' : 'commonUser',
      isBarOwner,
      approved: !isBarOwner,
      isLoggedIn: true,
      ...(isBarOwner && { 
        barName, 
        barType,
        barCuit, 
        barAddress, 
        openingHours,
        closingHours,
      }),
    };

    try {
      await saveUserData(userData);
      if (isBarOwner) {
        await savePendingApproval(userData);
        Alert.alert('Registro pendiente de aprobación', 'Su solicitud ha sido enviada al administrador para su aprobación. Recibirá una notificación cuando sea aprobada.');
        await handleLogout();
      } else {
        Alert.alert('Registro exitoso', 'Sus datos han sido registrados correctamente.');
        setUser(userData);
        updateAuth(userData);
      }
      setIsRegistering(false);
    } catch (error) {
      console.error('Error al guardar los datos del usuario:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos. Por favor, intente de nuevo.');
    }
  }

  if (initializing) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {!user && (
          <Image source={require('../../img/login.png')} style={styles.logo}/>
        )}
        <View style={styles.tarjeta}>
          {!user && !isRegistering ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cajaBoton} onPress={() => onGoogleButtonPress(false)}>
                <Text style={styles.Textoboton}>Iniciar sesión con Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cajaBoton} onPress={() => onGoogleButtonPress(true)}>
                <Text style={styles.Textoboton}>Registrarse con Google</Text>
              </TouchableOpacity>
            </View>
          ) : user && user.userType === 'admin' ? (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Bienvenida, Administradora</Text>
              <TouchableOpacity style={styles.cajaBoton} onPress={handleLogout}>
                <Text style={styles.Textoboton}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          ) : isRegistering ? (
            <View style={styles.registrationForm}>
              <Text style={styles.formTitle}>Complete su registro</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Apellido"
                value={lastName}
                onChangeText={setLastName}
              />
              <View style={styles.switchContainer}>
                <Text>¿Es dueño de un bar/boliche?</Text>
                <Switch
                  value={isBarOwner}
                  onValueChange={setIsBarOwner}
                />
              </View>
              {isBarOwner && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del bar/boliche"
                    value={barName}
                    onChangeText={setBarName}
                  />
                  <Picker
                    selectedValue={barType}
                    style={styles.picker}
                    onValueChange={(itemValue) => setBarType(itemValue)}
                  >
                    <Picker.Item label="Bar" value="bar" />
                    <Picker.Item label="Boliche" value="boliche" />
                  </Picker>
                  <TextInput
                    style={styles.input}
                    placeholder="CUIT del lugar (11 dígitos)"
                    value={barCuit}
                    onChangeText={(text) => setBarCuit(text.replace(/[^0-9]/g, '').slice(0, 11))}
                    keyboardType="numeric"
                    maxLength={11}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Dirección del lugar"
                    value={barAddress}
                    onChangeText={setBarAddress}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Horario de apertura (HH:MM)"
                    value={openingHours}
                    onChangeText={setOpeningHours}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Horario de cierre (HH:MM)"
                    value={closingHours}
                    onChangeText={setClosingHours}
                    keyboardType="numbers-and-punctuation"
                  />
                </>
              )}
              <TouchableOpacity style={styles.cajaBoton} onPress={handleRegistration}>
                <Text style={styles.Textoboton}>Completar registro</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.userInfo}>
              {user.photoURL && (
                <Image source={{ uri: user.photoURL }} style={styles.userPhoto} />
              )}
              <Text style={styles.welcomeText}>Hola, {user.name}!</Text>
              <Text style={styles.userTypeText}>Tipo de usuario: {user.userType}</Text>
              <TouchableOpacity style={styles.cajaBoton} onPress={handleLogout}>
                <Text style={styles.Textoboton}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  tarjeta: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    width: '100%',
  },
  cajaBoton: {
    backgroundColor: '#5c288c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  Textoboton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registrationForm: {
    width: '100%',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 10,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  userPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  userTypeText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});