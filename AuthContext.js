// AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    isAdmin: false,
    isBarOwner: false,
    isApproved: false,
  });

  useEffect(() => {
    // Cargar datos de usuario al iniciar la aplicación
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        updateAuth(parsedUserData);
      }
    } catch (error) {
      console.error('Error al cargar datos de usuario:', error);
    }
  };

  const updateAuth = (userData) => {
    setAuthState({
      user: userData,
      isAdmin: userData?.userType === 'admin',
      isBarOwner: userData?.userType === 'barOwner',
      isApproved: userData?.approved,
    });
  };

  const clearAuth = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        parsedUserData.isLoggedIn = false;
        await AsyncStorage.setItem('userData', JSON.stringify(parsedUserData));
      }
      setAuthState({
        user: null,
        isAdmin: false,
        isBarOwner: false,
        isApproved: false,
      });
    } catch (error) {
      console.error('Error al limpiar datos de autenticación:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, updateAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};