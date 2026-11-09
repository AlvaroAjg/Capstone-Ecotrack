import { describe, expect, test } from "vitest";
import {
  constancia,
  diaLocal,
  gramosConTope,
  puntajesDeAreas,
  semanaDe,
  semanasDelMes,
} from "../src/lib/puntaje";
import { fecha } from "./fabrica";

const S1 = semanaDe(fecha(2026, 9, 1));
const S2 = semanaDe(fecha(2026, 9, 7));
const S3 = semanaDe(fecha(2026, 9, 14));

describe("semanaDe", () => {
  test("de lunes a domingo es la misma semana, y es el día del lunes", () => {
    const lunes = semanaDe(fecha(2026, 11, 9, 0));
    expect(semanaDe(fecha(2026, 11, 12))).toBe(lunes);
    expect(semanaDe(fecha(2026, 11, 15, 23))).toBe(lunes);
    expect(semanaDe(fecha(2026, 11, 16, 0))).toBe(lunes + 7);
    expect(lunes).toBe(diaLocal(fecha(2026, 11, 9)));
  });
});

describe("gramosConTope", () => {
  test("suma los gramos del depósito hasta 5 kg por persona a la semana", () => {
    expect(gramosConTope(0, 0.4)).toBe(400);
    expect(gramosConTope(0, 1.2)).toBe(1200);
    expect(gramosConTope(4800, 0.4)).toBe(5000);
    expect(gramosConTope(5000, 2.5)).toBe(5000);
    expect(gramosConTope(0, 12)).toBe(5000);
  });
});

describe("semanasDelMes", () => {
  test("las semanas hasta hoy, con los días hábiles que ya pasaron (sin el feriado del 18)", () => {
    expect(semanasDelMes("2026-09", fecha(2026, 9, 16))).toEqual([
      { semana: S1, habiles: 4 },
      { semana: S2, habiles: 5 },
      { semana: S3, habiles: 3 },
    ]);
  });

  test("el lunes, la semana en curso pesa un solo día", () => {
    const lunes = semanasDelMes("2026-11", fecha(2026, 11, 9, 9));
    expect(lunes.map((s) => s.habiles)).toEqual([5, 1]);
  });

  test("un mes terminado trae todas sus semanas; un domingo suelto no cuenta", () => {
    const noviembre = semanasDelMes("2026-11", fecha(2026, 12, 15));
    expect(noviembre.map((s) => s.habiles)).toEqual([5, 5, 5, 5, 1]);
    expect(noviembre[0].semana).toBe(semanaDe(fecha(2026, 11, 2)));
  });
});

describe("constancia", () => {
  const SEPTIEMBRE = semanasDelMes("2026-09", fecha(2026, 9, 16));

  test("promedia la participación de cada semana, ponderada por días hábiles", () => {
    expect(constancia({ [S1]: 10 }, 10, SEPTIEMBRE)).toBeCloseTo((4 / 12) * 100);
    expect(constancia({ [S1]: 5, [S2]: 5, [S3]: 5 }, 10, SEPTIEMBRE)).toBeCloseTo(50);
  });

  test("una semana no pasa de 100 % aunque la dotación quedó corta", () => {
    expect(constancia({ [S1]: 12, [S2]: 12, [S3]: 12 }, 10, SEPTIEMBRE)).toBeCloseTo(100);
  });

  test("sin dotación o sin semanas hábiles, 0", () => {
    expect(constancia({ [S1]: 3 }, 0, SEPTIEMBRE)).toBe(0);
    expect(constancia({ [S1]: 3 }, 10, [])).toBe(0);
  });
});

describe("puntajesDeAreas", () => {
  const SEPTIEMBRE = semanasDelMes("2026-09", fecha(2026, 9, 16));

  test("gana el área constante aunque otra haya reciclado toda el primer día", () => {
    const puntajes = puntajesDeAreas(
      [
        { id: "todosElPrimerDia", dotacion: 10, semanas: { [S1]: 10 }, gramos: 15000 },
        { id: "constante", dotacion: 20, semanas: { [S1]: 12, [S2]: 12, [S3]: 12 }, gramos: 80000 },
      ],
      SEPTIEMBRE
    );
    expect(puntajes.get("todosElPrimerDia")).toEqual({ constancia: 33, kgPorPersona: 1.5, indiceKilos: 38, puntaje: 35 });
    expect(puntajes.get("constante")).toEqual({ constancia: 60, kgPorPersona: 4, indiceKilos: 100, puntaje: 76 });
  });

  test("los kilos suman: a igual constancia, gana la que recicla más por persona", () => {
    const semanas = { [S1]: 5, [S2]: 5, [S3]: 5 };
    const puntajes = puntajesDeAreas(
      [
        { id: "a", dotacion: 10, semanas, gramos: 20000 },
        { id: "b", dotacion: 10, semanas, gramos: 5000 },
      ],
      SEPTIEMBRE
    );
    expect(puntajes.get("a")?.puntaje).toBe(70);
    expect(puntajes.get("b")?.puntaje).toBe(40);
  });

  test("la constancia pesa más que los kilos", () => {
    const puntajes = puntajesDeAreas(
      [
        { id: "kilos", dotacion: 10, semanas: { [S1]: 2, [S2]: 2, [S3]: 2 }, gramos: 30000 },
        { id: "constancia", dotacion: 10, semanas: { [S1]: 10, [S2]: 10, [S3]: 10 }, gramos: 1000 },
      ],
      SEPTIEMBRE
    );
    expect(puntajes.get("constancia")!.puntaje).toBeGreaterThan(puntajes.get("kilos")!.puntaje);
  });

  test("sin kilos en la planta, el índice de kilos queda en 0", () => {
    const puntajes = puntajesDeAreas([{ id: "a", dotacion: 10, semanas: { [S1]: 10 } }], SEPTIEMBRE);
    expect(puntajes.get("a")).toMatchObject({ kgPorPersona: 0, indiceKilos: 0 });
  });
});
