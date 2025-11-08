// CUIT Validator for Argentina
// CUIT format: XX-XXXXXXXX-X (11 digits total)

/**
 * Valida el dígito verificador de un CUIT argentino
 * @param {string} cuit - CUIT sin guiones (11 dígitos)
 * @returns {boolean} true si el dígito verificador es correcto
 */
export const validateCUITCheckDigit = (cuit) => {
  // Remover guiones si los tiene
  const cleanCuit = cuit.replace(/-/g, "")

  // Verificar que tenga 11 dígitos
  if (cleanCuit.length !== 11 || !/^\d+$/.test(cleanCuit)) {
    return false
  }

  // Multiplicadores para el cálculo
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

  // Calcular suma
  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleanCuit[i]) * multipliers[i]
  }

  // Calcular dígito verificador
  const remainder = sum % 11
  let checkDigit = 11 - remainder

  // Casos especiales
  if (checkDigit === 11) checkDigit = 0
  if (checkDigit === 10) checkDigit = 9

  // Comparar con el último dígito del CUIT
  return checkDigit === Number.parseInt(cleanCuit[10])
}

/**
 * Formatea un CUIT con guiones (XX-XXXXXXXX-X)
 * @param {string} cuit - CUIT sin formato
 * @returns {string} CUIT formateado con guiones
 */
export const formatCUIT = (cuit) => {
  // Remover todo excepto números
  const cleanCuit = cuit.replace(/\D/g, "")

  // Limitar a 11 dígitos
  const limitedCuit = cleanCuit.substring(0, 11)

  // Formatear con guiones
  if (limitedCuit.length <= 2) {
    return limitedCuit
  } else if (limitedCuit.length <= 10) {
    return `${limitedCuit.substring(0, 2)}-${limitedCuit.substring(2)}`
  } else {
    return `${limitedCuit.substring(0, 2)}-${limitedCuit.substring(2, 10)}-${limitedCuit.substring(10)}`
  }
}

/**
 * Valida un CUIT completo
 * @param {string} cuit - CUIT con o sin guiones
 * @returns {{valid: boolean, message: string}} objeto con validez y mensaje de error
 */
export const validateCUIT = (cuit) => {
  const cleanCuit = cuit.replace(/-/g, "")

  // Verificar longitud
  if (cleanCuit.length !== 11) {
    return {
      valid: false,
      message: "El CUIT debe tener 11 dígitos",
    }
  }

  // Verificar que solo contenga números
  if (!/^\d+$/.test(cleanCuit)) {
    return {
      valid: false,
      message: "El CUIT solo debe contener números",
    }
  }

  // Verificar dígito verificador
  if (!validateCUITCheckDigit(cleanCuit)) {
    return {
      valid: false,
      message: "El dígito verificador del CUIT es incorrecto",
    }
  }

  return {
    valid: true,
    message: "CUIT válido",
  }
}
