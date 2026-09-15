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

const firebaseConfig = {
  apiKey: "AIzaSyBmUuiyaDVYYldoKIOkCpacBCYYsnDvcxc",
  authDomain: "ecotrack-capstone-3f12d.firebaseapp.com",
  projectId: "ecotrack-capstone-3f12d",
  storageBucket: "ecotrack-capstone-3f12d.firebasestorage.app",
  messagingSenderId: "30032741037",
  appId: "1:30032741037:web:a122c2d8b637b8e5c23c24",
};

/**
 * La pared de demostración (demo/pared-app.html) monta la app tres veces en la
 * misma pestaña, una por rol, dentro de iframes con `?slot=residente|...`.
 *
 * Firebase Auth guarda la sesión web bajo una clave que incluye el nombre de la
 * app, así que dándole a cada panel su propia app con nombre propio las tres
 * sesiones conviven sin pisarse. En el teléfono esto no aplica: no hay slot y se
 * usa la app por defecto.
 */
function leerSlotDemo(): string | null {
  if (Platform.OS !== "web") return null;
  try {
    const slot = new URLSearchParams(window.location.search).get("slot");
    return slot && /^[a-z]+$/.test(slot) ? slot : null;
  } catch {
    return null;
  }
}

export const slotDemo = leerSlotDemo();

function crearApp() {
  if (slotDemo) {
    const nombre = `ecotrack-${slotDemo}`;
    return getApps().find((a) => a.name === nombre) ?? initializeApp(firebaseConfig, nombre);
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const app = crearApp();

// `getReactNativePersistence` cambió de ubicación entre versiones del SDK.
// Se resuelve en tiempo de ejecución para no romper con la versión instalada.
const getRNPersistence = (firebaseAuth as any).getReactNativePersistence;

function crearAuth() {
  // En web la persistencia por defecto (IndexedDB/localStorage) ya queda
  // separada por nombre de app, que es justo lo que necesita la pared.
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
