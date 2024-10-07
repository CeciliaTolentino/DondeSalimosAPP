import React from 'react'
import { TransitionPresets, createStackNavigator } from '@react-navigation/stack'
import Home from '../Pantallas/Home'
import Reserva from '../../Componentes/Home/Reserva'
import BarManagement from './../Pantallas/BarManagment'

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
          name="Reserva" 
          component={Reserva}
          options={{ headerShown: false }}
        />
    <Stack.Screen 
          name="BarManagement" 
          component={BarManagement}
          options={{ headerShown: false }}
        />
       
   </Stack.Navigator>
  )
}