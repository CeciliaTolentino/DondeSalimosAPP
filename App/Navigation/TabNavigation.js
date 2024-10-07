import React, { useContext, useEffect, useRef } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons } from '@expo/vector-icons';
import HomeNavigation from './HomeNavigation';
import Login from './../Pantallas/Login';
import Fav from './../Pantallas/Fav';
import BarManagement from './../Pantallas/BarManagment';
import AdminPanel from './../Pantallas/AdminPanel';
import { AuthContext } from './../../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();

export default function TabNavigation() {
  const { user, isAdmin, isBarOwner, isApproved, updateAuth } = useContext(AuthContext);
  const prevUserRef = useRef();

  useEffect(() => {
    if (JSON.stringify(prevUserRef.current) !== JSON.stringify({ user, isAdmin, isBarOwner, isApproved })) {
      console.log('Estado actual en TabNavigation:', { user, isAdmin, isBarOwner, isApproved });
      prevUserRef.current = { user, isAdmin, isBarOwner, isApproved };
    }
  }, [user, isAdmin, isBarOwner, isApproved]);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          if (parsedUserData.isLoggedIn) {
            updateAuth(parsedUserData);
          } else {
            updateAuth(null);
          }
        } else {
          updateAuth(null);
        }
      } catch (error) {
        console.error('Error al verificar el estado del usuario:', error);
        updateAuth(null);
      }
    };
  
    checkUserStatus();
  }, [updateAuth]);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Fav':
              iconName = 'favorite';
              break;
            case 'AdminPanel':
              iconName = 'admin-panel-settings';
              break;
            case 'BarManagement':
              iconName = 'business';
              break;
            case 'Profile':
              iconName = user ? 'person' : 'login';
              break;
            default:
              iconName = 'error';
              break;
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#5c288c',
        tabBarInactiveTintColor: '#af9eab',
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigation} options={{ headerShown: false }} />
      
      {isAdmin ? (
        <Tab.Screen 
          name="AdminPanel" 
          component={AdminPanel} 
          options={{ 
            headerShown: false,
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="admin-panel-settings" size={size} color={color} />
            ),
          }} 
        />
      ) : isBarOwner && isApproved ? (
        <Tab.Screen 
          name="BarManagement" 
          component={BarManagement} 
          options={{ 
            headerShown: false,
            tabBarLabel: 'Mi Comercio',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="business" size={size} color={color} />
            ),
          }} 
        />
      ) : (
        <Tab.Screen 
          name="Fav" 
          component={Fav} 
          options={{ 
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="favorite" size={size} color={color} />
            ),
          }} 
        />
      )}
      
      <Tab.Screen 
        name="Profile" 
        component={Login} 
        options={{ 
          headerShown: false,
          tabBarLabel: user ? 'Perfil' : 'Login',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name={user ? "person" : "login"} size={size} color={color} />
          ),
        }} 
      />
    </Tab.Navigator>
  );
}