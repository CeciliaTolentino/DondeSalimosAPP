import { View, Text, ScrollView } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import Headers from '../../Componentes/Home/Headers';
import GoogleMapView from '../../Componentes/Home/GoogleMapView';
import CategoryList from '../../Componentes/Home/CategoryList';
import GlobalApi from '../Servicios/GlobalApi';
import PlaceList from '../../Componentes/Home/PlaceList';
import { UserLocationContext } from '../Context/UserLocationContext';
import FiltersScreen from '../../Componentes/Home/Filterscreen';

export default function Home() {
  const [placeList, setPlaceList] = useState([]);
  const { location } = useContext(UserLocationContext);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedCategory, setSelectedCategoryState] = useState({ value: 'bar', keyword: '' });

  useEffect(() => {
    if (location) {
      GetNearBySearchPlace(selectedCategory.value, selectedCategory.keyword, selectedFilters);
    }
  }, [location, selectedFilters, selectedCategory]);

  const GetNearBySearchPlace = (value, keyword, filters) => {
    console.log("Los filtros son: " +filters)
    try {
     

      const filterKeywords = Array.isArray(filters) ? filters.join(',') : '';

      GlobalApi.nearByPlace(location.coords.latitude, location.coords.longitude, value, keyword, filterKeywords)
        .then(resp => {
          setPlaceList(resp.data.results);
        })
        .catch(error => {
          console.error("Error fetching nearby places:", error);
        });
    } catch (error) {
      console.error("Error fetching nearby places:", error);
    }
  };

  const handleCategorySelection = (value, keyword) => {
    setSelectedCategoryState({ value, keyword });
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Headers />
      <GoogleMapView placeList={placeList} />
      <CategoryList setSelectedCategory={handleCategorySelection} />
      <FiltersScreen selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} />
      {placeList.length > 0 && <PlaceList placeList={placeList} />}
    </ScrollView>
  );
}
