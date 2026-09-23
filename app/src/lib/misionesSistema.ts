// Misiones del sistema: diarias y semanales, iguales para todos los residentes.
//
// A diferencia de la misión de la torre (que define el administrador y vive en
// Firestore), estas no se guardan en ninguna parte: el catálogo está en el
// código y el avance se calcula en vivo a partir de los depósitos del propio
// residente. Así no hay nada que sincronizar ni que un usuario pueda marcar
// como cumplido a mano; si un depósito se rechaza, deja de contar solo.
//
// Son deliberadamente alcanzables: la diaria base se cumple con un solo
// depósito, y ninguna depende de que el gestor retire el contenedor a tiempo.

import { MATERIALES, kgEfectivo, type Material, type Registro } from "./tipos";

export type TipoMision = "diaria" | "semanal";

export interface MisionSistema {
  id: string;
  tipo: TipoMision;
  emoji: string;
  titulo: string;
  descripcion: string;
  puntos: number;
  meta: number;
  progreso: number;
  completada: boolean;
  /** Cómo mostrar el avance: "1 de 2", "0,5 de 1 kg"... */
  unidad: "deposito" | "kg" | "dia" | "material";
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
 * misiones de forma que todos los residentes vean las mismas el mismo día.
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

/** Material que se destaca cada día, rotando por los cuatro disponibles. */
export function materialDelDia(fecha: Date = new Date()): Material {
  return MATERIALES[numeroDeDia(fecha) % MATERIALES.length].nombre;
}

/**
 * Misiones diarias del día de `fecha`: siempre la de un depósito (la más fácil)
 * más dos de un grupo de tres que rota día a día.
 */
export function misionesDiarias(misRegistros: Registro[], fecha: Date = new Date()): MisionSistema[] {
  const desde = inicioDelDia(fecha).getTime();
  const hoy = cuentan(misRegistros, desde, desde + DIA);
  const material = materialDelDia(fecha);
  const emojiMaterial = MATERIALES.find((m) => m.nombre === material)?.emoji ?? "♻️";

  const base = crear(
    {
      id: "d-deposito",
      tipo: "diaria",
      emoji: "📷",
      titulo: "Haz un depósito hoy",
      descripcion: "Escanea el QR del contenedor y registra cualquier material.",
      puntos: 10,
      meta: 1,
      unidad: "deposito",
    },
    hoy.length
  );

  const rotativas: MisionSistema[] = [
    crear(
      {
        id: "d-material",
        tipo: "diaria",
        emoji: emojiMaterial,
        titulo: `Material del día: ${material}`,
        descripcion: `Registra al menos un depósito de ${material.toLowerCase()}.`,
        puntos: 15,
        meta: 1,
        unidad: "deposito",
      },
      hoy.filter((r) => r.material === material).length
    ),
    crear(
      {
        id: "d-kilo",
        tipo: "diaria",
        emoji: "⚖️",
        titulo: "Recicla 1 kg hoy",
        descripcion: "Suma entre todos tus depósitos del día al menos un kilo.",
        puntos: 15,
        meta: 1,
        unidad: "kg",
      },
      kilos(hoy)
    ),
    crear(
      {
        id: "d-dos",
        tipo: "diaria",
        emoji: "✌️",
        titulo: "Dos depósitos hoy",
        descripcion: "Separa bien tus residuos y registra dos depósitos.",
        puntos: 20,
        meta: 2,
        unidad: "deposito",
      },
      hoy.length
    ),
  ];

  const fuera = numeroDeDia(fecha) % rotativas.length;
  return [base, ...rotativas.filter((_, i) => i !== fuera)];
}

/** Misiones semanales (lunes a domingo): tres de un grupo de cuatro que rota por semana. */
export function misionesSemanales(
  misRegistros: Registro[],
  fecha: Date = new Date()
): MisionSistema[] {
  const lunes = inicioDeSemana(fecha);
  const desde = lunes.getTime();
  const hasta = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7).getTime();
  const semana = cuentan(misRegistros, desde, hasta);

  const diasDistintos = new Set(semana.map((r) => inicioDelDia(new Date(r.creadoEn)).getTime()))
    .size;
  const materialesDistintos = new Set(semana.map((r) => r.material)).size;

  const todas: MisionSistema[] = [
    crear(
      {
        id: "s-constancia",
        tipo: "semanal",
        emoji: "📅",
        titulo: "Constancia: 3 días distintos",
        descripcion: "Recicla en tres días diferentes de la semana.",
        puntos: 50,
        meta: 3,
        unidad: "dia",
      },
      diasDistintos
    ),
    crear(
      {
        id: "s-kilos",
        tipo: "semanal",
        emoji: "💪",
        titulo: "Acumula 5 kg en la semana",
        descripcion: "Suma cinco kilos entre todos tus depósitos de la semana.",
        puntos: 40,
        meta: 5,
        unidad: "kg",
      },
      kilos(semana)
    ),
    crear(
      {
        id: "s-variedad",
        tipo: "semanal",
        emoji: "🌈",
        titulo: "Variedad: 2 materiales",
        descripcion: "Recicla al menos dos tipos de material distintos.",
        puntos: 40,
        meta: 2,
        unidad: "material",
      },
      materialesDistintos
    ),
    crear(
      {
        id: "s-depositos",
        tipo: "semanal",
        emoji: "🔁",
        titulo: "Cinco depósitos en la semana",
        descripcion: "Registra cinco depósitos entre lunes y domingo.",
        puntos: 40,
        meta: 5,
        unidad: "deposito",
      },
      semana.length
    ),
  ];

  const fuera = Math.floor(numeroDeDia(lunes) / 7) % todas.length;
  return todas.filter((_, i) => i !== fuera);
}

/**
 * EcoPuntos ganados en la semana en curso: las misiones semanales cumplidas más
 * las diarias cumplidas de cada día, desde el lunes hasta hoy.
 */
export function puntosDeLaSemana(misRegistros: Registro[], fecha: Date = new Date()): number {
  const lunes = inicioDeSemana(fecha);
  const hoy = inicioDelDia(fecha).getTime();
  let puntos = 0;

  for (let i = 0; i < 7; i++) {
    const dia = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
    if (dia.getTime() > hoy) break;
    puntos += sumarCompletadas(misionesDiarias(misRegistros, dia));
  }
  return puntos + sumarCompletadas(misionesSemanales(misRegistros, fecha));
}

export function sumarCompletadas(misiones: MisionSistema[]): number {
  return misiones.filter((m) => m.completada).reduce((t, m) => t + m.puntos, 0);
}

/** Texto del avance de una misión, p. ej. "1 de 2 depósitos" o "0,5 de 1 kg". */
export function textoAvance(m: MisionSistema): string {
  const numero = (n: number) =>
    Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(".", ",");
  const plural = m.meta === 1 ? "" : "s";
  const sufijo = {
    deposito: ` depósito${plural}`,
    kg: " kg",
    dia: ` día${plural}`,
    material: ` material${m.meta === 1 ? "" : "es"}`,
  }[m.unidad];
  return `${numero(m.progreso)} de ${numero(m.meta)}${sufijo}`;
}

/** Cuánto falta para que se renueven las misiones del tipo dado. */
export function tiempoParaRenovar(tipo: TipoMision, fecha: Date = new Date()): string {
  if (tipo === "diaria") {
    const manana = inicioDelDia(fecha).getTime() + DIA;
    const horas = Math.max(1, Math.ceil((manana - fecha.getTime()) / (60 * 60 * 1000)));
    return `Se renuevan en ${horas} h`;
  }
  const lunes = inicioDeSemana(fecha);
  const proximo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7);
  const dias = Math.max(1, Math.ceil((proximo.getTime() - fecha.getTime()) / DIA));
  return dias === 1 ? "Se renuevan mañana" : `Se renuevan en ${dias} días`;
}
