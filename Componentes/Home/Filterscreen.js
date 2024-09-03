import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function FiltersScreen({ selectedFilters, setSelectedFilters }) {
  const filters = {
    techno: 'techno',
    salsa: 'salsa',
    dark: 'dark',
    metal: 'metal',
    cachengue: 'cachengue',
    cumbia: 'cumbia',
    musica_ochentosa:'80s'
  };

  const toggleFilter = (filter) => {
    const updatedFilters = new Set(selectedFilters);
    if (updatedFilters.has(filter)) {
      updatedFilters.delete(filter);
    } else {
      updatedFilters.add(filter);
    }
    setSelectedFilters(Array.from(updatedFilters));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filtros de género de música</Text>
      {Object.values(filters).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={styles.checkboxContainer}
          onPress={() => toggleFilter(filter)}
        >
          <MaterialIcons
            name={selectedFilters.includes(filter) ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={selectedFilters.includes(filter) ? 'green' : 'black'}
          />
          <Text style={styles.label}>{filter}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  label: {
    marginLeft: 8,
    fontSize: 18,
  },
});
