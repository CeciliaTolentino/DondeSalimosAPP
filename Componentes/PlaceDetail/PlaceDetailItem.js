import { View, Text,Image, TouchableOpacity} from 'react-native'
import React from 'react';
import { AntDesign } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import GoogleMapView from '../Home/GoogleMapView';
import Share from './../../App/Servicios/Share'
const key = process.env.EXPO_PUBLIC_API_KEY;
export default function PlaceDetailItem({place,onDirectionClick}) {
  return (
    <View>
      <Text style={{fontSize:26,fontFamily:'roboto_bold'}}>{place.name}</Text>
    <View style={{
        display:'flex',
        flexDirection:'row',
        alignItems:'center',
        gap:5,
        marginTop:5
    }}>
        
      
      <AntDesign name="star" size={20} color="#d89deb" />
      <Text> {place.rating} </Text>
    </View>
    {place?.photos? (<Image source={{
        uri:"https://maps.googleapis.com/maps/api/place/photo"+
        "?maxwidth=400"+
        "&photo_reference="+
        place?.photos[0]?.photo_reference +
        "&key="+key,
      }} 
      style={{width:350,height:200, borderRadius:15, marginTop:10}}  />)
      :null  }
      <Text numberOfLines={2} style={{fontSize:18,marginBottom:10 }}>{place.vicinity?place.vicinity:place.formatted_address} 
      </Text>
    
      {place?.opening_hours? (
        <Text style={{fontFamily:"roboto_regular"}}>
           {place?.opening_hours?.open_now==true?"(Abierto)": "(Cerrado)"}
        </Text>
      ):null }
      <View style={{marginTop:10,flexDirection:'row',display:'flex',gap:10}}>
        <TouchableOpacity style={{
          direction:"flex",
          flexDirection:"row",
          alignItems:"center",
          gap:5,
          backgroundColor:'gray',
          width:110,
          padding:3,
          borderRadius:40,
          justifyContent:'center'

        }} onPress={()=>onDirectionClick()}>
          <MaterialCommunityIcons name="directions" size={24} color="black" />
          <Text style={{fontFamily:"roboto_regular", fontSize:16}}> Dirección</Text>

        </TouchableOpacity>
        <TouchableOpacity style={{
          direction:"flex",
          flexDirection:"row",
          alignItems:"center",
          gap:5,
          backgroundColor:'gray',
          width:110,
          padding:3,
          borderRadius:40,
          justifyContent:'center'

        }} onPress={()=>Share.SharePlace(place)}>
          
        <Feather name="share" size={24} color="black" />
        <Text>Compartir</Text>
        </TouchableOpacity>
         </View>
         
    </View>
  )
}