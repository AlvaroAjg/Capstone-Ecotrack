import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { Rol, Usuario } from "../lib/tipos";

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
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const credencial = await createUserWithEmailAndPassword(auth, email, params.password);

  await updateProfile(credencial.user, { displayName: params.nombre });

  await setDoc(doc(db, "usuarios", credencial.user.uid), {
    nombre: params.nombre,
    email,
    rol: params.rol,
    depto: params.depto,
    torreId: null,
    torreNombre: null,
    creadoEn: Date.now(),
  });

  return credencial.user.uid;
}

export async function iniciarSesion(email: string, password: string): Promise<string> {
  const credencial = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  return credencial.user.uid;
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
    "El inicio de sesión con correo no está habilitado en la consola de Firebase.",
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
