/**
 * Genera un comando curl a partir de una configuración de Axios
 * Útil para debugging de peticiones HTTP
 */
export const generateCurlCommand = (config) => {
  const method = (config.method || "GET").toUpperCase()
  const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url

  let curl = `curl -X ${method} '${url}'`

  // Agregar headers
  if (config.headers) {
    Object.keys(config.headers).forEach((key) => {
      const value = config.headers[key]
      if (value) {
        curl += ` \\\n  -H '${key}: ${value}'`
      }
    })
  }

  // Agregar body si existe
  if (config.data) {
    const dataString = typeof config.data === "string" ? config.data : JSON.stringify(config.data)
    curl += ` \\\n  -d '${dataString}'`
  }

  return curl
}


/**
 * Genera y muestra en consola un comando curl para debugging
 */
export const logCurlCommand = (config) => {
  try {
    const curl = generateCurlCommand(config)
    console.log("[v0] 📋 Comando curl para debugging:")
    console.log(curl)
    return curl
  } catch (error) {
    console.error("[v0] Error al generar curl command:", error)
    return null
  }
}