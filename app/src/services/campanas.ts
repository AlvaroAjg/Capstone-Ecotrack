import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Campana } from "../lib/tipos";

function aCampana(plantaId: string, d: any): Campana {
  return {
    plantaId,
    nombre: d.nombre ?? "",
    metaParticipacion: d.metaParticipacion ?? 0,
    incentivo: d.incentivo ?? "",
    terminaEn: d.terminaEn ?? 0,
    actualizadaEn: d.actualizadaEn ?? 0,
    actualizadaPor: d.actualizadaPor ?? "",
  };
}

/**
 * Escucha la campaña de una planta. `callback(null)` significa que todavía no
 * tiene una: la app no muestra incentivo.
 */
export function escucharCampana(
  plantaId: string,
  callback: (campana: Campana | null) => void
) {
  return onSnapshot(doc(db, "campanas", plantaId), (snap) => {
    callback(snap.exists() ? aCampana(plantaId, snap.data()) : null);
  });
}

/** Crea o reemplaza la campaña de una planta. Solo el administrador de esa planta puede. */
export async function guardarCampana(
  plantaId: string,
  adminUid: string,
  datos: { nombre: string; metaParticipacion: number; incentivo: string; terminaEn: number }
): Promise<void> {
  await setDoc(doc(db, "campanas", plantaId), {
    nombre: datos.nombre,
    metaParticipacion: datos.metaParticipacion,
    incentivo: datos.incentivo,
    terminaEn: datos.terminaEn,
    actualizadaEn: Date.now(),
    actualizadaPor: adminUid,
  });
}
