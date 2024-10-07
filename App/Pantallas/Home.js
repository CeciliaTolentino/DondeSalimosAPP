import React, { useContext, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import GoogleMapViewFull from './../../Componentes/Home/GoogleMapViewFull'
import GlobalApi from '../Servicios/GlobalApi'
import { UserLocationContext } from '../Context/UserLocationContext'

export default function Home() {
  const [placeList, setPlaceList] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const { location } = useContext(UserLocationContext)

  const handleSearch = (type, keyword, filters) => {
    GetNearBySearchPlace(type, keyword, filters)
  }

  const GetNearBySearchPlace = (type = '', keyword = '', filters = '') => {
    GlobalApi.nearByPlace(
      location.coords.latitude,
      location.coords.longitude,
      type,
      keyword,
      filters
    ).then(resp => {
      const results = resp.data.results || []
      setPlaceList(results)
    }).catch(error => {
      console.error("Error fetching nearby places:", error)
      setPlaceList([])
    })
  }

  const handlePlaceSelect = (place) => {
    setSelectedPlace(place)
  }

  return (
    <View style={styles.container}>
      <GoogleMapViewFull 
        placeList={placeList} 
        onSearch={handleSearch}
        selectedPlace={selectedPlace}
        onPlaceSelect={handlePlaceSelect}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})