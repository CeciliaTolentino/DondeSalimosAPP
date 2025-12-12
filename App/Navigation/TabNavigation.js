import { useContext, useEffect } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MaterialIcons } from "@expo/vector-icons"
import { Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import HomeNavigation from "./HomeNavigation"
import Login from "../Screen/Login"
import Profile from "../Screen/Profile"
import BarManagement from "../Screen/BarManagment"
import Reservation from '../../Components/Reservation/Reservation'
import AdminPanel from "../Screen/AdminPanel"
import { AuthContext } from "../../Apis/AuthContext"
import RestrictedAccess from "../Screen/RestrictedAccess"

const Tab = createBottomTabNavigator()

export default function TabNavigation() {
  const { user, isAdmin, isBarOwner, isApproved, isLoading, isAuthenticated, isRegistered } = useContext(AuthContext)
  const navigation = useNavigation()

  const isCommonUser = user && !isAdmin && !isBarOwner

  useEffect(() => {
    if (isAuthenticated && !isRegistered) {
      navigation.navigate("Login")
    }
  }, [isAuthenticated, isRegistered, navigation])

  const showRestrictedAccessAlert = () => {
    Alert.alert("Acceso Restringido", "Necesitas registrarte para acceder a esta función.", [
      { text: "OK", onPress: () => {} },
      { text: "Ir a Registro", onPress: () => navigation.navigate("Login") },
    ])
  }

  if (isLoading) {
    return null 
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName
          if (route.name === "Inicio") {
            iconName = "home"
          } else if (route.name === "Reservas") {
            iconName = "event" 
          } else if (route.name === "Panel Admin") {
            iconName = "admin-panel-settings"
          } else if (route.name === "Comercio") {
            iconName = "business"
          } else if (route.name === "Login" || route.name === "Profile") {
            iconName = isRegistered ? "person" : "login"
          }
          return <MaterialIcons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeNavigation}
        options={{ headerShown: false }}
        listeners={{
          tabPress: (e) => {
            if (isAuthenticated && !isRegistered) {
              e.preventDefault()
              navigation.navigate("Login")
            }
          },
        }}
      />

      
      {isCommonUser && (
        <Tab.Screen
          name="Reservas"
          component={isRegistered ? Reservation : RestrictedAccess}
          listeners={{
            tabPress: (e) => {
              if (!isRegistered) {
                e.preventDefault()
                showRestrictedAccessAlert()
              }
            },
          }}
          options={{ headerShown: false,
            tabBarLabel: "Reservas" }}
        />
      )}


      {isBarOwner && (
        <Tab.Screen
          name="Reservas"
          component={Reservation}
          options={{
            headerShown: false,
            tabBarLabel: "Reservas",
          }}
        />
      )}

      {isAdmin && <Tab.Screen name="Panel Admin" component={AdminPanel} options={{ headerShown: false }} />}

      {isBarOwner && isApproved && (
        <Tab.Screen name="Comercio" component={BarManagement} options={{ headerShown: false }} />
      )}

      <Tab.Screen
        name={isRegistered ? "Profile" : "Login"}
        component={isRegistered ? Profile : Login}
        options={{
          headerShown: false,
          tabBarLabel: isRegistered ? "Perfil" : "Login/Registrarse",
        }}
      />
    </Tab.Navigator>
  )
}
