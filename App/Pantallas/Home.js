import { View, Text, ScrollView } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import Headers from '../../Componentes/Home/Headers'
import GoogleMapView from '../../Componentes/Home/GoogleMapView'
import CategoryList from '../../Componentes/Home/CategoryList'
import GlobalApi from '../Servicios/GlobalApi'
import PlaceList from '../../Componentes/Home/PlaceList'
import { UserLocationContext } from '../Context/UserLocationContext'
export default function Home() {
 const [placeList, setPlaceList]= useState([]);
 const {location,setLocation} = useContext(UserLocationContext)
 useEffect(()=>{
  if(location) {
      GetNearBySearchPlace('bar','drink');
  }
},[location]);
const GetNearBySearchPlace=(value,keyword)=>{
  try {
      GlobalApi.nearByPlace(location.coords.latitude,
        location.coords.longitude, value,keyword).then(resp=>{
        
        setPlaceList(resp.data.results)
      });
  } catch (error) {
      console.error("Error fetching nearby places:", error);
  }
}
  return (
    <ScrollView style={{
      padding:20
    }}>
      <Headers/>
      <GoogleMapView placeList={placeList} />
      <CategoryList setSelectedCategory={(value,keyword) => GetNearBySearchPlace(value,keyword)}/>
      {placeList ? <PlaceList placeList ={placeList} /> : null }
    </ScrollView>
  )
}