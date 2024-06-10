import { View, Text,Image } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import React from 'react'
const key = process.env.EXPO_PUBLIC_API_KEY;
export default function BussinessItem({place}) {
  return (
    <View style={{
       width:140,
       backgroundColor:'white',
       borderRadius:10,
       padding:10,
       margin:5,
       elevation:0.4

    }}>
       {place?.photos? <Image source={{
        uri:"https://maps.googleapis.com/maps/api/place/photo"+
        "?maxwidth=400"+
        "&photo_reference="+
        place?.photos[0]?.photo_reference +
        `&key=${key}`,
      }} 
      style={{width:100,height:100, borderRadius:15}} 
      />:
      <Image source={require=('./../../../assets/placeholder.jpg')} 
      style={{width:100,height:100, borderRadius:15}} 
      />}
      <View style={{flex:1}}>
        <Text numberOfLines={2} style={{fontSize:18, fontFamily:'roboto_bold', marginBottom:10}}>{place.name} </Text>
        <Text numberOfLines={2} style={{fontSize:18,marginBottom:10 }}>{place.vicinity?place.vicinity:place.formatted_address} </Text>
        <View style ={{display:'flex', flexDirection:'row',alignItems:'center',gap:3}} > 
      <AntDesign name="star" size={20} color="#d89deb" />
      <Text> {place.rating} </Text>
      </View>
      </View>
    </View>
  )
}