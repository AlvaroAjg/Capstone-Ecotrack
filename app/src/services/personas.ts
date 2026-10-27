import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
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
 * Nombra a una persona de la planta validador titular o suplente. Sigue en su
 * área. Quien ocupaba ese puesto (`anterior`) vuelve a colaborador en el mismo
 * lote: así nunca quedan dos titulares ni dos suplentes. Nadie más puede
 * cambiar un rol, y a administrador no se llega por aquí (ver
 * promoverAAdministrador).
 */
export async function nombrarValidador(
  persona: Usuario,
  puesto: "titular" | "suplente",
  anterior: Usuario | null
): Promise<void> {
  const lote = writeBatch(db);
  lote.update(doc(db, "usuarios", persona.id), { rol: "validador", suplente: puesto === "suplente" });
  if (anterior && anterior.id !== persona.id) {
    lote.update(doc(db, "usuarios", anterior.id), { rol: "colaborador", suplente: false });
  }
  await lote.commit();
}

/** Devuelve a un validador, titular o suplente, a colaborador. */
export async function devolverAColaborador(persona: Usuario): Promise<void> {
  await updateDoc(doc(db, "usuarios", persona.id), { rol: "colaborador", suplente: false });
}
