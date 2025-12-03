import axios from "axios"

const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://dondesalimos-eseqa9ftecepbfdu.canadacentral-01.azurewebsites.net"
//const BASE_URL = "https://maps.googleapis.com/maps/api/place"
//const GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode"

//const key = process.env.EXPO_PUBLIC_API_KEY
const nearByPlace = (lat, lng, type, keyword, filters) => {
  const filterString = filters === "" ? "" : filters
  console.log("El filter string queda de la siguiente forma " + filterString)

  const url = `${BACKEND_URL}/api/GooglePlaces/nearby?lat=${lat}&lng=${lng}&radius=10000&type=${type}&keyword=${keyword}&filters=${filterString}`
  console.log("URL de nearByPlace:", url)
  return axios.get(url)
}

const getDetallesLugar = (placeId) => {
  const url = `${BACKEND_URL}/api/GooglePlaces/details/${placeId}`
  return axios.get(url)
}

// Nueva función para geocodificar direcciones
const geocodeAddress = (address) => {
  const encodedAddress = encodeURIComponent(address)
  const url = `${BACKEND_URL}/api/GooglePlaces/geocode?address=${encodedAddress}`
  console.log("Geocoding URL:", url)
  return axios.get(url)
}

// Nueva función para geocodificación inversa (coordenadas a dirección)
const reverseGeocode = (lat, lng) => {
  const url = `${BACKEND_URL}/api/GooglePlaces/geocode?latlng=${lat},${lng}`
  return axios.get(url)
}

export default {
  getDetallesLugar,
  nearByPlace,
  geocodeAddress,
  reverseGeocode,
}
