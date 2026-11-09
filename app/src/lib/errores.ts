// Los errores de Firebase traen un código ("auth/wrong-password",
// "permission-denied") y un mensaje en inglés pensado para programadores. A
// quien usa la app se le muestra el texto de esta tabla.

const MENSAJES: Record<string, string> = {
  "auth/invalid-email": "El correo no tiene un formato válido.",
  "auth/missing-email": "Escribe tu correo.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-login-credentials": "Correo o contraseña incorrectos.",
  "auth/user-disabled": "Esta cuenta está deshabilitada. Habla con el administrador de tu planta.",
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta en RecyTrack.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/requires-recent-login": "Por seguridad, cierra sesión, vuelve a entrar y repite el cambio.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet e intenta de nuevo.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento y vuelve a intentarlo.",
  "auth/unauthorized-continue-uri":
    "Este sitio no está autorizado para enviar el correo de verificación. Agrégalo en Firebase → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed":
    "Ese método de inicio de sesión no está habilitado en la consola de Firebase.",
  "auth/popup-closed-by-user": "Cerraste la ventana de inicio de sesión antes de terminar.",
  "auth/cancelled-popup-request": "Cerraste la ventana de inicio de sesión antes de terminar.",
  "auth/popup-blocked":
    "El navegador bloqueó la ventana de inicio de sesión. Permite las ventanas emergentes de RecyTrack e intenta de nuevo.",
  "auth/unauthorized-domain":
    "Este sitio no está autorizado para iniciar sesión con Google o Microsoft. Agrégalo en Firebase → Authentication → Settings → Authorized domains.",
  "auth/account-exists-with-different-credential":
    "Ese correo ya tiene una cuenta en RecyTrack. Entra de la misma forma que la primera vez (con tu contraseña, Google o Microsoft).",
  "permission-denied": "No tienes permiso para realizar esta acción.",
  unavailable: "No se pudo contactar a Firestore. Revisa tu conexión.",
  "deadline-exceeded": "La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.",
  "not-found": "Lo que intentas cambiar ya no existe. Puede que otra persona lo haya borrado.",
  "already-exists": "Eso ya existe en RecyTrack.",
  aborted: "Otra persona cambió lo mismo al mismo tiempo. Intenta de nuevo.",
  "resource-exhausted": "Demasiadas operaciones seguidas. Espera un momento y vuelve a intentarlo.",
};

const GENERICO = "No pudimos completar la operación. Intenta de nuevo.";

/**
 * Mensaje en español para un error. Los errores que lanza la propia app ya
 * vienen en español y se muestran tal cual; los de Firebase se traducen por su
 * código, y si el código no está en la tabla se muestra un mensaje genérico en
 * vez del texto en inglés.
 */
export function mensajeError(error: unknown): string {
  const codigo = (error as { code?: unknown } | null)?.code;
  if (typeof codigo === "string") return MENSAJES[codigo] ?? GENERICO;
  if (error instanceof Error && error.message) return error.message;
  return GENERICO;
}
