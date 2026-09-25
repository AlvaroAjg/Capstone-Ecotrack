import { addDoc, collection, doc, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Contaminante, Incidencia } from "../lib/tipos";

function aIncidencia(id: string, d: any): Incidencia {
  return {
    id,
    torreId: d.torreId ?? "",
    torreNombre: d.torreNombre ?? "",
    contenedor: d.contenedor ?? "",
    contenedorNombre: d.contenedorNombre ?? "",
    contaminante: d.contaminante as Contaminante,
    reportadoEn: d.reportadoEn ?? 0,
    reportadoPor: d.reportadoPor ?? "",
    atendida: d.atendida ?? false,
    atendidaEn: d.atendidaEn ?? null,
    codigoRetiro: d.codigoRetiro ?? null,
  };
}

function escuchar(consulta: ReturnType<typeof query>, callback: (i: Incidencia[]) => void) {
  return onSnapshot(consulta, (snap) =>
    callback(
      snap.docs
        .map((d) => aIncidencia(d.id, d.data()))
        .sort((a, b) => b.reportadoEn - a.reportadoEn)
    )
  );
}

/** Incidencias de una torre: las ven su administrador y sus residentes. */
export function escucharIncidenciasDeTorre(torreId: string, callback: (i: Incidencia[]) => void) {
  return escuchar(query(collection(db, "incidencias"), where("torreId", "==", torreId)), callback);
}

/** Las que el gestor todavía no retira, de todas las torres: son advertencias de seguridad. */
export function escucharIncidenciasPendientes(callback: (i: Incidencia[]) => void) {
  return escuchar(query(collection(db, "incidencias"), where("atendida", "==", false)), callback);
}

export async function reportarContaminacion(datos: {
  torreId: string;
  torreNombre: string;
  contenedor: string;
  contenedorNombre: string;
  contaminante: Contaminante;
  adminUid: string;
}): Promise<void> {
  await addDoc(collection(db, "incidencias"), {
    torreId: datos.torreId,
    torreNombre: datos.torreNombre,
    contenedor: datos.contenedor,
    contenedorNombre: datos.contenedorNombre,
    contaminante: datos.contaminante,
    reportadoEn: Date.now(),
    reportadoPor: datos.adminUid,
    atendida: false,
    atendidaEn: null,
    codigoRetiro: null,
  });
}

/** Al confirmar el retiro de una torre, sus advertencias quedan atendidas con ese retiro. */
export async function marcarAtendidas(
  incidencias: Incidencia[],
  codigoRetiro: string
): Promise<void> {
  if (incidencias.length === 0) return;
  const lote = writeBatch(db);
  const ahora = Date.now();
  for (const i of incidencias) {
    lote.update(doc(db, "incidencias", i.id), { atendida: true, atendidaEn: ahora, codigoRetiro });
  }
  await lote.commit();
}
