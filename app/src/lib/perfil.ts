// Validaciones de la pantalla "Mi cuenta". Son funciones puras para poder probarlas sin la interfaz.

export const NOMBRE_MIN = 3;
export const NOMBRE_MAX = 60;
export const CONTRASENA_MIN = 6;

/** Colapsa espacios repetidos: "  Ana   Pérez " → "Ana Pérez". */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ");
}

export function validarNombre(nombre: string): string | undefined {
  const limpio = normalizarNombre(nombre);
  if (limpio.length < NOMBRE_MIN) return "Ingresa tu nombre completo.";
  if (limpio.length > NOMBRE_MAX) return `Máximo ${NOMBRE_MAX} caracteres.`;
  return undefined;
}

/** "Depto 305" → "305". El perfil guarda la etiqueta completa; el campo edita solo el número. */
export function numeroDepto(depto: string): string {
  return depto.replace(/^depto\.?\s*/i, "").trim();
}

/** "305" → "Depto 305". */
export function etiquetaDepto(numero: string): string {
  return `Depto ${numero.trim().toUpperCase()}`;
}

export function validarDepto(numero: string): string | undefined {
  if (!/^[0-9A-Za-z-]{1,6}$/.test(numero.trim())) {
    return "Usa solo números o letras, por ejemplo 305 o 12B.";
  }
  return undefined;
}

export function validarContrasenaNueva(
  actual: string,
  nueva: string,
  repetida: string
): string | undefined {
  if (!actual) return "Ingresa tu contraseña actual.";
  if (nueva.length < CONTRASENA_MIN) return `La nueva contraseña debe tener al menos ${CONTRASENA_MIN} caracteres.`;
  if (nueva === actual) return "La nueva contraseña debe ser distinta de la actual.";
  if (nueva !== repetida) return "Las contraseñas nuevas no coinciden.";
  return undefined;
}
