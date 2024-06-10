import { View } from 'react-native'
import React, { useContext ,useEffect,useState} from 'react'
import GoogleMapViewFull from '../../Componentes/Search/GoogleMapViewFull'
import SearchBar from '../../Componentes/Search/SearchBar'
import { UserLocationContext } from '../Context/UserLocationContext';
import GlobalApi from '../Servicios/GlobalApi';
import BusinessList from '../../Componentes/Search/BusinessList';

export default function Search() {
  const [placeList,setPlaceList]=useState([]);
  //const [location,setLocation] = useContext(UserLocationContext);
 

  useEffect(()=>{
    
      GetNearBySearchPlace('bar');
   
  },[])
  const GetNearBySearchPlace=(value)=>{
    GlobalApi.busquedaPorTxt(value).then(resp=>{
      
      setPlaceList(resp.data.results);
    })
  }

  return (
    <View>
      <View style={{position:'absolute',zIndex:20}}>
      <SearchBar setSearchText={(value)=>GetNearBySearchPlace(value)}/>
      </View>
     
      <GoogleMapViewFull placeList={placeList}/>
      <View style={{position:'absolute',zIndex:20,bottom:10}}>
      <BusinessList placeList={placeList}  />
      </View>
    </View>
  )
}