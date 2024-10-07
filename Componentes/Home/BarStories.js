import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BarStories() {
  const [barStories, setBarStories] = useState([]);

  useEffect(() => {
    loadBarStories();
  }, []);

  const loadBarStories = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userDataArray = await AsyncStorage.multiGet(keys);
      const approvedBars = userDataArray
        .map(([key, value]) => {
          const userData = JSON.parse(value);
          return userData.isBarOwner && userData.approved && (userData.businessImage || userData.advertisingImage)
            ? {
                id: key,
                title: userData.barName,
                image: userData.advertisingImage || userData.businessImage,
                description: `${userData.barType} - ${userData.openingHours} a ${userData.closingHours}`,
              }
            : null;
        })
        .filter(Boolean);
      setBarStories(approvedBars);
    } catch (error) {
      console.error('Error al cargar las historias de bares:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {barStories.map((story) => (
          <TouchableOpacity key={story.id} style={styles.storyContainer}>
            <Image source={{ uri: story.image }} style={styles.storyImage} />
            <View style={styles.textContainer}>
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyDescription}>{story.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  storyContainer: {
    width: width * 0.3,
    marginRight: 10,
    backgroundColor: 'rgba(92, 40, 140, 0.8)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  textContainer: {
    padding: 5,
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  storyDescription: {
    fontSize: 12,
    color: 'white',
  },
});