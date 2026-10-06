import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Contaminante, Incidencia } from "../lib/tipos";

function aIncidencia(id: string, d: any): Incidencia {
  return {
    id,
    plantaId: d.plantaId ?? "",
    contenedor: d.contenedor ?? "",
    contenedorNombre: d.contenedorNombre ?? "",
    contaminante: d.contaminante as Contaminante,
    reportadoEn: d.reportadoEn ?? 0,
    reportadoPor: d.reportadoPor ?? "",
    atendida: d.atendida ?? false,
    atendidaEn: d.atendidaEn ?? null,
    retiroId: d.retiroId ?? null,
  };
}

/**
 * Incidencias de una planta, de la más reciente a la más antigua. Las ven
 * todos sus usuarios: al colaborador le sirven de aviso (educación) y al
 * administrador, de advertencia antes de registrar el retiro.
 */
export function escucharIncidencias(plantaId: string, callback: (i: Incidencia[]) => void) {
  const consulta = query(collection(db, "incidencias"), where("plantaId", "==", plantaId));
  return onSnapshot(consulta, (snap) =>
    callback(
      snap.docs
        .map((d) => aIncidencia(d.id, d.data()))
        .sort((a, b) => b.reportadoEn - a.reportadoEn)
    )
  );
}

export interface DatosReporte {
  plantaId: string;
  contenedor: string;
  contenedorNombre: string;
  contaminante: Contaminante;
  /** Validador o administrador que encontró el contenedor contaminado. */
  reportadoPor: string;
}

/**
 * Agrega el reporte de un contenedor contaminado a un lote. Va en el mismo
 * writeBatch que valida los depósitos de ese contenedor (ver
 * validarRegistros): o quedan el reporte y la validación, o ninguno. Se marca
 * como atendida al registrar el retiro de ese contenedor (ver retiros.ts).
 */
export function agregarReporte(lote: WriteBatch, datos: DatosReporte): void {
  lote.set(doc(collection(db, "incidencias")), {
    plantaId: datos.plantaId,
    contenedor: datos.contenedor,
    contenedorNombre: datos.contenedorNombre,
    contaminante: datos.contaminante,
    reportadoEn: Date.now(),
    reportadoPor: datos.reportadoPor,
    atendida: false,
    atendidaEn: null,
    retiroId: null,
  });
}
