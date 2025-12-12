import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import Apis from "../../Apis/Apis"
import PublicidadViewerModal from "../advertising/publicidadViewerModal"

const VIEWED_STORIES_KEY = "@viewed_publicidades"
const PUBLICIDADES_CACHE_KEY = "@publicidades_cache"
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutos de caché (reducido para mejor actualización)

export default function BarStories({ onStoryPress }) {
  const [publicidades, setPublicidades] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPublicidad, setSelectedPublicidad] = useState(null)
  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewedStories, setViewedStories] = useState(new Set())

  const shimmerAnims = useRef({})
  const isMountedRef = useRef(true)
  const isLoadingRef = useRef(false)

  // Cleanup en unmount
  useEffect(() => {
    isMountedRef.current = true
    loadViewedStories()
    loadPublicidades()

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadViewedStories = async () => {
    try {
      const viewed = await AsyncStorage.getItem(VIEWED_STORIES_KEY)
      if (viewed && isMountedRef.current) {
        setViewedStories(new Set(JSON.parse(viewed)))
      }
    } catch (error) {
      console.error("Error loading viewed stories:", error)
    }
  }

  const markAsViewed = async (publicidadId) => {
    try {
      const newViewed = new Set(viewedStories)
      newViewed.add(publicidadId)
      setViewedStories(newViewed)
      await AsyncStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(Array.from(newViewed)))
    } catch (error) {
      console.error("Error saving viewed story:", error)
    }
  }

  const getShimmerAnim = useCallback((publicidadId) => {
    if (!shimmerAnims.current[publicidadId]) {
      shimmerAnims.current[publicidadId] = new Animated.Value(0)
      Animated.loop(
        Animated.timing(shimmerAnims.current[publicidadId], {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      ).start()
    }
    return shimmerAnims.current[publicidadId]
  }, [])

  const filterActivePublicidades = useCallback((data) => {
    const hoy = new Date()

    return data.filter((pub) => {
      try {
        if (!pub.estado || !pub.pago) return false

        const imagenBase64 = pub.imagen || pub.Imagen || pub.foto || pub.Foto
        if (!imagenBase64 || imagenBase64.length === 0) return false

        const dias = Number.parseInt(pub.tiempo.split(":")[0])
        const fechaCreacion = new Date(pub.fechaCreacion)
        const fechaExpiracion = new Date(fechaCreacion.getTime() + dias * 24 * 60 * 60 * 1000)

        return fechaExpiracion > hoy
      } catch (error) {
        return false
      }
    })
  }, [])

  const loadPublicidades = async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      // Intentar cargar desde caché primero para mostrar algo rápido
      const cached = await AsyncStorage.getItem(PUBLICIDADES_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const isValid = Date.now() - timestamp < CACHE_DURATION

        if (isValid && data.length > 0 && isMountedRef.current) {
          console.log("[BarStories] Usando caché:", data.length, "publicidades")
          setPublicidades(data)
          setIsLoading(false)
        }
      }

      // SIEMPRE buscar datos frescos del servidor
      await fetchPublicidadesFromServer()
    } catch (error) {
      console.error("Error al cargar publicidades:", error)
      if (isMountedRef.current) {
        setPublicidades([])
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      isLoadingRef.current = false
    }
  }

  const fetchPublicidadesFromServer = async () => {
    try {
      const response = await Apis.obtenerPublicidadesListado()

      if (response.status === 200 && isMountedRef.current) {
        const activas = filterActivePublicidades(response.data)

        // Guardar en caché
        await AsyncStorage.setItem(
          PUBLICIDADES_CACHE_KEY,
          JSON.stringify({ data: activas, timestamp: Date.now() })
        )

        // Comparar por IDs para ver si hay cambios reales
        const currentIds = new Set(publicidades.map((p) => p.iD_Publicidad))
        const newIds = activas.map((p) => p.iD_Publicidad)

        const hasNewItems = newIds.some((id) => !currentIds.has(id))
        const hasRemovedItems = publicidades.some((p) => !newIds.includes(p.iD_Publicidad))
        const hasChanges = hasNewItems || hasRemovedItems || activas.length !== publicidades.length

        if (hasChanges) {
          console.log("[BarStories] Cambios detectados, actualizando UI")
          console.log("[BarStories] Publicidades activas:", activas.length)
          setPublicidades(activas)
        } else {
          console.log("[BarStories] Sin cambios, manteniendo estado actual")
        }
      }
    } catch (error) {
      console.error("[BarStories] Error fetching from server:", error)
    }
  }

  const handleStoryPress = useCallback(
    (publicidad) => {
      markAsViewed(publicidad.iD_Publicidad)
      setSelectedPublicidad(publicidad)
      setViewerVisible(true)
    },
    [viewedStories]
  )

  const handleViewOnMap = useCallback(
    (publicidad) => {
      setViewerVisible(false)
      if (onStoryPress && publicidad.iD_Comercio) {
        onStoryPress(publicidad.iD_Comercio)
      }
    },
    [onStoryPress]
  )

  const convertBase64ToImage = useCallback((base64String) => {
    if (!base64String || base64String.length === 0) return null
    if (base64String.startsWith("data:image")) return base64String
    return "data:image/jpeg;base64," + base64String
  }, [])

  // Memoizar los items para evitar re-renders innecesarios
  const storyItems = useMemo(() => {
    return publicidades
      .map((publicidad, index) => {
        const imagenBase64 = publicidad.imagen || publicidad.Imagen || publicidad.foto || publicidad.Foto
        const imageUri = convertBase64ToImage(imagenBase64)
        const isViewed = viewedStories.has(publicidad.iD_Publicidad)

        if (!imageUri) return null

        return (
          <StoryItem
            key={publicidad.iD_Publicidad || index}
            publicidad={publicidad}
            imageUri={imageUri}
            isViewed={isViewed}
            onPress={handleStoryPress}
            getShimmerAnim={getShimmerAnim}
          />
        )
      })
      .filter(Boolean)
  }, [publicidades, viewedStories, handleStoryPress, convertBase64ToImage, getShimmerAnim])

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.storyContainer}>
              <View style={styles.skeletonCircle} />
              <View style={styles.skeletonText} />
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  if (publicidades.length === 0) {
    return null
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          {storyItems}
        </ScrollView>
      </View>

      <PublicidadViewerModal
        visible={viewerVisible}
        publicidad={selectedPublicidad}
        onClose={() => setViewerVisible(false)}
        onViewOnMap={handleViewOnMap}
      />
    </>
  )
}

const StoryItem = memo(({ publicidad, imageUri, isViewed, onPress, getShimmerAnim }) => {
  const shimmerAnim = getShimmerAnim(publicidad.iD_Publicidad)
  const rotate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <TouchableOpacity style={styles.storyContainer} onPress={() => onPress(publicidad)} activeOpacity={0.7}>
      {!isViewed ? (
        <View style={styles.gradientBorder}>
          <LinearGradient
            colors={["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 34 }]}
          />
          <Animated.View style={[styles.shimmerOverlay, { transform: [{ rotate }] }]}>
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 34 }]}
            />
          </Animated.View>
          <View style={styles.storyImageContainer}>
            <Image source={{ uri: imageUri }} style={styles.storyImage} resizeMode="cover" />
          </View>
        </View>
      ) : (
        <View style={styles.viewedBorder}>
          <View style={styles.storyImageContainer}>
            <Image source={{ uri: imageUri }} style={styles.storyImage} resizeMode="cover" />
          </View>
        </View>
      )}
      <Text numberOfLines={1} style={styles.storyName}>
        {publicidad.comercio?.nombre || publicidad.comercio || "Comercio"}
      </Text>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  scrollView: {
    paddingHorizontal: 5,
  },
  scrollViewContent: {
    paddingRight: 10,
  },
  storyContainer: {
    marginHorizontal: 6,
    alignItems: "center",
    width: 70,
  },
  gradientBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 34,
  },
  viewedBorder: {
    width: 68,
    height: 68,
    borderWidth: 2,
    borderColor: "#888888ff",
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
  },
  storyImageContainer: {
    width: 62,
    height: 62,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 31,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width: "100%",
    height: "100%",
  },
  storyName: {
    marginTop: 4,
    fontSize: 10,
    color: "#e9e2e2ff",
    textAlign: "center",
    width: 70,
  },
  skeletonCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#333",
  },
  skeletonText: {
    width: 50,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
    marginTop: 4,
  },
})