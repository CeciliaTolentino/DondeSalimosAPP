import { View, StyleSheet,TextInput, Image,TouchableOpacity,Text } from 'react-native'
import React from 'react';


export default function Login({ promptAsync }) {
  return (
    <View style={styles.padre}>
      
      <View>
<Image source={require('./../../img/login.png')} style={styles.profile}/>
      </View>
      <View style={styles.tarjeta}>
<View style={styles.Padreboton}>
<TouchableOpacity style={styles.cajaBoton} onPress={() => promptAsync()}>
  <Text  style={styles.Textoboton}>Ingresar con google</Text>
  
</TouchableOpacity>
</View>
      </View>
    </View>
  )
}

const styles= StyleSheet.create({
padre:{
  flex:1,
  justifyContent:'center',
  alignItems:'center',
  backgroundColor:'white'
},
  profile:{
    width:100,
    height:100,
    borderRadius:50,
    borderColor:'white'
  },
  tarjeta:{
    margin:20,
    backgroundColor:'white',
    borderRadius:20,
    width:'90%',
    padding:20,
    shadowColor:'purple',
    shadowOffset:{
      width:0,
      height:2
    },
    shadowOpacity:0.25,
    shadowRadius:4,
    elevation:5,

  },
  cajatexto:{
    paddingVertical:20,
    backgroundColor:'#cccccc40',
    borderRadius:30,
    marginVertical:10
  },
  Padreboton:{
    alignItems:'center'
  },
  cajaBoton:{
    backgroundColor:'#525FE1',
    borderRadius:30,
    paddingVertical:20,
    width:150,
    marginTop:20
  },
  Textoboton:{
    textAlign:'center',
    color:'white'
  }
});