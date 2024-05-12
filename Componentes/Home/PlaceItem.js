import { View, Text,Image } from 'react-native'
import React from 'react'
import { AntDesign } from '@expo/vector-icons';
export default function PlaceItem({place}) {
  return (
    <View style={{
        display:'flex',
        flexDirection:'row',
        flex: 1,
        width:'100%',
        alignItems:'center',
        gap:15,
        marginTop:20
    }}> 
    
    {place?.photos? <Image source={{
        uri:"https://maps.googleapis.com/maps/api/place/photo"+
        "?maxwidth=400"+
        "&photo_reference="+
        place?.photos[0]?.photo_reference +
        "&key=AIzaSyAL4LmZzNhV_UNJSLI_Z7xjcN6wau7sNy8",
      }} 
      style={{width:100,height:100, borderRadius:15}} 
      />:
      <Image source={require=('./../../../assets/placeholder.jpg')} 
      style={{width:100,height:100, borderRadius:15}} 
      />}
      <View style={{flex:1}}>
        <Text numberOfLines={2} style={{fontSize:18, fontFamily:'roboto_bold', marginBottom:10}}>{place.name} </Text>
        <Text numberOfLines={2} style={{fontSize:18,marginBottom:10 }}>{place.vicinity} </Text>
        <View style ={{display:'flex', flexDirection:'row',alignItems:'center',gap:3}} > 
      <AntDesign name="star" size={20} color="#d89deb" />
      <Text> {place.rating} </Text>
      </View>
      </View>
     
    </View>
    
  )
}