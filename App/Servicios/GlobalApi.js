import axios from "axios"

const BASE_URL="https://maps.googleapis.com/maps/api/place"
const API_KEY='AIzaSyAL4LmZzNhV_UNJSLI_Z7xjcN6wau7sNy8'

const nearByPlace=(lat,lng,type,keyword)=> axios.get(BASE_URL+
    "/nearbysearch/json?location="+lat+","+lng+"&radius=10000&type="+type+"&keyword="+keyword+"&key="+API_KEY)

export default{nearByPlace}