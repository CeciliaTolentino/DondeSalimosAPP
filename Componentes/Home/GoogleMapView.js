import { View, Text, Dimensions } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import MapView, {  Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { UserLocationContext } from '../../App/Context/UserLocationContext';
import PlaceMarker from './PlaceMarker';



export default function GoogleMapView({placeList }) {
    const [mapRegion, setmapRegion] = useState([]);
    
    const {location,setLocation} =useContext(UserLocationContext)
    useEffect(()=> {
      if(location){
        setmapRegion({
          latitude: location.coords.latitude,
            longitude:  location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
      })
      }
    },[location]);
  return (
    <View style={{marginTop:20, borderRadius:20,overflow:'hidden'}}>
      <Text style={{fontSize:20,marginBottom:10,fontWeight:"600",fontFamily:'roboto_regular'}}> Top Near by Places</Text>
      {mapRegion.latitude && mapRegion.longitude && (
        <MapView
          style={{
            width:Dimensions.get('screen').width*0.89,
            height:Dimensions.get('screen').width*0.53, 
          }}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          region={mapRegion}
        >
          <Marker
            coordinate={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            }}
            title={'Estas acá'}
          />
          {placeList.map((item,index)=>index<=5&&(
              <PlaceMarker item={item} />
          ))}
        </MapView>
      )}
    </View>
  )
}