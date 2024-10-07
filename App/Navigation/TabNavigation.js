import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import HomeNavigation from './HomeNavigation';
import Login from '../Pantallas/Login';
import Fav from '../Pantallas/Fav';
import BarManagement from '../Pantallas/BarManagment';
import AdminPanel from '../Pantallas/AdminPanel';
import { AuthContext } from '../../AuthContext';
import RestrictedAccess from '../Pantallas/RestrictedAccess';

const Tab = createBottomTabNavigator();

export default function TabNavigation() {
  const { user } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Fav') {
            iconName = 'favorite';
          } else if (route.name === 'AdminPanel') {
            iconName = 'admin-panel-settings';
          } else if (route.name === 'BarManagement') {
            iconName = 'business';
          } else if (route.name ===   'Login') {
            iconName = user && user.isRegistered ? 'person' : 'login';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigation} options={{ headerShown: false }} />
      
      {(!user || (user.isRegistered && user.userType === 'commonUser')) && (
        <Tab.Screen 
          name="Fav" 
          component={user && user.isRegistered ? Fav : RestrictedAccess} 
          options={{ headerShown: false }} 
        />
      )}
      
      {user && user.userType === 'admin' && (
        <Tab.Screen name="AdminPanel" component={AdminPanel} options={{ headerShown: false }} />
      )}
      
      {user && user.userType === 'barOwner' && user.approved && (
        <Tab.Screen name="BarManagement" component={BarManagement} options={{ headerShown: false }} />
      )}
      
      <Tab.Screen 
        name="Login" 
        component={Login} 
        options={{ 
          headerShown: false,
          tabBarLabel: user && user.isRegistered ? 'Perfil' : 'Login'
        }} 
      />
    </Tab.Navigator>
  );
}