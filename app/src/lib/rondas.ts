// Rondas del validador: si pasó cada día del mes a revisar los contenedores,
// y lo que encontró. Son funciones puras para poder probarlas; la sección
// Rondas del panel solo las muestra.

import { nombreContenedor, type Contenedor, type Incidencia, type Registro } from "./tipos";

const DIA = 24 * 60 * 60 * 1000;

/**
 * - completada: el validador validó, rechazó o reportó algo ese día.
 * - noRealizada: había depósitos esperando y no se revisó nada.
 * - sinDepositos: no había nada que revisar.
 * - enCurso: es hoy, hay depósitos esperando y todavía no pasa.
 * - futuro: un día del mes que aún no llega.
 */
export type EstadoDia = "completada" | "noRealizada" | "sinDepositos" | "enCurso" | "futuro";

export interface DiaRonda {
  /** Inicio del día, en hora local. */
  dia: number;
  estado: EstadoDia;
  /** Depósitos que el validador revisó ese día. */
  revisados: number;
  /** Depósitos que esperaban al terminar el día (o ahora, si es hoy). */
  pendientes: number;
}

/**
 * El estado de la ronda en cada día del mes de `ahora`. Un depósito espera
 * desde que se registra hasta que el validador lo revisa, así que se cuenta
 * como pendiente en cada día que terminó sin revisarse.
 */
export function rondasDelMes(
  registros: Registro[],
  incidencias: Incidencia[],
  ahora: number = Date.now()
): DiaRonda[] {
  const hoy = new Date(ahora);
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  const dias: DiaRonda[] = [];
  for (let d = 1; d <= diasDelMes; d++) {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), d).getTime();
    // El último instante que cuenta: el fin del día, o ahora si es hoy.
    const corte = inicio === inicioHoy ? ahora : inicio + DIA - 1;

    if (inicio > inicioHoy) {
      dias.push({ dia: inicio, estado: "futuro", revisados: 0, pendientes: 0 });
      continue;
    }
    const enElDia = (t: number | null) => t !== null && t >= inicio && t <= corte;
    const revisados = registros.filter((r) => r.estado !== "pendiente" && enElDia(r.validadoEn)).length;
    const reportes = incidencias.filter((i) => enElDia(i.reportadoEn)).length;
    const pendientes = registros.filter(
      (r) => r.creadoEn <= corte && (r.validadoEn === null || r.validadoEn > corte)
    ).length;

    let estado: EstadoDia;
    if (revisados > 0 || reportes > 0) estado = "completada";
    else if (pendientes === 0) estado = "sinDepositos";
    else estado = inicio === inicioHoy ? "enCurso" : "noRealizada";
    dias.push({ dia: inicio, estado, revisados, pendientes });
  }
  return dias;
}

export interface Observacion {
  fecha: number;
  codigo: string;
  contenedor: string;
  punto: string;
  /** observacion: encontró algo que no correspondía; sinMaterial: rechazó la tanda. */
  tipo: "observacion" | "sinMaterial";
  detalle: string;
}

/**
 * Lo que el validador encontró en el mes, de lo más reciente a lo más
 * antiguo: los reportes de contaminación y los contenedores que marcó «Sin
 * material». Los rechazos de un mismo contenedor el mismo día son una sola
 * observación, porque se marcan por tanda.
 */
export function observacionesDelMes(
  registros: Registro[],
  incidencias: Incidencia[],
  contenedores: Contenedor[],
  ahora: number = Date.now()
): Observacion[] {
  const hoy = new Date(ahora);
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
  const delMes = (t: number | null): t is number => t !== null && t >= desde && t <= ahora;
  const datos = (codigo: string) => {
    const c = contenedores.find((x) => x.codigo === codigo);
    return { contenedor: c ? nombreContenedor(c) : `Contenedor ${codigo}`, punto: c?.punto ?? "" };
  };

  const lista: Observacion[] = incidencias
    .filter((i) => delMes(i.reportadoEn))
    .map((i) => ({
      fecha: i.reportadoEn,
      codigo: i.contenedor,
      ...datos(i.contenedor),
      tipo: "observacion" as const,
      detalle: `Se encontró ${i.contaminante.toLowerCase()}`,
    }));

  const rechazos = new Map<string, { fecha: number; codigo: string; cantidad: number }>();
  for (const r of registros) {
    if (r.estado !== "rechazado" || !delMes(r.validadoEn)) continue;
    const dia = new Date(r.validadoEn).toDateString();
    const clave = `${r.contenedor}|${dia}`;
    const previo = rechazos.get(clave);
    rechazos.set(clave, {
      fecha: Math.max(previo?.fecha ?? 0, r.validadoEn),
      codigo: r.contenedor,
      cantidad: (previo?.cantidad ?? 0) + 1,
    });
  }
  for (const { fecha, codigo, cantidad } of rechazos.values()) {
    lista.push({
      fecha,
      codigo,
      ...datos(codigo),
      tipo: "sinMaterial",
      detalle: `${cantidad} depósito${cantidad === 1 ? "" : "s"} rechazado${cantidad === 1 ? "" : "s"}`,
    });
  }
  return lista.sort((a, b) => b.fecha - a.fecha);
}
