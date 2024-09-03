import { View, Text, Image, StyleSheet, TextInput, Dimensions } from 'react-native'
import React from 'react'

export default function Headers() {
  return (
    <View style={styles.header}>
      <Image source={require('../../img/logo4color.png')}
      style={styles.logo}/>
      
    </View>
  )
}
const styles = StyleSheet.create({
    
    logo:{
        width:50,
        height:50
    },
    
    header:{
        display:'flex',
        flexDirection:'row',
        alignItems:'baseline',
        gap:10,
        marginTop:20
       
    }
})