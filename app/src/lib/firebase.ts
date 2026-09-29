// Configuración de Firebase para EcoTrack.
//
// Nota: estas claves NO son secretas. El SDK Web de Firebase las expone en el
// cliente por diseño; la seguridad real vive en las reglas de Firestore
// (ver firestore.rules en la raíz del repositorio).
import { Platform } from "react-native";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Dominio que atiende el inicio de sesión con Google. En el sitio publicado se
 * usa el mismo dominio de la app (Firebase Hosting sirve /__/auth/ en él): así
 * Safari no bloquea la sesión por venir de otro sitio, que es lo que pasa en el
 * iPhone con firebaseapp.com. En localhost se mantiene el dominio por defecto.
 */
function dominioAuth(): string {
  const porDefecto = "ecotrack-capstone-3f12d.firebaseapp.com";
  if (Platform.OS !== "web") return porDefecto;
  try {
    const host = window.location.hostname;
    return host === "ecotrack-capstone-3f12d.web.app" ? host : porDefecto;
  } catch {
    return porDefecto;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyBmUuiyaDVYYldoKIOkCpacBCYYsnDvcxc",
  authDomain: dominioAuth(),
  projectId: "ecotrack-capstone-3f12d",
  storageBucket: "ecotrack-capstone-3f12d.firebasestorage.app",
  messagingSenderId: "30032741037",
  appId: "1:30032741037:web:a122c2d8b637b8e5c23c24",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// `getReactNativePersistence` cambió de ubicación entre versiones del SDK.
// Se resuelve en tiempo de ejecución para no romper con la versión instalada.
const getRNPersistence = (firebaseAuth as any).getReactNativePersistence;

function crearAuth() {
  // En web la persistencia por defecto (IndexedDB/localStorage) ya sirve.
  if (Platform.OS === "web") {
    return firebaseAuth.getAuth(app);
  }

  try {
    if (getRNPersistence) {
      // Persistencia en AsyncStorage: la sesión sobrevive al cierre de la app.
      return firebaseAuth.initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage),
      });
    }
    return firebaseAuth.initializeAuth(app);
  } catch {
    // Fast Refresh puede reejecutar este módulo; en ese caso Auth ya existe.
    return firebaseAuth.getAuth(app);
  }
}

function crearDb() {
  try {
    return initializeFirestore(app, {
      // Evita cortes de streaming detrás de proxies y en algunas redes móviles.
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const auth = crearAuth();
export const db = crearDb();
