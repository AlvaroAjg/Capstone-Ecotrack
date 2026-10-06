// Reporte mensual de una planta, para el administrador.
//
// Resume el mes de la planta: kilos certificados, participación, depósitos por
// estado, áreas que más reciclaron, contenedores contaminados y cuánto tarda
// la cadena. Los indicadores se comparan con las métricas de éxito del
// piloto (README): participación de al menos 60% y flujo completo, del
// depósito al certificado, en menos de 48 horas en promedio (se muestra
// además qué porcentaje de los depósitos lo logró).
//
// Igual que en el resto de la app, los kilos del mes son los certificados en
// ese mes (aunque el depósito sea del anterior) y la actividad (depósitos,
// participación) cuenta por la fecha del depósito. No lleva nombres de
// personas: solo totales por área.

import { mesDe, etiquetaMes } from "./certificadoMensual";
import { porcentaje, sumaKg } from "./formato";
import {
  MATERIALES,
  kgEfectivo,
  type Area,
  type Incidencia,
  type Material,
  type Planta,
  type Registro,
} from "./tipos";

const HORA = 60 * 60 * 1000;

/** Metas del piloto (README, "Métricas de éxito"). */
export const META_PARTICIPACION = 60;
export const META_HORAS_CADENA = 48;

export interface ReportePlanta {
  /** "2026-09" */
  mes: string;
  /** "septiembre de 2026" */
  etiqueta: string;
  planta: Planta;
  /** El mes todavía no termina: el reporte muestra el estado a la fecha. */
  enCurso: boolean;

  kgCertificados: number;
  porMaterial: { material: Material; kg: number; depositos: number }[];

  /** Depósitos hechos en el mes, según en qué quedaron. */
  depositos: {
    total: number;
    pendientes: number;
    validados: number;
    certificados: number;
    rechazados: number;
  };

  /** Personas distintas con algún depósito del mes que no fue rechazado. */
  participantes: number;
  /** Suma de la dotación de las áreas: cuántas personas podrían participar. */
  dotacion: number;
  participacion: number;
  /** Áreas por kilos certificados en el mes, de más a menos. */
  areas: { area: string; kg: number; depositos: number }[];

  /** Retiros distintos en que salió lo certificado en el mes. */
  retiros: number;
  /** Promedios en horas, sobre los depósitos certificados en el mes; null si no hay. */
  horasHastaValidacion: number | null;
  horasHastaRetiro: number | null;
  horasCadena: number | null;
  /** % de esos depósitos que completaron la cadena en menos de 48 horas. */
  dentroDe48h: number | null;

  /** Contenedores reportados como contaminados en el mes, del más antiguo al más reciente. */
  contaminaciones: Incidencia[];
}

function promedioHoras(duraciones: number[]): number | null {
  if (duraciones.length === 0) return null;
  const promedio = duraciones.reduce((t, d) => t + d, 0) / duraciones.length / HORA;
  return Math.round(promedio * 10) / 10;
}

/**
 * Meses que se pueden reportar: el actual y todos en que la planta tuvo algún
 * depósito, certificado o reporte de contaminación, del más reciente al más
 * antiguo.
 */
export function mesesReportables(
  plantaId: string,
  registros: Registro[],
  incidencias: Incidencia[],
  ahora: number = Date.now()
): string[] {
  const meses = new Set<string>([mesDe(ahora)]);
  for (const r of registros) {
    if (r.plantaId !== plantaId) continue;
    meses.add(mesDe(r.creadoEn));
    if (r.certificadoEn) meses.add(mesDe(r.certificadoEn));
  }
  for (const i of incidencias) {
    if (i.plantaId === plantaId) meses.add(mesDe(i.reportadoEn));
  }
  return Array.from(meses).sort().reverse();
}

export function reporteDePlanta(
  planta: Planta,
  areas: Area[],
  mes: string,
  registros: Registro[],
  incidencias: Incidencia[]
): ReportePlanta {
  const deLaPlanta = registros.filter((r) => r.plantaId === planta.id);
  const delMes = deLaPlanta.filter((r) => mesDe(r.creadoEn) === mes);
  const certificados = deLaPlanta.filter(
    (r) => r.estado === "certificado" && r.certificadoEn !== null && mesDe(r.certificadoEn) === mes
  );

  const kgCertificados = sumaKg(certificados.map(kgEfectivo));
  const porMaterial = MATERIALES.map(({ nombre }) => {
    const deEste = certificados.filter((r) => r.material === nombre);
    return { material: nombre, kg: sumaKg(deEste.map(kgEfectivo)), depositos: deEste.length };
  }).filter((m) => m.depositos > 0);

  const cuenta = (estado: Registro["estado"]) => delMes.filter((r) => r.estado === estado).length;

  const activos = new Set(
    delMes.filter((r) => r.estado !== "rechazado").map((r) => r.colaboradorId)
  );
  const dotacion = areas.reduce((total, a) => total + a.dotacion, 0);

  const porArea = new Map<string, Registro[]>();
  for (const r of certificados) {
    porArea.set(r.areaId, [...(porArea.get(r.areaId) ?? []), r]);
  }
  const filasAreas = Array.from(porArea.entries())
    .map(([areaId, lista]) => ({
      // Si el área ya no existe, se muestra su id antes que perder sus kilos.
      area: areas.find((a) => a.id === areaId)?.nombre ?? areaId,
      kg: sumaKg(lista.map(kgEfectivo)),
      depositos: lista.length,
    }))
    .sort((a, b) => b.kg - a.kg || a.area.localeCompare(b.area, "es"));

  const conFechas = certificados.filter((r) => r.validadoEn !== null && r.certificadoEn !== null);
  const cadena = conFechas.map((r) => r.certificadoEn! - r.creadoEn);

  return {
    mes,
    etiqueta: etiquetaMes(mes),
    planta,
    enCurso: mes === mesDe(Date.now()),
    kgCertificados,
    porMaterial,
    depositos: {
      total: delMes.length,
      pendientes: cuenta("pendiente"),
      validados: cuenta("validado"),
      certificados: cuenta("certificado"),
      rechazados: cuenta("rechazado"),
    },
    participantes: activos.size,
    dotacion,
    participacion: porcentaje(activos.size, dotacion),
    areas: filasAreas,
    retiros: new Set(certificados.map((r) => r.retiroId).filter(Boolean)).size,
    horasHastaValidacion: promedioHoras(conFechas.map((r) => r.validadoEn! - r.creadoEn)),
    horasHastaRetiro: promedioHoras(conFechas.map((r) => r.certificadoEn! - r.validadoEn!)),
    horasCadena: promedioHoras(cadena),
    dentroDe48h:
      cadena.length === 0
        ? null
        : porcentaje(cadena.filter((d) => d < META_HORAS_CADENA * HORA).length, cadena.length),
    contaminaciones: incidencias
      .filter((i) => i.plantaId === planta.id && mesDe(i.reportadoEn) === mes)
      .sort((a, b) => a.reportadoEn - b.reportadoEn),
  };
}
