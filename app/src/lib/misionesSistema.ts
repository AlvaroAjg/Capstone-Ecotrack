// Misión del sistema: una por semana, igual para todos los residentes.
//
// A diferencia de la misión de la torre (que define el administrador y vive en
// Firestore), esta no se guarda en ninguna parte: el catálogo está en el
// código y el avance se calcula en vivo a partir de los depósitos del propio
// residente. Así no hay nada que sincronizar ni que un usuario pueda marcar
// como cumplido a mano; si un depósito se rechaza, deja de contar solo.
//
// Es semanal y no diaria a propósito: la gente junta sus residuos y baja al
// contenedor una o dos veces por semana, no todos los días. Cada meta se
// cumple con una o dos bajadas, no depende de cuándo pasa el camión del gestor
// (un depósito cuenta desde que se registra) y ninguna premia la cantidad de
// depósitos, para no incentivar partir uno en varios.

import { kgEfectivo, type Registro } from "./tipos";

export interface MisionSistema {
  id: string;
  emoji: string;
  titulo: string;
  puntos: number;
  meta: number;
  progreso: number;
  completada: boolean;
  /** Cómo mostrar el avance: "0 de 1 depósito", "2,5 de 3 kg"... */
  unidad: "deposito" | "kg" | "material";
}

const DIA = 24 * 60 * 60 * 1000;

/** Medianoche local del día de `fecha`. */
function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Lunes 00:00 local de la semana de `fecha`. */
function inicioDeSemana(fecha: Date): Date {
  const dia = inicioDelDia(fecha);
  const desdeLunes = (dia.getDay() + 6) % 7;
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - desdeLunes);
}

/**
 * Número de día estable (independiente del horario de verano), para rotar las
 * misiones de forma que todos los residentes vean la misma cada semana.
 */
function numeroDeDia(fecha: Date): number {
  return Math.floor(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / DIA);
}

/** Depósitos que cuentan para misiones: todo lo que no fue rechazado. */
function cuentan(registros: Registro[], desde: number, hasta: number): Registro[] {
  return registros.filter(
    (r) => r.estado !== "rechazado" && r.creadoEn >= desde && r.creadoEn < hasta
  );
}

function kilos(registros: Registro[]): number {
  return Math.round(registros.reduce((t, r) => t + kgEfectivo(r), 0) * 10) / 10;
}

function crear(
  base: Omit<MisionSistema, "completada" | "progreso">,
  progreso: number
): MisionSistema {
  const acotado = Math.min(progreso, base.meta);
  return { ...base, progreso: acotado, completada: acotado >= base.meta };
}

/** La misión de la semana (lunes a domingo): rota entre tres, una cada semana. */
export function misionSemanal(misRegistros: Registro[], fecha: Date = new Date()): MisionSistema {
  const lunes = inicioDeSemana(fecha);
  const desde = lunes.getTime();
  const hasta = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7).getTime();
  const semana = cuentan(misRegistros, desde, hasta);

  const opciones = [
    () =>
      crear(
        {
          id: "s-deposito",
          emoji: "♻️",
          titulo: "Recicla al menos una vez esta semana",
          puntos: 50,
          meta: 1,
          unidad: "deposito",
        },
        semana.length
      ),
    () =>
      crear(
        {
          id: "s-variedad",
          emoji: "🌈",
          titulo: "Recicla 2 materiales distintos",
          puntos: 50,
          meta: 2,
          unidad: "material",
        },
        new Set(semana.map((r) => r.material)).size
      ),
    () =>
      crear(
        {
          id: "s-kilos",
          emoji: "💪",
          titulo: "Junta 3 kg esta semana",
          puntos: 50,
          meta: 3,
          unidad: "kg",
        },
        kilos(semana)
      ),
  ];

  return opciones[Math.floor(numeroDeDia(lunes) / 7) % opciones.length]();
}

/**
 * EcoPuntos del mes en curso: 50 por cada misión semanal cumplida, contando
 * toda semana que tenga al menos un día en este mes. Así, si el mes empieza un
 * miércoles, la misión cumplida ese día suma aquí y el total nunca baja
 * mientras el mes avanza.
 */
export function puntosDelMes(misRegistros: Registro[], fecha: Date = new Date()): number {
  const esteLunes = inicioDeSemana(fecha).getTime();
  let puntos = 0;

  for (
    let lunes = inicioDeSemana(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
    lunes.getTime() <= esteLunes;
    lunes = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7)
  ) {
    const mision = misionSemanal(misRegistros, lunes);
    if (mision.completada) puntos += mision.puntos;
  }
  return puntos;
}

/** Texto del avance de una misión, p. ej. "1 de 2 materiales" o "2,5 de 3 kg". */
export function textoAvance(m: MisionSistema): string {
  const numero = (n: number) =>
    Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(".", ",");
  const plural = m.meta === 1 ? "" : "s";
  const sufijo = {
    deposito: ` depósito${plural}`,
    kg: " kg",
    material: ` material${m.meta === 1 ? "" : "es"}`,
  }[m.unidad];
  return `${numero(m.progreso)} de ${numero(m.meta)}${sufijo}`;
}
