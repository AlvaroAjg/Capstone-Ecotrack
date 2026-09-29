// Reporte mensual de una torre, para el administrador.
//
// Resume el mes de la torre: kilos certificados, participación, depósitos por
// estado, departamentos que más reciclaron, contenedores contaminados y cuánto
// tarda la cadena. Los indicadores se comparan con las métricas de éxito del
// piloto (README): participación de al menos 60% y flujo completo, del
// depósito al certificado, en menos de 48 horas en promedio (se muestra
// además qué porcentaje de los depósitos lo logró).
//
// Igual que en el resto de la app, los kilos del mes son los certificados en
// ese mes (aunque el depósito sea del anterior) y la actividad (depósitos,
// participación) cuenta por la fecha del depósito. No lleva nombres de
// residentes: los departamentos aparecen solo por su número.

import { mesDe, etiquetaMes } from "./certificadoMensual";
import { porcentaje, sumaKg } from "./formato";
import {
  MATERIALES,
  kgEfectivo,
  type Incidencia,
  type Material,
  type Mision,
  type Registro,
  type Torre,
} from "./tipos";

const HORA = 60 * 60 * 1000;

/** Metas del piloto (README, "Métricas de éxito"). */
export const META_PARTICIPACION = 60;
export const META_HORAS_CADENA = 48;

export interface ReporteTorre {
  /** "2026-09" */
  mes: string;
  /** "septiembre de 2026" */
  etiqueta: string;
  torre: Torre;
  /** El mes todavía no termina: el reporte muestra el estado a la fecha. */
  enCurso: boolean;

  kgCertificados: number;
  porMaterial: { material: Material; kg: number; depositos: number }[];
  metaKg: number;
  avanceMeta: number;

  /** Depósitos hechos en el mes, según en qué quedaron. */
  depositos: {
    total: number;
    pendientes: number;
    validados: number;
    certificados: number;
    rechazados: number;
  };

  deptosActivos: number;
  deptosTotales: number;
  participacion: number;
  /** Departamentos por kilos certificados en el mes, de más a menos. */
  deptos: { depto: string; kg: number; depositos: number }[];

  /** Retiros del gestor en el mes (lotes distintos). */
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
 * Meses que se pueden reportar: el actual y todos en que la torre tuvo algún
 * depósito, certificado o reporte de contaminación, del más reciente al más
 * antiguo.
 */
export function mesesReportables(
  torreId: string,
  registros: Registro[],
  incidencias: Incidencia[],
  ahora: number = Date.now()
): string[] {
  const meses = new Set<string>([mesDe(ahora)]);
  for (const r of registros) {
    if (r.torreId !== torreId) continue;
    meses.add(mesDe(r.creadoEn));
    if (r.certificadoEn) meses.add(mesDe(r.certificadoEn));
  }
  for (const i of incidencias) {
    if (i.torreId === torreId) meses.add(mesDe(i.reportadoEn));
  }
  return Array.from(meses).sort().reverse();
}

export function reporteDeTorre(
  torre: Torre,
  mes: string,
  registros: Registro[],
  incidencias: Incidencia[],
  mision: Mision | null
): ReporteTorre {
  const deLaTorre = registros.filter((r) => r.torreId === torre.id);
  const delMes = deLaTorre.filter((r) => mesDe(r.creadoEn) === mes);
  const certificados = deLaTorre.filter(
    (r) => r.estado === "certificado" && r.certificadoEn !== null && mesDe(r.certificadoEn) === mes
  );

  const kgCertificados = sumaKg(certificados.map(kgEfectivo));
  const porMaterial = MATERIALES.map(({ nombre }) => {
    const deEste = certificados.filter((r) => r.material === nombre);
    return { material: nombre, kg: sumaKg(deEste.map(kgEfectivo)), depositos: deEste.length };
  }).filter((m) => m.depositos > 0);

  // La meta de la misión es la vigente: no se guarda un historial de metas.
  const metaKg = mision && mision.torreId === torre.id ? mision.metaKg : torre.metaKg;

  const cuenta = (estado: Registro["estado"]) => delMes.filter((r) => r.estado === estado).length;

  const activos = new Set(
    delMes.filter((r) => r.estado !== "rechazado" && r.depto).map((r) => r.depto)
  );

  const porDepto = new Map<string, Registro[]>();
  for (const r of certificados) {
    if (!r.depto) continue;
    porDepto.set(r.depto, [...(porDepto.get(r.depto) ?? []), r]);
  }
  const deptos = Array.from(porDepto.entries())
    .map(([depto, lista]) => ({ depto, kg: sumaKg(lista.map(kgEfectivo)), depositos: lista.length }))
    .sort((a, b) => b.kg - a.kg || a.depto.localeCompare(b.depto, "es"));

  const conFechas = certificados.filter((r) => r.validadoEn !== null && r.certificadoEn !== null);
  const cadena = conFechas.map((r) => r.certificadoEn! - r.creadoEn);

  return {
    mes,
    etiqueta: etiquetaMes(mes),
    torre,
    enCurso: mes === mesDe(Date.now()),
    kgCertificados,
    porMaterial,
    metaKg,
    avanceMeta: porcentaje(kgCertificados, metaKg),
    depositos: {
      total: delMes.length,
      pendientes: cuenta("pendiente"),
      validados: cuenta("validado"),
      certificados: cuenta("certificado"),
      rechazados: cuenta("rechazado"),
    },
    deptosActivos: activos.size,
    deptosTotales: torre.deptosTotales,
    participacion: porcentaje(activos.size, torre.deptosTotales),
    deptos,
    retiros: new Set(certificados.map((r) => r.codigoRetiro).filter(Boolean)).size,
    horasHastaValidacion: promedioHoras(conFechas.map((r) => r.validadoEn! - r.creadoEn)),
    horasHastaRetiro: promedioHoras(conFechas.map((r) => r.certificadoEn! - r.validadoEn!)),
    horasCadena: promedioHoras(cadena),
    dentroDe48h:
      cadena.length === 0
        ? null
        : porcentaje(cadena.filter((d) => d < META_HORAS_CADENA * HORA).length, cadena.length),
    contaminaciones: incidencias
      .filter((i) => i.torreId === torre.id && mesDe(i.reportadoEn) === mes)
      .sort((a, b) => a.reportadoEn - b.reportadoEn),
  };
}
