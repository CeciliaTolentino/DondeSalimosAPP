import { View, Text, Dimensions } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import MapView, {  Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { UserLocationContext } from '../../App/Context/UserLocationContext';
import PlaceMarker from '../Home/PlaceMarker'


export default function GoogleMapViewFull({placeList }) {
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
    <View >
      
      {mapRegion.latitude && mapRegion.longitude && (
        <MapView
          style={{
            width:Dimensions.get('screen').width,
            height:Dimensions.get('screen').width*2.0, 
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
          {placeList.map((item, index) => (
    <PlaceMarker key={index} item={item} />
)) }
        </MapView>
      )}
    </View>
  )
}