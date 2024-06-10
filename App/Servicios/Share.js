import { Share } from "react-native"

const  SharePlace=(place)=>{
   Share.share({
    title:'Compartir comercio',
    message: "Nombre del comercio: " + place.name 
    + "\n" + "Dirección: "  +place.vicinity?place.vicinity:place.formatted_address,
   })
}

export default{
    SharePlace
}