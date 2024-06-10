import axios from "axios"

const BASE_URL="https://maps.googleapis.com/maps/api/place"

const key = process.env.EXPO_PUBLIC_API_KEY;
const nearByPlace = (lat, lng, type, keyword) => {
    const url = `${BASE_URL}/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${type}&keyword=${keyword}&key=${key}`;
    console.log("URL de nearByPlace:", url); // Imprime la URL formada
    return axios.get(url);
  };
  
 

const busquedaPorTxt=(busquedaTexto)=>axios.get(BASE_URL+"/textsearch/json?query=" + busquedaTexto+
"&key="+key)


export default{
    busquedaPorTxt,
    nearByPlace
}