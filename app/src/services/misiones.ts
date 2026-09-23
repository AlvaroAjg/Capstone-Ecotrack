import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Mision } from "../lib/tipos";

function aMision(torreId: string, d: any): Mision {
  return {
    torreId,
    metaKg: d.metaKg ?? 0,
    incentivo: d.incentivo ?? "",
    actualizadaEn: d.actualizadaEn ?? 0,
    actualizadaPor: d.actualizadaPor ?? "",
  };
}

/**
 * Escucha la misión de una torre. `callback(null)` significa que esa torre
 * todavía no tiene una: la app cae de vuelta a la meta base de `Torre.metaKg`.
 */
export function escucharMision(
  torreId: string,
  callback: (mision: Mision | null) => void
) {
  return onSnapshot(doc(db, "misiones", torreId), (snap) => {
    callback(snap.exists() ? aMision(torreId, snap.data()) : null);
  });
}

/** Crea o reemplaza la misión de una torre. Solo el administrador de esa torre puede. */
export async function guardarMision(
  torreId: string,
  adminUid: string,
  datos: { metaKg: number; incentivo: string }
): Promise<void> {
  await setDoc(doc(db, "misiones", torreId), {
    metaKg: datos.metaKg,
    incentivo: datos.incentivo,
    actualizadaEn: Date.now(),
    actualizadaPor: adminUid,
  });
}
