import { Share } from "react-native"

const SharePlace = (place) => {
  if (!place) return

  Share.share({
    title: 'Compartir comercio',
    message: `Nombre del comercio: ${place.name || 'No disponible'}\nDirección: ${place.vicinity || place.formatted_address || 'No disponible'}`,
  })
}

export default {
  SharePlace
}