import { useEffect, useState } from "react"
import { View, StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import TabNavigation from "./App/Navigation/TabNavigation"
import * as Location from "expo-location"
import { UserLocationContext } from "./App/Context/UserLocationContext"
import { useFonts } from "expo-font"
import { AuthProvider } from "./AuthContext"


import PantalladeCarga from "./Componentes/PantalladeCarga"
const Stack = createNativeStackNavigator();



const AnimatedSplashScreen = ({ navigation }) => {
  const handleLoadingComplete = () => {
    navigation.replace("TabNavigation")
  }

  

  return <PantalladeCarga onFinish={handleLoadingComplete} />
}

function App() {
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [fontsLoaded] = useFonts({
    roboto_regular: require("./assets/Fonts/Roboto-Regular.ttf"),
    roboto_bold: require("./assets/Fonts/Roboto-Bold.ttf"),
  })

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Se denegó el permiso para acceder a la ubicación")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setLocation(location)
      console.log(location)
    })()
  }, [])

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <PantalladeCarga />
      </View>
    )
  }

  return (
    <AuthProvider>
      <UserLocationContext.Provider value={{ location, setLocation }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="SplashScreen" component={AnimatedSplashScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TabNavigation" component={TabNavigation} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </UserLocationContext.Provider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
})

export default App
