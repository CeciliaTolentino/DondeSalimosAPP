import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

let userDataCache = null;
let isCheckingUser = false;
let lastCheckTime = 0;
const CHECK_INTERVAL = 5000; // 5 segundos

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



export const clearUserData = async () => {
  try {
    await AsyncStorage.removeItem('userData');
    userDataCache = null;
    console.log('Datos del usuario eliminados');
  } catch (error) {
    console.error('Error al eliminar los datos del usuario:', error);
  }
};



export const saveUserData = async (userData) => {
  try {
    const existingData = await getUserData();
    const updatedData = { ...existingData, ...userData };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
    console.log('Datos del usuario guardados:', updatedData);
  } catch (error) {
    console.error('Error al guardar los datos del usuario:', error);
  }
};

export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    return null;
  }
};

export const setUserLoggedIn = async () => {
  try {
    const userData = await getUserData();
    if (userData) {
      userData.isLoggedIn = true;
      await saveUserData(userData);
    }
  } catch (error) {
    console.error('Error al establecer usuario como conectado:', error);
  }
};

export const setUserLoggedOut = async () => {
  try {
    const userData = await getUserData();
    if (userData) {
      userData.isLoggedIn = false;
      await saveUserData(userData);
    }
  } catch (error) {
    console.error('Error al establecer usuario como desconectado:', error);
  }
};

export const savePendingApproval = async (userData) => {
  try {
    let pendingApprovals = await AsyncStorage.getItem('pendingApprovals');
    pendingApprovals = pendingApprovals ? JSON.parse(pendingApprovals) : [];
    pendingApprovals.push(userData);
    await AsyncStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
  } catch (error) {
    console.error('Error al guardar solicitud pendiente:', error);
  }
};

export const getPendingApprovals = async () => {
  try {
    const pendingApprovals = await AsyncStorage.getItem('pendingApprovals');
    return pendingApprovals ? JSON.parse(pendingApprovals) : [];
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    return [];
  }
};

export const updateApprovalStatus = async (googleId, isApproved) => {
  try {
    const userData = await getUserData();
    if (userData && userData.googleId === googleId) {
      userData.approved = isApproved;
      await saveUserData(userData);
    }

    let pendingApprovals = await getPendingApprovals();
    pendingApprovals = pendingApprovals.filter(bar => bar.googleId !== googleId);
    await AsyncStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
  } catch (error) {
    console.error('Error al actualizar el estado de aprobación:', error);
    throw error;
  }
};