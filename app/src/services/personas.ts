import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Usuario } from "../lib/tipos";
import { aUsuario } from "./auth";

/**
 * Las personas de una planta, en vivo. Solo la usa el panel: las reglas dejan
 * leer los perfiles de la planta únicamente a su administrador.
 */
export function escucharPersonas(plantaId: string, callback: (personas: Usuario[]) => void) {
  const consulta = query(collection(db, "usuarios"), where("plantaId", "==", plantaId));
  return onSnapshot(consulta, (snap) => callback(snap.docs.map((d) => aUsuario(d.id, d.data()))));
}
