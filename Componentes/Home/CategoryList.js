import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import React from 'react';
import CategoryItem from './CategoryItem';

export default function CategoryList({ setSelectedCategory }) {
  const categoryList = [
    {
      id: 1,
      name: 'Bares',
      value: 'bar',
      keyword: 'bar',
      icon: require('./../../assets/categorias/icon-cerveza.png'),
    },
    {
      id: 2,
      name: 'Boliches',
      value: 'night_club',
      keyword: 'night_club,boliche',
      icon: require('./../../assets/categorias/bailando.png'),
    }
  ];

  const handleCategoryPress = (item) => {
    setSelectedCategory(item.value, item.keyword);
  };

  return (
    <View style={{ marginTop: 15 }}>
      <Text style={{ fontSize: 20, fontFamily: 'roboto_bold' }}>Selección Top Categorías</Text>
      <FlatList
        data={categoryList}
        horizontal={true}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleCategoryPress(item)}>
            <CategoryItem category={item} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
