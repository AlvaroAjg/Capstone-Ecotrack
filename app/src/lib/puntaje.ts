import { esDiaHabil } from "./feriados";

export const PESO_CONSTANCIA = 0.6;
export const PESO_KILOS = 0.4;
export const TOPE_GRAMOS_SEMANA = 5000;

const DIA = 24 * 60 * 60 * 1000;

export function diaLocal(instante: number): number {
  const f = new Date(instante);
  return Math.round(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) / DIA);
}

export function semanaDe(instante: number): number {
  const dia = diaLocal(instante);
  return dia - ((((dia + 3) % 7) + 7) % 7);
}

export function gramosDe(kg: number): number {
  return Math.round(kg * 1000);
}

export function gramosConTope(previos: number, kg: number): number {
  return Math.min(TOPE_GRAMOS_SEMANA, previos + gramosDe(kg));
}

export interface SemanaDelMes {
  semana: number;
  habiles: number;
}

export function semanasDelMes(mes: string, ahora: number = Date.now()): SemanaDelMes[] {
  const [anio, numero] = mes.split("-").map(Number);
  const dias = new Date(anio, numero, 0).getDate();
  const hasta = semanaDe(ahora);
  const porSemana = new Map<number, number>();
  for (let d = 1; d <= dias; d++) {
    const mediodia = new Date(anio, numero - 1, d, 12).getTime();
    const semana = semanaDe(mediodia);
    if (semana > hasta) continue;
    porSemana.set(semana, (porSemana.get(semana) ?? 0) + (esDiaHabil(mediodia) ? 1 : 0));
  }
  return [...porSemana.entries()]
    .filter(([, habiles]) => habiles > 0)
    .map(([semana, habiles]) => ({ semana, habiles }));
}

export function constancia(
  semanas: Record<string, number> | undefined,
  dotacion: number,
  semanasMes: SemanaDelMes[]
): number {
  const total = semanasMes.reduce((t, s) => t + s.habiles, 0);
  if (dotacion <= 0 || total === 0) return 0;
  const ponderada = semanasMes.reduce(
    (t, s) => t + Math.min(1, (semanas?.[String(s.semana)] ?? 0) / dotacion) * s.habiles,
    0
  );
  return (ponderada / total) * 100;
}

export interface AreaParaPuntaje {
  id: string;
  dotacion: number;
  semanas?: Record<string, number>;
  gramos?: number;
}

export interface PuntajeArea {
  constancia: number;
  kgPorPersona: number;
  indiceKilos: number;
  puntaje: number;
}

export function puntajesDeAreas(areas: AreaParaPuntaje[], semanasMes: SemanaDelMes[]): Map<string, PuntajeArea> {
  const kgPorPersona = new Map(
    areas.map((a) => [a.id, a.dotacion > 0 ? (a.gramos ?? 0) / 1000 / a.dotacion : 0])
  );
  const mayor = Math.max(0, ...kgPorPersona.values());
  return new Map(
    areas.map((a) => {
      const exacta = constancia(a.semanas, a.dotacion, semanasMes);
      const kg = kgPorPersona.get(a.id) ?? 0;
      const indice = mayor > 0 ? (kg / mayor) * 100 : 0;
      return [
        a.id,
        {
          constancia: Math.round(exacta),
          kgPorPersona: Math.round(kg * 100) / 100,
          indiceKilos: Math.round(indice),
          puntaje: Math.round(PESO_CONSTANCIA * exacta + PESO_KILOS * indice),
        },
      ];
    })
  );
}
