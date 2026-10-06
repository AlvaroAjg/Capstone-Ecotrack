// Cálculos derivados de los datos de la planta: ranking de áreas y
// contenedores listos para retiro. Son funciones puras (sin React ni
// Firestore) para poder probarlas; el estado de la app (state/EcoTrack.tsx)
// solo las memoriza.

import { porcentaje, sumaKg } from "./formato";
import {
  kgEfectivo,
  type Area,
  type Contenedor,
  type ContenedorPorRetirar,
  type FilaRanking,
  type Registro,
  type ResumenMes,
} from "./tipos";

/**
 * Une los resultados de varias consultas de registros: sin repetidos (un
 * depósito puede venir en más de una) y del más reciente al más antiguo.
 */
export function unirRegistros(listas: Registro[][]): Registro[] {
  const porId = new Map<string, Registro>();
  for (const lista of listas) for (const r of lista) porId.set(r.id, r);
  return Array.from(porId.values()).sort((a, b) => b.creadoEn - a.creadoEn);
}

/**
 * Ranking del mes: todas las áreas de la planta, de más a menos
 * participación (participantes ÷ dotación). Se ordena por participación y no
 * por kilos, porque los kilos son estimados y un área grande ganaría siempre.
 * A igual participación, va primero la que tiene más depósitos.
 *
 * Sale del resumen del mes (ver crearRegistro en services/registros.ts), así
 * que no necesita los depósitos de nadie. Sin resumen, todas quedan en 0.
 */
export function rankingDeAreas(
  areas: Area[],
  resumen: ResumenMes | null,
  miAreaId: string | null
): FilaRanking[] {
  return areas
    .map((area) => {
      const conteo = resumen?.areas[area.id];
      const participantes = conteo?.participantes ?? 0;
      return {
        areaId: area.id,
        nombre: area.nombre,
        dotacion: area.dotacion,
        participantes,
        depositos: conteo?.depositos ?? 0,
        participacion: porcentaje(participantes, area.dotacion),
        esMiArea: area.id === miAreaId,
      };
    })
    .sort(
      (a, b) =>
        b.participacion - a.participacion ||
        b.depositos - a.depositos ||
        a.nombre.localeCompare(b.nombre, "es")
    );
}

/**
 * Lo que espera retiro: un grupo por contenedor con sus depósitos validados,
 * no depósitos sueltos. Refleja la operación real (se retira lo que hay en el
 * contenedor) y no expone quién hizo cada depósito. El que espera hace más
 * tiempo va primero.
 */
export function contenedoresPorRetirar(
  registros: Registro[],
  contenedores: Contenedor[]
): ContenedorPorRetirar[] {
  const porContenedor = new Map<string, Registro[]>();
  for (const r of registros) {
    if (r.estado !== "validado") continue;
    porContenedor.set(r.contenedor, [...(porContenedor.get(r.contenedor) ?? []), r]);
  }

  return Array.from(porContenedor.entries())
    .map(([codigo, lista]) => {
      // Puede no estar en la lista si se borró a mano en la consola: igual
      // hay que poder retirar lo que tiene.
      const datos = contenedores.find((c) => c.codigo === codigo);
      return {
        contenedor: codigo,
        punto: datos?.punto ?? "",
        material: datos?.material ?? null,
        registros: lista,
        depositos: lista.length,
        kgEstimado: sumaKg(lista.map(kgEfectivo)),
        esperandoDesde: Math.min(...lista.map((r) => r.validadoEn ?? r.creadoEn)),
      };
    })
    .sort((a, b) => a.esperandoDesde - b.esperandoDesde);
}
