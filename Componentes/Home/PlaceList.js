import { View, Text, FlatList } from 'react-native'
import React from 'react'
import PlaceItem from './PlaceItem'

export default function PlaceList({placeList}) {
  return (
    <View>
      <Text
      style={{fontSize:20,fontFamily:'roboto_regular',marginTop:10}}
      >Se encontró {placeList.length} Lugares</Text>
      
      <FlatList
      data={placeList}
      renderItem={({item})=>(
        <PlaceItem place={item}  />
      )}
      
      
      />
    </View>
  )
}