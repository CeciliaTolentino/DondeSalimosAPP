import { View, Text, Image, StyleSheet, TextInput, Dimensions } from 'react-native'
import React from 'react'

export default function Headers() {
  return (
    <View style={styles.header}>
      <Image source={require('../../img/logo4color.png')}
      style={styles.logo}/>
      <View>
     
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
    
    logo:{
        width:50,
        height:50
    },
    searchBar:{
        borderWidth:1,
        borderColor:'#7f00b2',
        padding:4,
        borderRadius:50,
        paddingLeft:10,
        width:Dimensions.get('screen').width*0.7
    },
    header:{
        display:'flex',
        flexDirection:'row',
        alignItems:'baseline',
        gap:10,
        marginTop:30
       
    }
})