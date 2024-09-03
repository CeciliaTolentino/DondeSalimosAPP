
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import Fav from '../Pantallas/Fav';
import Search from '../Pantallas/Search';
import { MaterialIcons } from '@expo/vector-icons';
import HomeNavigation from './HomeNavigation';
import Login from '../Pantallas/Login';
//import useGoogleAuth from '../../Componentes/Login/useGoogleAuth';
import onGoogleButtonPress from '../../Componentes/Login/setUp'
export default function TabNavigation() {
 const { promptAsync } = onGoogleButtonPress(); // Obtén promptAsync desde useGoogleAuth
    const Tab = createBottomTabNavigator();
  return (
   
      <Tab.Navigator screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

           switch (route.name){
            case 'Home':
                iconName = 'home';
                break;
                case 'Search':
                    iconName = 'search';
                    break;
                    case 'Fav':
                        iconName = 'favorite';
                        break;
                        case 'Login':
                            iconName = 'login';
                            break;
                            default:
                                iconName = 'sports martial arts'
                                break;
           }
          

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7f00b2',
        tabBarInactiveTintColor: '#af9eab',
      })}>
        <Tab.Screen name="Home" component={HomeNavigation}  options={{ headerShown: false }}/>
        <Tab.Screen name="Search" component={Search} options={{ headerShown: false }}/>
        <Tab.Screen name="Fav" component={Fav} options={{ headerShown: false }} />
        <Tab.Screen name="Login">
                {() => <Login promptAsync={promptAsync} />} 
            </Tab.Screen>
      </Tab.Navigator>
    
  )
}