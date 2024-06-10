import { View, Text, TouchableOpacity, Platform, Linking, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRoute } from '@react-navigation/native'
import PlaceDetailItem from './PlaceDetailItem';
import GoogleMapView from '../Home/GoogleMapView';
export default function PlaceDetail() {
    const param = useRoute().params;
    const [place,setPlace]=useState([]);
useEffect(()=>{
     setPlace(param.place) 

}, [])
const onDirectionClick=()=>{
  const url= Platform.select({
    android:"geo:"+ place.geometry.location.lat +"," + place.geometry.location.lng + "?q=" + place.vicinity,
    ios:"maps:"+ place.geometry.location.lat +"," + place.geometry.location.lng + "?q=" + place.vicinity,
  });
  Linking.openURL(url)
}
  return (
    <ScrollView style={{padding:20,backgroundColor:'white',flex:1}}>
      <PlaceDetailItem place={place}  onDirectionClick={()=>onDirectionClick()}  />
      <GoogleMapView placeList={[place] } />
      <TouchableOpacity style={{backgroundColor:'pink', padding:15,
        alignContent:'center',alignItems:'center',margin:8,borderRadius:50
      }} onPress={()=>onDirectionClick()}>

        <Text style={{fontFamily:'roboto_regular',textAlign:'center',color:'white'}}>
          Ir a la dirección en Google Maps
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}