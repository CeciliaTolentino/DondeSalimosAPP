import { useContext, useEffect } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MaterialIcons } from "@expo/vector-icons"
import { Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import HomeNavigation from "./HomeNavigation"
import Login from "../Pantallas/Login"
import Fav from "../Pantallas/Fav"
import Profile from "../Pantallas/Profile"
import BarManagement from "../Pantallas/BarManagment"
import Reserva from '../../Componentes/Home/Reserva'
import AdminPanel from "../Pantallas/AdminPanel"
import { AuthContext } from "../../AuthContext"
import RestrictedAccess from "../Pantallas/RestrictedAccess"

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
    return null // O un componente de carga
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName
          if (route.name === "Home") {
            iconName = "home"
          } else if (route.name === "Fav") {
            iconName = "favorite"
          } else if (route.name === "Reservas") {
            iconName = "event" 
          } else if (route.name === "AdminPanel") {
            iconName = "admin-panel-settings"
          } else if (route.name === "BarManagement") {
            iconName = "business"
          } else if (route.name === "Login" || route.name === "Profile") {
            iconName = isRegistered ? "person" : "login"
          }
          return <MaterialIcons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen
        name="Home"
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

      {/* Para usuarios comunes: Favoritos */}
      {isCommonUser && (
        <Tab.Screen
          name="Fav"
          component={isRegistered ? Fav : RestrictedAccess}
          listeners={{
            tabPress: (e) => {
              if (!isRegistered) {
                e.preventDefault()
                showRestrictedAccessAlert()
              }
            },
          }}
          options={{ headerShown: false }}
        />
      )}

      {/* Para dueños de bar: Reservas */}
      {isBarOwner && (
        <Tab.Screen
          name="Reservas"
          component={Reserva}
          options={{
            headerShown: false,
            tabBarLabel: "Reservas",
          }}
        />
      )}

      {isAdmin && <Tab.Screen name="AdminPanel" component={AdminPanel} options={{ headerShown: false }} />}

      {isBarOwner && isApproved && (
        <Tab.Screen name="BarManagement" component={BarManagement} options={{ headerShown: false }} />
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
