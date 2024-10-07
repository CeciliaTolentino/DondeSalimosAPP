import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Marker, Callout } from 'react-native-maps'
import { FontAwesome } from '@expo/vector-icons'

export default function PlaceMarker({ item, onPress, isSelected }) {
  return (
    <Marker
      coordinate={{
        latitude: item.geometry.location.lat,
        longitude: item.geometry.location.lng,
      }}
      onPress={() => onPress(item)}
    >
      <FontAwesome 
        name={item.types.includes('bar') ? 'glass' : 'music'} 
        size={isSelected ? 30 : 24} 
        color={isSelected ? "#ff4500" : "#e59fe5"}
      />
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{item.name}</Text>
          <Text style={styles.calloutAddress}>{item.vicinity}</Text>
          {item.plus_code && item.plus_code.compound_code && (
            <Text style={styles.calloutLocation}>
              {item.plus_code.compound_code.split(' ').slice(1).join(' ')}
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  )
}

const styles = StyleSheet.create({
  calloutContainer: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    width: 200,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutAddress: {
    fontSize: 14,
    marginBottom: 3,
  },
  calloutLocation: {
    fontSize: 12,
    color: '#666',
  },
})