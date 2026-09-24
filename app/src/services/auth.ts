import { Platform } from "react-native";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { Rol, Usuario } from "../lib/tipos";

export type UsuarioAuth = User;

/** Escucha altas y bajas de sesión. Devuelve la función para desuscribirse. */
export function escucharSesion(callback: (usuario: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/** Escucha el documento de perfil en `usuarios/{uid}` en tiempo real. */
export function escucharPerfil(uid: string, callback: (u: Usuario | null) => void) {
  return onSnapshot(
    doc(db, "usuarios", uid),
    (snap) => {
      if (!snap.exists()) return callback(null);
      const d = snap.data();
      callback({
        id: uid,
        nombre: d.nombre ?? "",
        email: d.email ?? "",
        depto: d.depto ?? "",
        rol: (d.rol ?? "residente") as Rol,
        torreId: d.torreId ?? null,
        torreNombre: d.torreNombre ?? null,
        avisosVistosHasta: d.avisosVistosHasta ?? 0,
      });
    },
    () => callback(null)
  );
}

export async function registrarCuenta(params: {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  depto: string;
  /** Solo para gestor: código que las reglas comprueban antes de aceptar ese rol. */
  codigoRolUsado?: string;
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const credencial = await createUserWithEmailAndPassword(auth, email, params.password);

  await updateProfile(credencial.user, { displayName: params.nombre });

  const datos: Record<string, unknown> = {
    nombre: params.nombre,
    email,
    rol: params.rol,
    depto: params.depto,
    torreId: null,
    torreNombre: null,
    creadoEn: Date.now(),
  };
  // Solo se incluye cuando corresponde: es lo que las reglas de Firestore
  // exigen para aceptar un rol distinto de "residente" al crear el perfil.
  if (params.codigoRolUsado) datos.codigoRolUsado = params.codigoRolUsado;

  await setDoc(doc(db, "usuarios", credencial.user.uid), datos);

  return credencial.user.uid;
}

/**
 * Promueve a un residente a administrador de una torre. Solo funciona si
 * `codigoRolUsado` coincide con el código de esa torre en `codigosRol`: la
 * regla de Firestore es quien realmente decide, esta función solo entrega los
 * datos. Si el código está mal, la escritura falla con "permission-denied".
 */
export async function promoverAAdministrador(
  uid: string,
  torreId: string,
  torreNombre: string,
  codigoRolUsado: string
): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), {
    rol: "administrador",
    torreId,
    torreNombre,
    depto: "Administración",
    codigoRolUsado,
  });
}

export async function iniciarSesion(email: string, password: string): Promise<string> {
  const credencial = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  return credencial.user.uid;
}

/** Google solo está disponible en la versión web (y la PWA instalada). */
export const googleDisponible = Platform.OS === "web";

/**
 * La app instalada en la pantalla de inicio del iPhone no maneja bien las
 * ventanas emergentes: ahí se usa redirección, que se queda en la misma
 * ventana. En el navegador normal la ventana emergente es más rápida.
 */
function esAppInstalada(): boolean {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Inicia sesión con una cuenta de Google personal. Si es la primera vez, el
 * perfil de residente lo crea el estado de la app al detectar la sesión (ver
 * crearPerfilGoogle), así funciona igual con ventana emergente o redirección.
 */
export async function iniciarSesionConGoogle(): Promise<void> {
  const proveedor = new GoogleAuthProvider();
  // Siempre deja elegir la cuenta, por si el teléfono tiene varias.
  proveedor.setCustomParameters({ prompt: "select_account" });

  if (esAppInstalada()) {
    await signInWithRedirect(auth, proveedor);
    return;
  }
  try {
    await signInWithPopup(auth, proveedor);
  } catch (error) {
    // Si el navegador bloqueó la ventana emergente, se intenta por redirección.
    if ((error as { code?: string })?.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, proveedor);
      return;
    }
    throw error;
  }
}

/**
 * Al volver de una redirección de Google, entrega el error si lo hubo. El
 * éxito no necesita manejo aparte: lo detecta escucharSesion como cualquier
 * otro inicio de sesión.
 */
export async function errorDeRedireccionGoogle(): Promise<unknown | null> {
  if (!googleDisponible) return null;
  try {
    await getRedirectResult(auth);
    return null;
  } catch (error) {
    return error;
  }
}

/** true si la sesión activa entró con Google (y por lo tanto no tiene contraseña propia). */
export function entroConGoogle(usuario: User | null = auth.currentUser): boolean {
  return !!usuario?.providerData.some((p) => p.providerId === "google.com");
}

/** true si la cuenta tiene contraseña de EcoTrack que se pueda cambiar. */
export function tieneContrasena(): boolean {
  return !!auth.currentUser?.providerData.some((p) => p.providerId === "password");
}

/**
 * Primer ingreso con Google: crea el perfil siempre como residente, con el
 * nombre y correo de la cuenta de Google. La torre y el departamento se piden
 * después, en la misma pantalla de vinculación que usa el registro normal.
 */
export async function crearPerfilGoogle(usuario: User): Promise<void> {
  await setDoc(doc(db, "usuarios", usuario.uid), {
    nombre: usuario.displayName?.trim() || usuario.email?.split("@")[0] || "Residente",
    email: (usuario.email ?? "").toLowerCase(),
    rol: "residente",
    depto: "",
    torreId: null,
    torreNombre: null,
    proveedor: "google",
    creadoEn: Date.now(),
  });
}

export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}

export async function vincularTorreAlPerfil(
  uid: string,
  torreId: string,
  torreNombre: string,
  depto: string
): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { torreId, torreNombre, depto });
}

/** Marca como vistos todos los avisos hasta `hasta`. Es un campo del propio perfil. */
export async function marcarAvisosVistos(uid: string, hasta: number): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { avisosVistosHasta: hasta });
}

/**
 * Actualiza los datos personales editables. El rol y la torre no se tocan desde
 * aquí: el rol lo protegen las reglas de Firestore y la torre se cambia con el
 * administrador.
 */
export async function actualizarPerfil(
  uid: string,
  datos: { nombre: string; depto?: string }
): Promise<void> {
  const cambios: { nombre: string; depto?: string } = { nombre: datos.nombre };
  if (datos.depto !== undefined) cambios.depto = datos.depto;

  await updateDoc(doc(db, "usuarios", uid), cambios);

  // El nombre también vive en Firebase Auth; si esa copia falla no se pierde el
  // cambio principal, que ya quedó en Firestore.
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: datos.nombre }).catch(() => undefined);
  }
}

/**
 * Cambia la contraseña. Firebase exige una sesión reciente para operaciones
 * sensibles, así que primero se vuelve a confirmar la contraseña actual.
 */
export async function cambiarContrasena(actual: string, nueva: string): Promise<void> {
  const usuario = auth.currentUser;
  if (!usuario || !usuario.email) throw new Error("No hay una sesión activa.");

  await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(usuario.email, actual));
  await updatePassword(usuario, nueva);
}

const MENSAJES: Record<string, string> = {
  "auth/invalid-email": "El correo no tiene un formato válido.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta en EcoTrack.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet e intenta de nuevo.",
  "auth/too-many-requests": "Demasiados intentos fallidos. Espera un momento.",
  "auth/operation-not-allowed":
    "Ese método de inicio de sesión no está habilitado en la consola de Firebase.",
  "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
  "auth/cancelled-popup-request": "Cerraste la ventana de Google antes de terminar.",
  "auth/unauthorized-domain":
    "Este sitio no está autorizado para iniciar sesión con Google. Agrégalo en Firebase → Authentication → Settings → Authorized domains.",
  "auth/account-exists-with-different-credential":
    "Ese correo ya tiene una cuenta en EcoTrack. Inicia sesión con tu contraseña.",
  "permission-denied": "No tienes permiso para realizar esta acción.",
  unavailable: "No se pudo contactar a Firestore. Revisa tu conexión.",
};

/** Traduce un error de Firebase a un mensaje legible en español. */
export function mensajeError(error: unknown): string {
  const codigo = (error as { code?: string })?.code ?? "";
  if (MENSAJES[codigo]) return MENSAJES[codigo];
  if (error instanceof Error && error.message) return error.message;
  return "No pudimos completar la operación. Intenta de nuevo.";
}
