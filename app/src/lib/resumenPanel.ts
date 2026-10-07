// Cálculos de la sección Resumen del panel del administrador: los
// indicadores del mes elegido, los depósitos por semana y por material, y la
// ronda de hoy por contenedor. Son funciones puras (sin React ni Firestore)
// para poder probarlas; el panel solo las memoriza.

import { porcentaje, sumaKg } from "./formato";
import {
  MATERIALES,
  kgEfectivo,
  nombreContenedor,
  type Contenedor,
  type Incidencia,
  type Material,
  type Registro,
} from "./tipos";

const DIA = 24 * 60 * 60 * 1000;
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Inicio del día local de `instante`. */
function inicioDelDia(instante: number): number {
  const f = new Date(instante);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
}

/**
 * Desde cuándo y hasta cuándo cuenta el mes «2026-10». Si es el mes en curso,
 * llega hasta `ahora`: lo que todavía no pasa no cuenta.
 */
function rangoDelMes(mes: string, ahora: number): { desde: number; hasta: number } {
  const [anio, numero] = mes.split("-").map(Number);
  const desde = new Date(anio, numero - 1, 1).getTime();
  const fin = new Date(anio, numero, 1).getTime() - 1;
  return { desde, hasta: Math.min(fin, ahora) };
}

function esValidado(r: Registro): boolean {
  return r.estado === "validado" || r.estado === "certificado";
}

export interface IndicadoresMes {
  /** Depósitos que el validador dejó conformes o con observación en el mes. */
  validados: number;
  /** Depósitos que esperan la ronda del validador ahora mismo. */
  porValidar: number;
  /** Kilos estimados de los depósitos validados en el mes. */
  kgEstimados: number;
  /** Días del mes en que el validador hizo su ronda. */
  rondas: number;
  /** Días de lunes a viernes del mes, hasta hoy si es el mes en curso. */
  diasHabiles: number;
  /** Contenedores revisados, uno por cada día en que se revisó cada uno. */
  lotesRevisados: number;
  /** Reportes de contaminación del mes. */
  conObservacion: number;
  /** Lotes en que el validador rechazó depósitos (Sin material). */
  sinMaterial: number;
}

/**
 * Indicadores del mes `mes` para el Resumen. Una ronda es un día en que el
 * validador validó, rechazó o reportó algo: pasa una vez al día, así que
 * contar días mide si la ronda se hizo, y compararlos con los días hábiles
 * dice cuántas faltaron. Un lote es lo que revisó en un contenedor en un día.
 */
export function indicadoresDelMes(
  registros: Registro[],
  incidencias: Incidencia[],
  mes: string,
  ahora: number = Date.now()
): IndicadoresMes {
  const { desde, hasta } = rangoDelMes(mes, ahora);
  const delMes = (t: number | null): t is number => t !== null && t >= desde && t <= hasta;

  const revisadosMes = registros.filter((r) => r.estado !== "pendiente" && delMes(r.validadoEn));
  const validadosMes = revisadosMes.filter(esValidado);
  const incidenciasMes = incidencias.filter((i) => delMes(i.reportadoEn));

  const dias = new Set<number>();
  for (const r of revisadosMes) dias.add(inicioDelDia(r.validadoEn as number));
  for (const i of incidenciasMes) dias.add(inicioDelDia(i.reportadoEn));

  const lote = (r: Registro) => `${r.contenedor}|${inicioDelDia(r.validadoEn as number)}`;
  const lotes = new Set(revisadosMes.map(lote));
  const lotesSinMaterial = new Set(revisadosMes.filter((r) => r.estado === "rechazado").map(lote));

  let diasHabiles = 0;
  for (let d = desde; d <= hasta; d += DIA) {
    const dia = new Date(d).getDay();
    if (dia !== 0 && dia !== 6) diasHabiles++;
  }

  return {
    validados: validadosMes.length,
    porValidar: registros.filter((r) => r.estado === "pendiente").length,
    kgEstimados: sumaKg(validadosMes.map(kgEfectivo)),
    rondas: dias.size,
    diasHabiles,
    lotesRevisados: lotes.size,
    conObservacion: incidenciasMes.length,
    sinMaterial: lotesSinMaterial.size,
  };
}

export interface Semana {
  /** «1–4 oct». */
  etiqueta: string;
  /** Depósitos validados en la semana. */
  validados: number;
  /** La semana de hoy: todavía puede sumar. */
  enCurso: boolean;
  /** Una semana del mes que aún no llega. */
  futura: boolean;
}

/**
 * Los depósitos validados en cada semana del mes, de lunes a domingo. La
 * primera y la última semana se cortan en el borde del mes.
 */
export function validadosPorSemana(
  registros: Registro[],
  mes: string,
  ahora: number = Date.now()
): Semana[] {
  const [anio, numero] = mes.split("-").map(Number);
  const ultimoDia = new Date(anio, numero, 0).getDate();
  const semanas: Semana[] = [];

  let primero = 1;
  while (primero <= ultimoDia) {
    // Hasta el domingo de esa semana, o el fin de mes.
    const diaSemana = new Date(anio, numero - 1, primero).getDay();
    const ultimo = Math.min(ultimoDia, primero + ((7 - diaSemana) % 7));
    const desde = new Date(anio, numero - 1, primero).getTime();
    const hasta = new Date(anio, numero - 1, ultimo + 1).getTime() - 1;

    semanas.push({
      etiqueta: `${primero === ultimo ? primero : `${primero}–${ultimo}`} ${MESES_CORTOS[numero - 1]}`,
      validados: registros.filter(
        (r) => esValidado(r) && r.validadoEn !== null && r.validadoEn >= desde && r.validadoEn <= hasta
      ).length,
      enCurso: ahora >= desde && ahora <= hasta,
      futura: desde > ahora,
    });
    primero = ultimo + 1;
  }
  return semanas;
}

export interface KilosMaterial {
  material: Material;
  kg: number;
  depositos: number;
  /** % de los kilos del mes. */
  porcentaje: number;
}

/** Los kilos estimados validados en el mes por material, de más a menos. */
export function kilosPorMaterial(
  registros: Registro[],
  mes: string,
  ahora: number = Date.now()
): KilosMaterial[] {
  const { desde, hasta } = rangoDelMes(mes, ahora);
  const validados = registros.filter(
    (r) => esValidado(r) && r.validadoEn !== null && r.validadoEn >= desde && r.validadoEn <= hasta
  );
  const total = sumaKg(validados.map(kgEfectivo));
  return MATERIALES.map(({ nombre }) => {
    const deEste = validados.filter((r) => r.material === nombre);
    const kg = sumaKg(deEste.map(kgEfectivo));
    return { material: nombre, kg, depositos: deEste.length, porcentaje: porcentaje(kg, total) };
  })
    .filter((m) => m.depositos > 0)
    .sort((a, b) => b.kg - a.kg);
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
