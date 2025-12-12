import React from 'react'
import { TransitionPresets, createStackNavigator } from '@react-navigation/stack'
import Home from '../Screen/Home'
import Reservation from '../../Components/Reservation/Reservation'
import BarManagement from './../Screen/BarManagment'

export default function HomeNavigation() {
    const isAndroid = true;
    const Stack = createStackNavigator();
    
    return (
   <Stack.Navigator screenOptions={{
    gestureEnabled: true,
    headerShown: false,
    ...(isAndroid && TransitionPresets.ModalPresentationIOS)
    }}>
    <Stack.Screen name='home' component={Home}/>
    <Stack.Screen 
          name="Reservation" 
          component={Reservation}
          options={{ headerShown: false }}
        />
    <Stack.Screen 
          name="Comercio" 
          component={BarManagement}
          options={{ headerShown: false }}
        />
       
   </Stack.Navigator>
  )
}