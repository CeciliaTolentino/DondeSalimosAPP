import axios from "axios"

const BASE_URL = "https://maps.googleapis.com/maps/api/place"
const GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode"

const key = process.env.EXPO_PUBLIC_API_KEY

const nearByPlace = (lat, lng, type, keyword, filters) => {
  const filterString = filters === "" ? "" : filters
  console.log("El filter string queda de la siguiente forma " + filterString)
  const url = `${BASE_URL}/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${type}&keyword=${keyword},${filterString}&key=${key}`
  console.log("URL de nearByPlace:", url)
  return axios.get(url)
}

const getDetallesLugar = (placeId) =>
  axios.get(
    BASE_URL + "/details/json?" + "place_id=" + placeId + "&fields=name,formatted_phone_number,website" + "&key=" + key,
  )

// Nueva función para geocodificar direcciones
const geocodeAddress = (address) => {
  const encodedAddress = encodeURIComponent(address)
  const url = `${GEOCODING_URL}/json?address=${encodedAddress}&key=${key}`
  console.log("Geocoding URL:", url)
  return axios.get(url)
}

// Nueva función para geocodificación inversa (coordenadas a dirección)
const reverseGeocode = (lat, lng) => {
  const url = `${GEOCODING_URL}/json?latlng=${lat},${lng}&key=${key}`
  return axios.get(url)
}

export default {
  getDetallesLugar,
  nearByPlace,
  geocodeAddress,
  reverseGeocode,
}
