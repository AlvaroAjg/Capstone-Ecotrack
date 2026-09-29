// Cálculos derivados de los registros: resumen de torre, ranking, EcoPuntos
// por torre y lotes del gestor. Son funciones puras (sin React ni Firestore)
// para poder probarlas; el estado de la app (state/EcoTrack.tsx) solo las
// memoriza.

import { esDelMesActual, porcentaje, sumaKg } from "./formato";
import { puntosDelMes } from "./misionesSistema";
import {
  kgEfectivo,
  type FilaRanking,
  type LoteRetiro,
  type Material,
  type Mision,
  type Registro,
  type ResumenTorre,
  type Torre,
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
 * Métricas reales de una torre, calculadas solo con datos de Firestore.
 * No hay valores base ni pisos artificiales: si la torre no ha certificado
 * nada este mes, el contador muestra 0.
 *
 * `mision` es la de la torre del usuario actual (la única que se escucha): si
 * es de esta torre, su meta reemplaza la meta base sembrada en Torre.metaKg.
 */
export function resumenDeTorre(
  torreId: string | null,
  torres: Torre[],
  registros: Registro[],
  mision: Mision | null
): ResumenTorre {
  const torre = torres.find((t) => t.id === torreId) ?? null;
  const deLaTorre = registros.filter((r) => r.torreId === torreId);

  const certificadosDelMes = deLaTorre.filter(
    (r) => r.estado === "certificado" && esDelMesActual(r.certificadoEn)
  );
  const kgMes = sumaKg(certificadosDelMes.map(kgEfectivo));

  const deptosActivos = new Set(
    deLaTorre
      .filter((r) => r.estado !== "rechazado" && esDelMesActual(r.creadoEn))
      .map((r) => r.depto)
      .filter(Boolean)
  );

  const deptosTotales = torre?.deptosTotales ?? 0;
  const metaKg = mision && mision.torreId === torreId ? mision.metaKg : torre?.metaKg ?? 0;

  return {
    torre,
    deptosActivos: deptosActivos.size,
    deptosTotales,
    kgMes,
    participacion: porcentaje(deptosActivos.size, deptosTotales),
    metaKg,
    avanceMeta: porcentaje(kgMes, metaKg),
    pendientes: deLaTorre.filter((r) => r.estado === "pendiente"),
  };
}

/**
 * EcoPuntos del mes por torre: la suma de los de cada residente, calculados
 * igual que los propios (misión semanal con sus depósitos no rechazados).
 */
export function ecoPuntosPorTorre(registros: Registro[]): Map<string, number> {
  const porResidente = new Map<string, { torreId: string; registros: Registro[] }>();
  for (const r of registros) {
    const entrada = porResidente.get(r.residenteId) ?? { torreId: r.torreId, registros: [] };
    entrada.registros.push(r);
    porResidente.set(r.residenteId, entrada);
  }

  const totales = new Map<string, number>();
  for (const { torreId, registros: suyos } of porResidente.values()) {
    totales.set(torreId, (totales.get(torreId) ?? 0) + puntosDelMes(suyos));
  }
  return totales;
}

/** Ranking del mes: todas las torres, de más a menos kilos certificados. */
export function rankingDeTorres(
  torres: Torre[],
  registros: Registro[],
  mision: Mision | null,
  miTorreId: string | null
): FilaRanking[] {
  const puntos = ecoPuntosPorTorre(registros);
  return torres
    .map((torre) => {
      const resumen = resumenDeTorre(torre.id, torres, registros, mision);
      return {
        torreId: torre.id,
        nombre: torre.nombre,
        condominio: torre.condominio,
        kg: resumen.kgMes,
        participacion: resumen.participacion,
        ecoPuntos: puntos.get(torre.id) ?? 0,
        esMiTorre: torre.id === miTorreId,
      };
    })
    .sort((a, b) => b.kg - a.kg);
}

/**
 * Lo que ve el gestor: un lote por torre, no depósitos individuales.
 * Refleja la operación real (se retira el contenedor de una torre) y de paso
 * evita exponerle los nombres de los residentes. El que espera hace más
 * tiempo va primero.
 */
export function lotesPorRetirar(registros: Registro[], torres: Torre[]): LoteRetiro[] {
  const porTorre = new Map<string, Registro[]>();
  for (const r of registros) {
    if (r.estado !== "validado") continue;
    const lista = porTorre.get(r.torreId) ?? [];
    lista.push(r);
    porTorre.set(r.torreId, lista);
  }

  return Array.from(porTorre.entries())
    .map(([torreId, lista]) => {
      const torre = torres.find((t) => t.id === torreId) ?? null;

      const acumulado = new Map<Material, number>();
      for (const r of lista) {
        acumulado.set(r.material, (acumulado.get(r.material) ?? 0) + kgEfectivo(r));
      }

      return {
        torreId,
        torreNombre: torre?.nombre ?? lista[0].torreNombre ?? torreId,
        condominio: torre?.condominio ?? "",
        registros: lista,
        kgTotal: sumaKg(lista.map(kgEfectivo)),
        depositos: lista.length,
        porMaterial: Array.from(acumulado.entries())
          .map(([material, kg]) => ({ material, kg: Math.round(kg * 10) / 10 }))
          .sort((a, b) => b.kg - a.kg),
        esperandoDesde: Math.min(...lista.map((r) => r.validadoEn ?? r.creadoEn)),
      };
    })
    .sort((a, b) => a.esperandoDesde - b.esperandoDesde);
}
