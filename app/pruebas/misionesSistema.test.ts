import { describe, expect, test } from "vitest";
import {
  inicioDeSemana,
  misionSemanal,
  puntosDelMes,
  textoAvance,
} from "../src/lib/misionesSistema";
import type { Registro } from "../src/lib/tipos";
import { fecha, registro } from "./fabrica";

const DIA = 86_400_000;

/** El lunes de la primera semana, desde el 7 de septiembre de 2026, cuya misión es `id`. */
function lunesCon(id: string): Date {
  for (let semana = 0; semana < 10; semana++) {
    const lunes = new Date(2026, 8, 7 + semana * 7);
    if (misionSemanal([], lunes).id === id) return lunes;
  }
  throw new Error(`Ninguna semana tiene la misión ${id}`);
}

/** Un depósito en la semana de `lunes`, `dias` días después del lunes. */
function en(lunes: Date, dias: number, cambios: Partial<Registro> = {}): Registro {
  return registro({ creadoEn: lunes.getTime() + dias * DIA + 10 * 3_600_000, ...cambios });
}

describe("inicioDeSemana", () => {
  test("de un miércoles es su lunes a medianoche", () => {
    expect(inicioDeSemana(new Date(2026, 8, 16, 15))).toEqual(new Date(2026, 8, 14));
  });

  test("de un domingo es el lunes anterior, no el siguiente", () => {
    expect(inicioDeSemana(new Date(2026, 8, 20, 23))).toEqual(new Date(2026, 8, 14));
  });

  test("puede caer en el mes anterior", () => {
    // El 1 de octubre de 2026 es jueves.
    expect(inicioDeSemana(new Date(2026, 9, 1))).toEqual(new Date(2026, 8, 28));
  });
});

describe("misionSemanal", () => {
  test("es la misma durante toda la semana y rota entre las tres", () => {
    const lunes = new Date(2026, 8, 14);
    const id = misionSemanal([], lunes).id;
    for (let d = 1; d < 7; d++) {
      expect(misionSemanal([], new Date(2026, 8, 14 + d, 18)).id).toBe(id);
    }
    const ids = new Set([0, 1, 2].map((s) => misionSemanal([], new Date(2026, 8, 14 + s * 7)).id));
    expect(ids).toEqual(new Set(["s-deposito", "s-variedad", "s-kilos"]));
  });

  test("reciclar una vez: se cumple con un depósito", () => {
    const lunes = lunesCon("s-deposito");
    expect(misionSemanal([], lunes).completada).toBe(false);
    const m = misionSemanal([en(lunes, 2)], lunes);
    expect(m.completada).toBe(true);
    expect(m.puntos).toBe(50);
  });

  test("dos materiales: dos depósitos del mismo material no bastan", () => {
    const lunes = lunesCon("s-variedad");
    const plastico = [en(lunes, 1), en(lunes, 2)];
    expect(misionSemanal(plastico, lunes).progreso).toBe(1);
    expect(misionSemanal(plastico, lunes).completada).toBe(false);

    const conVidrio = [...plastico, en(lunes, 3, { material: "Vidrio", kgDeclarado: 1.5 })];
    expect(misionSemanal(conVidrio, lunes).completada).toBe(true);
  });

  test("3 kg: suma los kilos y el avance no pasa de la meta", () => {
    const lunes = lunesCon("s-kilos");
    const papel = en(lunes, 1, { material: "Papel/cartón", talla: "L", kgDeclarado: 2.5 });
    expect(misionSemanal([papel], lunes).progreso).toBe(2.5);
    expect(misionSemanal([papel], lunes).completada).toBe(false);

    const vidrio = en(lunes, 2, { material: "Vidrio", talla: "L", kgDeclarado: 8 });
    const m = misionSemanal([papel, vidrio], lunes);
    expect(m.completada).toBe(true);
    expect(m.progreso).toBe(3);
  });

  test("un depósito rechazado deja de contar", () => {
    const lunes = lunesCon("s-deposito");
    expect(misionSemanal([en(lunes, 1, { estado: "rechazado" })], lunes).completada).toBe(false);
  });

  test("solo cuentan los depósitos de esa semana", () => {
    const lunes = lunesCon("s-deposito");
    const semanaAnterior = en(lunes, -1);
    const semanaSiguiente = en(lunes, 7);
    expect(misionSemanal([semanaAnterior, semanaSiguiente], lunes).completada).toBe(false);
  });
});

describe("puntosDelMes", () => {
  test("50 por cada semana del mes con la misión cumplida", () => {
    // Septiembre de 2026: un depósito de cada material cada semana cumple las tres misiones.
    const registros: Registro[] = [];
    for (let s = 0; s < 3; s++) {
      const lunes = new Date(2026, 8, 7 + s * 7);
      registros.push(
        en(lunes, 1, { material: "Papel/cartón", talla: "XL", kgDeclarado: 5 }),
        en(lunes, 2, { material: "Vidrio", talla: "S", kgDeclarado: 1.5 })
      );
    }
    // Hoy es miércoles 23: cuentan las semanas del 31/8, 7, 14 y 21 (la del
    // 31/8 no tiene depósitos).
    expect(puntosDelMes(registros, new Date(2026, 8, 23))).toBe(150);
  });

  test("cuenta la semana que empezó el mes anterior", () => {
    // El 1 de octubre de 2026 es jueves: su semana empieza el 28 de septiembre.
    const lunes = new Date(2026, 8, 28);
    const registros = [
      en(lunes, 0, { material: "Papel/cartón", talla: "XL", kgDeclarado: 5 }),
      en(lunes, 1, { material: "Vidrio", talla: "S", kgDeclarado: 1.5 }),
    ];
    expect(puntosDelMes(registros, new Date(2026, 9, 2))).toBe(50);
  });

  test("sin depósitos, 0", () => {
    expect(puntosDelMes([], new Date(2026, 8, 23))).toBe(0);
  });
});

test("textoAvance", () => {
  const lunesKilos = lunesCon("s-kilos");
  const papel = en(lunesKilos, 1, { material: "Papel/cartón", talla: "L", kgDeclarado: 2.5 });
  expect(textoAvance(misionSemanal([papel], lunesKilos))).toBe("2,5 de 3 kg");

  const lunesVariedad = lunesCon("s-variedad");
  expect(textoAvance(misionSemanal([en(lunesVariedad, 1)], lunesVariedad))).toBe("1 de 2 materiales");

  const lunesDeposito = lunesCon("s-deposito");
  expect(textoAvance(misionSemanal([], lunesDeposito))).toBe("0 de 1 depósito");
});
