import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { idResumen } from "../lib/resumenMes";
import type { ResumenMes } from "../lib/tipos";

/**
 * Escucha el resumen de una planta en un mes: lo que lleva cada área. Lo suma
 * cada colaborador al depositar (ver crearRegistro en registros.ts).
 * `callback(null)` significa que ese mes todavía nadie ha depositado.
 */
export function escucharResumen(
  plantaId: string,
  mes: string,
  callback: (resumen: ResumenMes | null) => void
) {
  return onSnapshot(doc(db, "resumenes", idResumen(plantaId, mes)), (snap) => {
    if (!snap.exists()) return callback(null);
    const d = snap.data();
    callback({
      plantaId: d.plantaId ?? plantaId,
      mes: d.mes ?? mes,
      areas: d.areas ?? {},
      ultimoRegistro: d.ultimoRegistro ?? "",
    });
  });
}
