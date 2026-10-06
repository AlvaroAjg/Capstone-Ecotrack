import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Planta } from "../lib/tipos";

function aPlanta(id: string, datos: any): Planta {
  return {
    id,
    nombre: datos.nombre ?? id,
    empresa: datos.empresa ?? "",
  };
}

/**
 * Las plantas, en vivo. Para el piloto hay una sola, pero el modelo admite
 * varias. Se crean en la consola de Firebase, nunca desde la app.
 */
export function escucharPlantas(callback: (plantas: Planta[]) => void) {
  return onSnapshot(collection(db, "plantas"), (snap) => {
    const plantas = snap.docs
      .map((d) => aPlanta(d.id, d.data()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    callback(plantas);
  });
}
