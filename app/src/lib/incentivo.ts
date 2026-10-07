// Cálculos de la sección Incentivo del panel: leer el formulario de la
// campaña y ver cómo va cada área frente a la meta. Son funciones puras para
// poder probarlas.

import type { FilaRanking } from "./tipos";

/**
 * Lee una fecha escrita como «30-10-2026» o «30/10/2026» y devuelve el último
 * instante de ese día, en hora local: una campaña que «termina el 30» vale
 * todo el 30. null si la fecha no existe (p. ej. 31-02-2026).
 */
export function leerFechaTermino(texto: string): number | null {
  const partes = texto.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!partes) return null;
  const [dia, mes, anio] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, dia, 23, 59, 59, 999);
  if (fecha.getDate() !== dia || fecha.getMonth() !== mes - 1) return null;
  return fecha.getTime();
}

/** «30-10-2026», para mostrar en el formulario una fecha ya guardada. */
export function textoFecha(instante: number): string {
  const f = new Date(instante);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(f.getDate())}-${dos(f.getMonth() + 1)}-${f.getFullYear()}`;
}

export interface DatosCampana {
  nombre: string;
  metaParticipacion: number;
  incentivo: string;
  terminaEn: number;
}

/**
 * Revisa el formulario de la campaña con los mismos límites que la regla de
 * Firestore, para avisar antes de guardar. Devuelve los datos listos o el
 * error que hay que mostrar.
 */
export function validarCampana(
  formulario: { nombre: string; meta: string; incentivo: string; termina: string },
  ahora: number = Date.now()
): { ok: true; datos: DatosCampana } | { ok: false; error: string } {
  const nombre = formulario.nombre.trim();
  const incentivo = formulario.incentivo.trim();
  const meta = Number(formulario.meta);
  const terminaEn = leerFechaTermino(formulario.termina);

  if (!nombre || nombre.length > 80) {
    return { ok: false, error: "Escribe un nombre de hasta 80 caracteres." };
  }
  if (!Number.isInteger(meta) || meta < 1 || meta > 100) {
    return { ok: false, error: "La meta es un porcentaje de participación entre 1 y 100." };
  }
  if (!incentivo || incentivo.length > 200) {
    return { ok: false, error: "Escribe el incentivo, en hasta 200 caracteres." };
  }
  if (terminaEn === null) return { ok: false, error: "Escribe la fecha de término como 30-10-2026." };
  if (terminaEn < ahora) return { ok: false, error: "La fecha de término ya pasó." };
  return { ok: true, datos: { nombre, metaParticipacion: meta, incentivo, terminaEn } };
}

export interface AvanceArea {
  areaId: string;
  nombre: string;
  participacion: number;
  /** Puntos de participación que le faltan; 0 si ya llegó a la meta. */
  faltan: number;
  cumple: boolean;
}

/** Cómo va cada área frente a la meta, en el orden del ranking. */
export function avanceAreas(meta: number, ranking: FilaRanking[]): AvanceArea[] {
  return ranking.map((f) => {
    const faltan = Math.max(0, meta - f.participacion);
    return {
      areaId: f.areaId,
      nombre: f.nombre,
      participacion: f.participacion,
      faltan,
      cumple: faltan === 0,
    };
  });
}
