import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const categoryList = [
  {
    id: 1,
    name: 'Bares',
    value: 'bar',
    keyword: 'bar',
    icon: require('./../../assets/categorias/pub.png'), 
  },
  {
    id: 2,
    name: 'Boliches',
    value: 'night_club',
    keyword: 'night_club,boliche',
    icon: require('./../../assets/categorias/bola-de-disco.png'), 
  }
]

const genres = [
  'techno',
  'salsa',
  'dark',
  'metal',
  'cachengue',
  'cumbia',
  'rock'
]

export default function CategoryFilter({ onSearch }) {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedGenres, setSelectedGenres] = useState([])

  const handleCategoryPress = (category) => {
    setSelectedCategory(category)
  }

  const toggleGenre = (genre) => {
    setSelectedGenres(prevGenres => 
      prevGenres.includes(genre)
        ? prevGenres.filter(g => g !== genre)
        : [...prevGenres, genre]
    )
  }

  const handleSearch = () => {
    if (typeof onSearch === 'function') {
      onSearch(
        selectedCategory ? selectedCategory.value : '',
        selectedCategory ? selectedCategory.keyword : '',
        selectedGenres.join(',')
      )
      setShowFilters(false)
    } else {
      console.error("onSearch is not a function")
    }
  }

  const CategoryItem = ({ category }) => (
    <TouchableOpacity 
      style={[
        styles.categoryItem,
        selectedCategory?.id === category.id && styles.selectedCategoryItem
      ]} 
      onPress={() => handleCategoryPress(category)}
      accessibilityLabel={`Seleccionar categoría ${category.name}`}
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>
        <Image 
          source={category.icon}
          style={styles.iconImage} 
          resizeMode="contain"
        />
      </View>
      <Text style={styles.categoryText}>{category.name}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={() => setShowFilters(!showFilters)}
        accessibilityLabel="Mostrar filtros de categorías y géneros"
        accessibilityRole="button"
      >
        <Ionicons name="filter" size={24} color="white" />
        <Text style={styles.filterText}>Categorías y Filtros</Text>
      </TouchableOpacity>
      
      {showFilters && (
        <ScrollView style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>Categorías:</Text>
          <FlatList
            data={categoryList}
            horizontal={true}
            renderItem={({ item }) => <CategoryItem category={item} />}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.categoryList}
          />

          <Text style={styles.sectionTitle}>Géneros de música:</Text>
          <View style={styles.genresContainer}>
            {genres.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={styles.genreItem}
                onPress={() => toggleGenre(genre)}
                accessibilityLabel={`Seleccionar género ${genre}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selectedGenres.includes(genre) }}
              >
                <View style={[
                  styles.genreCircle,
                  selectedGenres.includes(genre) && styles.selectedGenreCircle
                ]}>
                  {selectedGenres.includes(genre) && (
                    <View style={styles.genreInnerCircle} />
                  )}
                </View>
                <Text style={styles.genreText}>{genre}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearch}
            accessibilityLabel="Buscar con los filtros seleccionados"
            accessibilityRole="button"
          >
            <Text style={styles.searchButtonText}>Buscar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 40, 140, 0.8)',
    padding: 10,
    borderRadius: 20,
  },
  filterText: {
    color: 'white',
    marginLeft: 10,
  },
  filterContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'roboto_bold',
  },
  categoryList: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginVertical: 10,
    marginHorizontal: 40,
  },
  selectedCategoryItem: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#ccc',
    overflow: 'hidden',
  },
  iconImage: {
    width: 50,
    height: 50,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: 'roboto_regular',
    textAlign: 'center',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  genreCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5c288c',
    marginRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedGenreCircle: {
    backgroundColor: '#5c288c',
  },
  genreInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  genreText: {
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#5c288c',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
})