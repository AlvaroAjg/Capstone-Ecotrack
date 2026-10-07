// Cálculos de la sección Resumen del panel del administrador: los
// indicadores del mes y la ronda de hoy por contenedor. Son funciones puras
// (sin React ni Firestore) para poder probarlas; el panel solo las memoriza.

import { porcentaje, sumaKg } from "./formato";
import {
  kgEfectivo,
  nombreContenedor,
  type Contenedor,
  type FilaRanking,
  type Incidencia,
  type Registro,
} from "./tipos";

/** Inicio del día local de `instante`. */
function inicioDelDia(instante: number): number {
  const f = new Date(instante);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
}

/** Inicio del mes local de `instante`. */
function inicioDelMes(instante: number): number {
  const f = new Date(instante);
  return new Date(f.getFullYear(), f.getMonth(), 1).getTime();
}

function esValidado(r: Registro): boolean {
  return r.estado === "validado" || r.estado === "certificado";
}

export interface IndicadoresMes {
  /** % de la dotación de la planta que recicló en el mes. */
  participacion: number;
  participantes: number;
  dotacion: number;
  /** Depósitos que el validador dejó conformes o con observación en el mes. */
  validados: number;
  /** Depósitos que esperan la ronda del validador. */
  porValidar: number;
  /** Kilos estimados de los depósitos validados en el mes. */
  kgEstimados: number;
  /** Días del mes en que el validador hizo su ronda. */
  rondas: number;
  /** Contenedores reportados con algo que no correspondía en el mes. */
  conObservacion: number;
}

/**
 * Indicadores del mes en curso para el Resumen. La participación sale del
 * ranking (el resumen del mes por área), igual que la ve cada colaborador.
 * Una ronda es un día en que el validador validó, rechazó o reportó algo: el
 * validador pasa una vez al día, así que contar días mide si la ronda se hizo.
 */
export function indicadoresDelMes(
  registros: Registro[],
  incidencias: Incidencia[],
  ranking: FilaRanking[],
  ahora: number = Date.now()
): IndicadoresMes {
  const desde = inicioDelMes(ahora);
  const delMes = (t: number | null): t is number => t !== null && t >= desde && t <= ahora;

  const validadosMes = registros.filter((r) => esValidado(r) && delMes(r.validadoEn));
  const incidenciasMes = incidencias.filter((i) => delMes(i.reportadoEn));

  const dias = new Set<number>();
  for (const r of registros) {
    if (r.estado !== "pendiente" && delMes(r.validadoEn)) dias.add(inicioDelDia(r.validadoEn));
  }
  for (const i of incidenciasMes) dias.add(inicioDelDia(i.reportadoEn));

  const participantes = ranking.reduce((t, f) => t + f.participantes, 0);
  const dotacion = ranking.reduce((t, f) => t + f.dotacion, 0);

  return {
    participacion: porcentaje(participantes, dotacion),
    participantes,
    dotacion,
    validados: validadosMes.length,
    porValidar: registros.filter((r) => r.estado === "pendiente").length,
    kgEstimados: sumaKg(validadosMes.map(kgEfectivo)),
    rondas: dias.size,
    conObservacion: incidenciasMes.length,
  };
}

/** Lo que pasó hoy en un contenedor, con los nombres que usa el validador. */
export type EstadoRonda = "conforme" | "observacion" | "sinMaterial" | "pendiente" | "vacio";

export interface FilaRonda {
  codigo: string;
  nombre: string;
  punto: string;
  estado: EstadoRonda;
  /** Depósitos que el validador revisó hoy en el contenedor. */
  revisados: number;
  /** Depósitos que esperan validación. */
  pendientes: number;
  /** Última acción del validador hoy; null si todavía no pasa. */
  revisadoEn: number | null;
}

/**
 * La ronda de hoy, un contenedor por fila, ordenados por punto limpio como los
 * recorre el validador. El estado es el más grave de lo que pasó hoy: un
 * reporte de contaminación pesa más que un "sin material", y ese más que un
 * "conforme". Si hoy no se revisó, queda pendiente si tiene depósitos
 * esperando, o vacío si no hay nada que revisar.
 */
export function rondaDeHoy(
  registros: Registro[],
  incidencias: Incidencia[],
  contenedores: Contenedor[],
  ahora: number = Date.now()
): FilaRonda[] {
  const desde = inicioDelDia(ahora);
  const deHoy = (t: number | null): t is number => t !== null && t >= desde && t <= ahora;

  return contenedores
    .filter((c) => c.activo)
    .map((c) => {
      const propios = registros.filter((r) => r.contenedor === c.codigo);
      const revisadosHoy = propios.filter((r) => r.estado !== "pendiente" && deHoy(r.validadoEn));
      const reportesHoy = incidencias.filter((i) => i.contenedor === c.codigo && deHoy(i.reportadoEn));
      const pendientes = propios.filter((r) => r.estado === "pendiente").length;

      let estado: EstadoRonda;
      if (reportesHoy.length > 0) estado = "observacion";
      else if (revisadosHoy.some((r) => r.estado === "rechazado")) estado = "sinMaterial";
      else if (revisadosHoy.length > 0) estado = "conforme";
      else estado = pendientes > 0 ? "pendiente" : "vacio";

      const momentos = [
        ...revisadosHoy.map((r) => r.validadoEn as number),
        ...reportesHoy.map((i) => i.reportadoEn),
      ];
      return {
        codigo: c.codigo,
        nombre: nombreContenedor(c),
        punto: c.punto,
        estado,
        revisados: revisadosHoy.length,
        pendientes,
        revisadoEn: momentos.length > 0 ? Math.max(...momentos) : null,
      };
    })
    .sort(
      (a, b) =>
        a.punto.localeCompare(b.punto, "es") ||
        a.nombre.localeCompare(b.nombre, "es") ||
        a.codigo.localeCompare(b.codigo)
    );
}
