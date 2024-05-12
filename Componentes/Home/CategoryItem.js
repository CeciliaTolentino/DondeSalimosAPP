import { View, Text,Image,StyleSheet } from 'react-native'
import React from 'react'

export default function CategoryItem({category}) {
  return (
    <View style={styles.container}>
        <View style={styles.iconContainer}>
        <Image  source = {category.icon}
        style={styles.icon}/>
         </View>
         
      <Text style={styles.text}>{category.name}</Text>
   
      </View>
  
  )
}

const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: 50,
      marginVertical: 20,
      borderRadius:20,
      backgroundColor:'#f0ff1'
    },
    iconContainer: {
      marginBottom: 5, // Espacio entre el icono y el texto
    },
    icon: {
      width: 50,
      height: 50,
    },
    text: {
      fontSize: 13,
      fontFamily: 'roboto_regular',
    },
  });