import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Area } from "../lib/tipos";

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
