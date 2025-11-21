import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions} from "react-native"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import { useEffect } from "react"
import Apis from "../../Apis/Apis"
const { width, height } = Dimensions.get("window")

export default function PublicidadViewerModal({ visible, publicidad, onClose, onViewOnMap }) {
  useEffect(() => {
    if (visible && publicidad?.iD_Publicidad) {
      console.log("Publicidad vista, incrementando contador:", publicidad.iD_Publicidad)
      Apis.incrementarVisualizacion(publicidad.iD_Publicidad)
    }
  }, [visible, publicidad?.iD_Publicidad])
  
  if (!publicidad) return null

  const convertBase64ToImage = (base64String) => {
    if (!base64String) return null
    return `data:image/jpeg;base64,${base64String}`
  }

  return (
    <Modal animationType="fade" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
    
        <Image source={{ uri: convertBase64ToImage(publicidad.imagen) }} style={styles.image} resizeMode="contain" />

        
        <View style={styles.overlay}>
         
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AntDesign name="close" size={28} color="white" />
          </TouchableOpacity>

          

         
          <TouchableOpacity style={styles.mapButton} onPress={() => onViewOnMap(publicidad)}>
            <MaterialCommunityIcons name="map-marker" size={24} color="white" />
            <Text style={styles.mapButtonText}>Ver en el mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  image: {
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 20,
  },
  closeButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
 
  comercioName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  comercioAddress: {
    fontSize: 16,
    color: "#e0e0e0",
  },
  mapButton: {
    flexDirection: "row",
    backgroundColor: "#5c288c",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: "80%",
  },
  mapButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
})
