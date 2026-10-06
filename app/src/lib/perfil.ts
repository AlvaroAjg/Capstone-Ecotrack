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
