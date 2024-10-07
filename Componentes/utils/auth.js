import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    console.log('Datos del usuario guardados:', userData);
  } catch (error) {
    console.error('Error al guardar los datos del usuario:', error);
    throw error;
  }
};


export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error al obtener los datos del usuario:', error);
    return null;
  }
};
export const checkUserAuthentication = async () => {
  try {
    const userData = await getUserData();
    if (userData) {
      return userData.isLoggedIn && (userData.userType === 'commonUser' || 
             userData.userType === 'admin' || 
             (userData.userType === 'barOwner' && userData.approved));
    }
    return false;
  } catch (error) {
    console.error('Error al verificar la autenticación del usuario:', error);
    return false;
  }
};
export const showAuthenticationAlert = (navigation) => {
  Alert.alert(
    "Acceso Restringido",
    "Para acceder a esta funcionalidad, debe estar registrado/a.",
    [
      { 
        text: "Registrarse", 
        onPress: () => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        }
      },
      {
        text: "Cancelar",
        style: "cancel"
      }
    ]
  );
};
export const setUserLoggedOut = async () => {
  try {
    const userData = await getUserData();
    if (userData) {
      userData.isLoggedIn = false;
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    }
    console.log('Estado de sesión actualizado: usuario desconectado');
  } catch (error) {
    console.error('Error al actualizar el estado de sesión:', error);
  }
};

export const setUserLoggedIn = async (userId) => {
  try {
    const userData = await getUserData();
    if (userData && userData.googleId === userId) {
      userData.isLoggedIn = true;
      await saveUserData(userData);
      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error al actualizar el estado de sesión:', error);
    return null;
  }
};
export const savePendingApproval = async (userData) => {
  try {
    const pendingApprovals = await AsyncStorage.getItem('pendingApprovals') || '[]';
    const approvals = JSON.parse(pendingApprovals);
    approvals.push(userData);
    await AsyncStorage.setItem('pendingApprovals', JSON.stringify(approvals));
    console.log('Solicitud de aprobación guardada:', userData);
  } catch (error) {
    console.error('Error al guardar la solicitud de aprobación:', error);
    throw error;
  }
};

export const getPendingApprovals = async () => {
  try {
    const pendingApprovals = await AsyncStorage.getItem('pendingApprovals') || '[]';
    return JSON.parse(pendingApprovals);
  } catch (error) {
    console.error('Error al obtener las solicitudes de aprobación:', error);
    return [];
  }
};

export const updateApprovalStatus = async (userId, isApproved) => {
  try {
    const pendingApprovals = await getPendingApprovals();
    const userIndex = pendingApprovals.findIndex(user => user.googleId === userId);
    
    if (userIndex !== -1) {
      const userData = pendingApprovals[userIndex];
      userData.approved = isApproved;
      await saveUserData(userData);
      
      pendingApprovals.splice(userIndex, 1);
      await AsyncStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
      
      console.log('Estado de aprobación actualizado para el usuario:', userId, 'Aprobado:', isApproved);
    } else {
      console.log('No se encontraron datos de usuario para actualizar:', userId);
    }
  } catch (error) {
    console.error('Error al actualizar el estado de aprobación:', error);
    throw error;
  }
};

