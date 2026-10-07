import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Area, Usuario } from "../lib/tipos";
import { aUsuario } from "./auth";

/**
 * Las personas de una planta, en vivo. Solo la usa el panel: las reglas dejan
 * leer los perfiles de la planta únicamente a su administrador.
 */
export function escucharPersonas(plantaId: string, callback: (personas: Usuario[]) => void) {
  const consulta = query(collection(db, "usuarios"), where("plantaId", "==", plantaId));
  return onSnapshot(consulta, (snap) => callback(snap.docs.map((d) => aUsuario(d.id, d.data()))));
}

/**
 * Cambia a una persona de área. Lo hace el administrador: si cada quien
 * pudiera, se pasaría al área que va perdiendo para inflarle la participación.
 */
export async function cambiarArea(persona: Usuario, area: Area): Promise<void> {
  await updateDoc(doc(db, "usuarios", persona.id), { areaId: area.id, areaNombre: area.nombre });
}

/**
 * Nombra validadora a una persona de la planta o la devuelve a colaboradora.
 * Sigue en su área. Nadie más puede cambiar un rol, y a administrador no se
 * llega por aquí (ver promoverAAdministrador).
 */
export async function cambiarRol(persona: Usuario, rol: "colaborador" | "validador"): Promise<void> {
  await updateDoc(doc(db, "usuarios", persona.id), { rol });
}
