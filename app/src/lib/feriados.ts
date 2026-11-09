// Feriados nacionales en que la planta no opera. Como el fin de semana, no
// cuentan como días hábiles: un feriado sin ronda no es una ronda que faltó.
// Es una lista fija porque el piloto termina en diciembre de 2026 (ver
// ULTIMO_MES en reportePlanta.ts); si se extiende, hay que agregar los del
// período nuevo según el calendario oficial.

/** Fecha local «AAAA-MM-DD» → nombre del feriado. */
export const FERIADOS: Record<string, string> = {
  "2026-01-01": "Año Nuevo",
  "2026-04-03": "Viernes Santo",
  "2026-04-04": "Sábado Santo",
  "2026-05-01": "Día del Trabajo",
  "2026-05-21": "Glorias Navales",
  "2026-06-21": "Pueblos Indígenas",
  "2026-06-29": "San Pedro y San Pablo",
  "2026-07-16": "Virgen del Carmen",
  "2026-08-15": "Asunción de la Virgen",
  "2026-09-18": "Independencia Nacional",
  "2026-09-19": "Glorias del Ejército",
  "2026-10-12": "Encuentro de Dos Mundos",
  "2026-10-31": "Iglesias Evangélicas",
  "2026-11-01": "Todos los Santos",
  "2026-12-08": "Inmaculada Concepción",
  "2026-12-25": "Navidad",
};

/** El nombre del feriado del día de `instante`, o null si ese día no es feriado. */
export function feriadoDe(instante: number): string | null {
  const f = new Date(instante);
  const dos = (n: number) => String(n).padStart(2, "0");
  return FERIADOS[`${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`] ?? null;
}

/** Día hábil: de lunes a viernes y no feriado. */
export function esDiaHabil(instante: number): boolean {
  const dia = new Date(instante).getDay();
  return dia !== 0 && dia !== 6 && feriadoDe(instante) === null;
}
