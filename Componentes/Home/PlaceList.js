import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import React from 'react'
import PlaceItem from './PlaceItem'
import { useNavigation } from '@react-navigation/native'

export default function PlaceList({placeList}) {
  const navigator = useNavigation();
  const onPlaceClick=(item)=>{
   navigator.navigate('place-detail',{place:item});
  }
  return (
    <View>
      <Text
      style={{fontSize:20,fontFamily:'roboto_regular',marginTop:10}}
      >Se encontró {placeList.length} Lugares</Text>
      
      <FlatList
      data={placeList}
      renderItem={({item})=>(
         <TouchableOpacity onPress ={()=>onPlaceClick(item)}>
        {<PlaceItem place={item}  />  }
        </TouchableOpacity>
      )}
      
      
      />
    </View>
  )
}