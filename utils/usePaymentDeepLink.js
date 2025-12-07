import { useEffect, useRef, useCallback } from "react"
import { Linking, Alert } from "react-native"
import Apis from "../Apis/Apis"


export default function usePaymentDeepLink({
  onPaymentSuccess,
  onPaymentFailure,
  onPaymentPending,
  enabled = true,
}) {
  const isProcessingRef = useRef(false)
  const processedUrlsRef = useRef(new Set())

  const handleDeepLink = useCallback(
    async (event) => {
      const url = typeof event === "string" ? event : event?.url
      if (!url) return

      console.log("[DeepLink] URL recibida:", url)

      // Verificar si ya procesamos esta URL
      if (processedUrlsRef.current.has(url)) {
        console.log("[DeepLink] URL ya procesada, ignorando")
        return
      }

      // Verificar si es una URL de pago de DondeSalimos
      if (!url.startsWith("dondesalimos://payment/")) {
        console.log("[DeepLink] No es una URL de pago, ignorando")
        return
      }

      // Evitar procesamiento duplicado
      if (isProcessingRef.current) {
        console.log("[DeepLink] Ya procesando un pago, ignorando")
        return
      }

      isProcessingRef.current = true
      processedUrlsRef.current.add(url)

      try {
        // Parsear la URL
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split("/")
        const status = pathParts[pathParts.length - 1] // success, failure, pending

        // Obtener parámetros
        const params = {}
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value
        })

        console.log("[DeepLink] Status:", status)
        console.log("[DeepLink] Params:", params)

        const publicidadId = params.publicidad_id || params.external_reference
        const paymentId = params.payment_id || params.collection_id
        const preferenceId = params.preference_id

        console.log("[DeepLink] publicidadId:", publicidadId)
        console.log("[DeepLink] paymentId:", paymentId)

        switch (status) {
          case "success":
            await handlePaymentSuccess(publicidadId, paymentId, preferenceId, onPaymentSuccess)
            break

          case "failure":
            console.log("[DeepLink] Pago fallido")
            Alert.alert(
              "Pago no completado",
              "El pago no se pudo completar. Por favor, intenta nuevamente.",
              [{ text: "Entendido" }]
            )
            if (onPaymentFailure) {
              onPaymentFailure(publicidadId)
            }
            break

          case "pending":
            console.log("[DeepLink] Pago pendiente")
            Alert.alert(
              "Pago pendiente",
              "Tu pago está siendo procesado. Recibirás una notificación cuando se confirme.",
              [{ text: "Entendido" }]
            )
            if (onPaymentPending) {
              onPaymentPending(publicidadId)
            }
            break

          default:
            console.log("[DeepLink] Status desconocido:", status)
        }
      } catch (error) {
        console.error("[DeepLink] Error procesando URL:", error)
      } finally {
        isProcessingRef.current = false
      }
    },
    [onPaymentSuccess, onPaymentFailure, onPaymentPending]
  )

  const handlePaymentSuccess = async (publicidadId, paymentId, preferenceId, callback) => {
    console.log("[DeepLink] Procesando pago exitoso...")

    try {
      // Si tenemos paymentId, verificar el pago con el backend
      if (paymentId) {
        console.log("[DeepLink] Verificando pago con backend...")
        const response = await Apis.verificarYActivarPago(paymentId, preferenceId)

        if (response.data?.success) {
          console.log("[DeepLink] Pago verificado exitosamente")
          Alert.alert(
            "¡Pago exitoso!",
            "Tu publicidad ha sido pagada correctamente y está pendiente de aprobación del administrador.",
            [{ text: "Ver mis publicidades" }]
          )

          if (callback) {
            callback(publicidadId, response.data)
          }
          return
        }
      }

      // Si no hay paymentId o falló la verificación, igual notificamos éxito
      
      console.log("[DeepLink] Notificando éxito (verificación pendiente por webhook)")
      Alert.alert(
        "¡Pago procesado!",
        "Tu pago está siendo verificado. La publicidad se activará automáticamente.",
        [{ text: "Ver mis publicidades" }]
      )

      if (callback) {
        callback(publicidadId, null)
      }
    } catch (error) {
      console.error("[DeepLink] Error verificando pago:", error)
      
      // Aún así notificamos, el webhook debería encargarse
      Alert.alert(
        "Pago recibido",
        "Tu pago está siendo procesado. Si no ves tu publicidad activada en unos minutos, contacta soporte.",
        [{ text: "Entendido" }]
      )

      if (callback) {
        callback(publicidadId, null)
      }
    }
  }

  useEffect(() => {
    if (!enabled) return

    // Verificar si la app se abrió con un deep link
    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) {
          console.log("[DeepLink] URL inicial detectada:", initialUrl)
          // Pequeño delay para asegurar que la app esté lista
          setTimeout(() => handleDeepLink(initialUrl), 500)
        }
      } catch (error) {
        console.error("[DeepLink] Error obteniendo URL inicial:", error)
      }
    }

    checkInitialUrl()

    // Escuchar deep links mientras la app está abierta
    const subscription = Linking.addEventListener("url", handleDeepLink)

    return () => {
      subscription?.remove()
    }
  }, [enabled, handleDeepLink])

  return {
    isProcessingPayment: isProcessingRef.current,
    // Método manual para verificar un pago
    verifyPayment: async (paymentId, preferenceId) => {
      try {
        const response = await Apis.verificarYActivarPago(paymentId, preferenceId)
        return response.data
      } catch (error) {
        console.error("[DeepLink] Error en verificación manual:", error)
        throw error
      }
    },
  }
}