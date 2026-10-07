import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Area, Usuario } from "../lib/tipos";

function aArea(id: string, datos: any): Area {
  return {
    id,
    plantaId: datos.plantaId ?? "",
    nombre: datos.nombre ?? id,
    codigo: datos.codigo ?? "",
    dotacion: datos.dotacion ?? 0,
  };
}

/** Las áreas de una planta, en vivo, por nombre. Sirven para el ranking. */
export function escucharAreas(plantaId: string, callback: (areas: Area[]) => void) {
  const consulta = query(collection(db, "areas"), where("plantaId", "==", plantaId));
  return onSnapshot(consulta, (snap) => {
    const areas = snap.docs
      .map((d) => aArea(d.id, d.data()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    callback(areas);
  });
}

/** El área de un código para unirse (p. ej. `EMB-4821`), o null si no existe. */
export async function buscarAreaPorCodigo(codigo: string): Promise<Area | null> {
  const consulta = query(
    collection(db, "areas"),
    where("codigo", "==", codigo.trim().toUpperCase())
  );
  const snap = await getDocs(consulta);
  if (snap.empty) return null;
  const primera = snap.docs[0];
  return aArea(primera.id, primera.data());
}

export interface DatosArea {
  nombre: string;
  codigo: string;
  dotacion: number;
}

/** Crea un área de la planta. Solo lo puede hacer su administrador. */
export async function crearArea(plantaId: string, datos: DatosArea): Promise<string> {
  const ref = await addDoc(collection(db, "areas"), { plantaId, ...datos });
  return ref.id;
}

/**
 * Edita un área. Las personas guardan el nombre de su área (`areaNombre`) para
 * mostrarlo sin leer el área, así que si cambia el nombre se actualiza también
 * en sus perfiles. Va en un segundo paso y no en el mismo lote porque la regla
 * de usuarios compara `areaNombre` con el nombre que el área tiene ya guardado.
 */
export async function editarArea(area: Area, datos: DatosArea, personasDelArea: Usuario[]): Promise<void> {
  await updateDoc(doc(db, "areas", area.id), { ...datos });
  if (datos.nombre === area.nombre || personasDelArea.length === 0) return;
  const lote = writeBatch(db);
  for (const p of personasDelArea) {
    lote.update(doc(db, "usuarios", p.id), { areaNombre: datos.nombre });
  }
  await lote.commit();
}
