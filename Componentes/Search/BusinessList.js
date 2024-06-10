import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import React from 'react'
import { Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import BussinessItem from './BussinessItem'
import { useNavigation } from '@react-navigation/native'
export default function BusinessList({placeList}) {
  const navigation = useNavigation();
  return (
    <View>
       <LinearGradient
        // Background Linear Gradient
        colors={[ "transparent",'white']}
        style={{ padding: 20, width: Dimensions.get("screen").width }}
      >
        </LinearGradient>
        <FlatList
        data={placeList}
        horizontal={true}
        renderItem={({item})=>(
          <TouchableOpacity onPress={()=>navigation.navigate(
            'place-detail',
            {place:item}
          )}> 
        <BussinessItem place={item}/>
        </TouchableOpacity>
  )}
        />
    </View>
  )
}