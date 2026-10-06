import { Platform } from "react-native";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
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
import type { Area, Rol, Usuario } from "../lib/tipos";

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
        rol: (d.rol ?? "colaborador") as Rol,
        plantaId: d.plantaId ?? null,
        areaId: d.areaId ?? null,
        areaNombre: d.areaNombre ?? null,
        avisosVistosHasta: d.avisosVistosHasta ?? 0,
      });
    },
    () => callback(null)
  );
}

/**
 * Crea la cuenta con correo y contraseña. Todos nacen como colaboradores y sin
 * área: el área se elige después con su código, y validador o administrador se
 * llega por otro camino (ver promoverAAdministrador).
 */
export async function registrarCuenta(params: {
  nombre: string;
  email: string;
  password: string;
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const credencial = await createUserWithEmailAndPassword(auth, email, params.password);

  await updateProfile(credencial.user, { displayName: params.nombre });

  await setDoc(doc(db, "usuarios", credencial.user.uid), {
    nombre: params.nombre,
    email,
    rol: "colaborador",
    plantaId: null,
    areaId: null,
    areaNombre: null,
    creadoEn: Date.now(),
  });

  return credencial.user.uid;
}

/**
 * Promueve a un colaborador a administrador de una planta. Solo funciona si
 * `codigoRolUsado` coincide con el código de esa planta en `codigosRol`: la
 * regla de Firestore es quien realmente decide, esta función solo entrega los
 * datos. Si el código está mal, la escritura falla con "permission-denied".
 */
export async function promoverAAdministrador(
  uid: string,
  plantaId: string,
  codigoRolUsado: string
): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), {
    rol: "administrador",
    plantaId,
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

/** Cuentas externas con las que se puede entrar, además de correo y contraseña. */
export type ProveedorExterno = "google" | "microsoft";

export const NOMBRE_PROVEEDOR: Record<ProveedorExterno, string> = {
  google: "Google",
  microsoft: "Microsoft",
};

const ID_PROVEEDOR: Record<ProveedorExterno, string> = {
  google: "google.com",
  microsoft: "microsoft.com",
};

/**
 * Qué cuentas de Microsoft pueden entrar. "common" acepta las personales
 * (Outlook, Hotmail) y las de cualquier empresa con Microsoft 365. Para dejar
 * entrar solo a una organización, se reemplaza por su ID de inquilino
 * (tenant ID), que entrega su área de TI.
 */
const INQUILINO_MICROSOFT = "common";

/** Google y Microsoft solo están disponibles en la versión web (y la PWA instalada). */
export const accesoExternoDisponible = Platform.OS === "web";

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

function crearProveedor(cual: ProveedorExterno): GoogleAuthProvider | OAuthProvider {
  if (cual === "google") {
    const proveedor = new GoogleAuthProvider();
    // Siempre deja elegir la cuenta, por si el teléfono tiene varias.
    proveedor.setCustomParameters({ prompt: "select_account" });
    return proveedor;
  }
  const proveedor = new OAuthProvider(ID_PROVEEDOR.microsoft);
  proveedor.setCustomParameters({ prompt: "select_account", tenant: INQUILINO_MICROSOFT });
  return proveedor;
}

/**
 * Inicia sesión con una cuenta de Google o de Microsoft. Si es la primera vez,
 * el perfil de colaborador lo crea el estado de la app al detectar la sesión (ver
 * crearPerfilExterno), así funciona igual con ventana emergente o redirección.
 */
export async function iniciarSesionConProveedor(cual: ProveedorExterno): Promise<void> {
  const proveedor = crearProveedor(cual);

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
 * Al volver de una redirección de Google o Microsoft, entrega el error si lo
 * hubo. El éxito no necesita manejo aparte: lo detecta escucharSesion como
 * cualquier otro inicio de sesión.
 */
export async function errorDeRedireccionExterna(): Promise<unknown | null> {
  if (!accesoExternoDisponible) return null;
  try {
    await getRedirectResult(auth);
    return null;
  } catch (error) {
    return error;
  }
}

/** Con qué cuenta externa entró la sesión, o null si entró con correo y contraseña. */
export function proveedorExterno(
  usuario: User | null = auth.currentUser
): ProveedorExterno | null {
  const ids = usuario?.providerData.map((p) => p.providerId) ?? [];
  if (ids.includes(ID_PROVEEDOR.google)) return "google";
  if (ids.includes(ID_PROVEEDOR.microsoft)) return "microsoft";
  return null;
}

/** true si la cuenta tiene contraseña de EcoTrack que se pueda cambiar. */
export function tieneContrasena(): boolean {
  return !!auth.currentUser?.providerData.some((p) => p.providerId === "password");
}

/**
 * Primer ingreso con Google o Microsoft: crea el perfil siempre como
 * colaborador, con el nombre y correo de esa cuenta. El área se pide después,
 * en la misma pantalla que usa el registro normal.
 */
export async function crearPerfilExterno(
  usuario: User,
  proveedor: ProveedorExterno
): Promise<void> {
  // Algunas cuentas de empresa de Microsoft no entregan el correo en la sesión,
  // solo en los datos del proveedor.
  const email = usuario.email ?? usuario.providerData.find((p) => p.email)?.email ?? "";
  await setDoc(doc(db, "usuarios", usuario.uid), {
    nombre: usuario.displayName?.trim() || email.split("@")[0] || "Colaborador",
    email: email.toLowerCase(),
    rol: "colaborador",
    plantaId: null,
    areaId: null,
    areaNombre: null,
    proveedor,
    creadoEn: Date.now(),
  });
}

export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}

/**
 * Une al usuario a un área con su código. Solo se puede si todavía no tiene
 * una: cambiarse de área lo hace el administrador, así nadie infla la
 * participación de otra área (lo exigen las reglas).
 */
export async function unirseAArea(uid: string, area: Area): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), {
    plantaId: area.plantaId,
    areaId: area.id,
    areaNombre: area.nombre,
  });
}

/** Marca como vistos todos los avisos hasta `hasta`. Es un campo del propio perfil. */
export async function marcarAvisosVistos(uid: string, hasta: number): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { avisosVistosHasta: hasta });
}

/**
 * Actualiza el nombre, el único dato personal editable. El rol y el área no se
 * tocan desde aquí: los cambia el administrador, y las reglas de Firestore lo
 * exigen.
 */
export async function actualizarPerfil(uid: string, datos: { nombre: string }): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { nombre: datos.nombre });

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
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta en RecyTrack.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet e intenta de nuevo.",
  "auth/too-many-requests": "Demasiados intentos fallidos. Espera un momento.",
  "auth/operation-not-allowed":
    "Ese método de inicio de sesión no está habilitado en la consola de Firebase.",
  "auth/popup-closed-by-user": "Cerraste la ventana de inicio de sesión antes de terminar.",
  "auth/cancelled-popup-request": "Cerraste la ventana de inicio de sesión antes de terminar.",
  "auth/unauthorized-domain":
    "Este sitio no está autorizado para iniciar sesión con Google o Microsoft. Agrégalo en Firebase → Authentication → Settings → Authorized domains.",
  "auth/account-exists-with-different-credential":
    "Ese correo ya tiene una cuenta en RecyTrack. Entra de la misma forma que la primera vez (con tu contraseña, Google o Microsoft).",
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
