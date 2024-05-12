import { View, Text } from 'react-native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Home from '../Pantallas/Home';
import Fav from '../Pantallas/Fav';
import Search from '../Pantallas/Search';
import Profile from '../Pantallas/Profile';
import { MaterialIcons } from '@expo/vector-icons';



export default function TabNavigation() {
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
                        case 'Profile':
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
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Search" component={Search} />
        <Tab.Screen name="Fav" component={Fav} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
    
  )
}