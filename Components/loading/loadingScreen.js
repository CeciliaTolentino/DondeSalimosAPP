import { useEffect, useRef } from "react"
import { View, StyleSheet, Animated, Image, Dimensions } from "react-native"

const { width, height } = Dimensions.get("window")

const LoadingScreen = ({ onFinish }) => {
  const liquidHeight = useRef(new Animated.Value(0)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current

  const bubbles = useRef(
    Array.from({ length: 15 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      left: Math.random() * width,
      delay: Math.random() * 2000,
      duration: 3000 + Math.random() * 2000,
      size: 10 + Math.random() * 20,
    })),
  ).current

  useEffect(() => {
    console.log("Iniciando animación de líquido espumante")

    Animated.timing(liquidHeight, {
      toValue: height,
      duration: 2500,
      useNativeDriver: false,
    }).start()

    bubbles.forEach((bubble) => {
      setTimeout(() => {
        Animated.loop(
          Animated.parallel([
            Animated.timing(bubble.translateY, {
              toValue: -height,
              duration: bubble.duration,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(bubble.opacity, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(bubble.opacity, {
                toValue: 0,
                duration: bubble.duration - 300,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ).start()
      }, bubble.delay)
    })

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start()
    }, 500)

    setTimeout(() => {
      console.log("Animación completada")
      if (onFinish) onFinish()
    }, 5000)
  }, [])

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.liquid, { height: liquidHeight }]} />
      {bubbles.map((bubble, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bubble,
            {
              left: bubble.left,
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              opacity: bubble.opacity,
              transform: [{ translateY: bubble.translateY }],
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image source={require("../../img/logo3color.png")} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  liquid: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#e4be15ff",
    opacity: 0.6,
  },
  bubble: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: "#f8c51cff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: width,
    height: height,
  },
  logo: {
    width: 300,
    height: 500,
  },
})

export default LoadingScreen