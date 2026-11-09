import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { rankingDeAreas } from "../src/lib/derivados";
import { porcentaje } from "../src/lib/formato";
import {
  avanceAreas,
  fechaIso,
  isoATexto,
  leerFechaTermino,
  personasQueFaltan,
  textoFecha,
  validarCampana,
} from "../src/lib/incentivo";
import { EMBOTELLADO, FERMENTACION, fecha, fijarAhora, resumen } from "./fabrica";

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("leerFechaTermino", () => {
  test("el último instante del día, con guion o barra", () => {
    const fin = new Date(2026, 9, 30, 23, 59, 59, 999).getTime();
    expect(leerFechaTermino("30-10-2026")).toBe(fin);
    expect(leerFechaTermino(" 30/10/2026 ")).toBe(fin);
  });

  test("null si la fecha no existe o no tiene el formato", () => {
    expect(leerFechaTermino("31-02-2026")).toBeNull();
    expect(leerFechaTermino("2026-10-30")).toBeNull();
    expect(leerFechaTermino("")).toBeNull();
  });

  test("textoFecha vuelve a escribirla igual", () => {
    expect(textoFecha(leerFechaTermino("05-11-2026")!)).toBe("05-11-2026");
  });
});

describe("validarCampana", () => {
  const BASE = { nombre: " Octubre verde ", meta: "50", incentivo: " Desayuno ", termina: "31-10-2026" };

  test("devuelve los datos limpios", () => {
    const r = validarCampana(BASE);
    expect(r).toEqual({
      ok: true,
      datos: {
        nombre: "Octubre verde",
        metaParticipacion: 50,
        incentivo: "Desayuno",
        terminaEn: new Date(2026, 9, 31, 23, 59, 59, 999).getTime(),
      },
    });
  });

  test("rechaza lo que la regla de Firestore no acepta", () => {
    expect(validarCampana({ ...BASE, nombre: "  " }).ok).toBe(false);
    expect(validarCampana({ ...BASE, meta: "0" }).ok).toBe(false);
    expect(validarCampana({ ...BASE, meta: "101" }).ok).toBe(false);
    expect(validarCampana({ ...BASE, meta: "40.5" }).ok).toBe(false);
    expect(validarCampana({ ...BASE, incentivo: "" }).ok).toBe(false);
    expect(validarCampana({ ...BASE, termina: "31-02-2026" }).ok).toBe(false);
  });

  test("no deja una fecha de término que ya pasó", () => {
    expect(validarCampana({ ...BASE, termina: "15-09-2026" })).toEqual({
      ok: false,
      error: "La fecha de término ya pasó.",
    });
  });
});

describe("avanceAreas", () => {
  test("cuánto le falta a cada área, en el orden del ranking", () => {
    const ranking = rankingDeAreas(
      [EMBOTELLADO, FERMENTACION],
      resumen({
        embotellado: { depositos: 9, participantes: 6 },
        fermentacion: { depositos: 8, participantes: 7 },
      }),
      null
    );
    // Fermentación 70 %, Embotellado 30 %.
    expect(avanceAreas(50, ranking)).toEqual([
      { areaId: "fermentacion", nombre: "Fermentación", participacion: 70, faltan: 0, cumple: true },
      { areaId: "embotellado", nombre: "Embotellado", participacion: 30, faltan: 20, cumple: false },
    ]);
  });
});

describe("fechas del calendario", () => {
  test("fechaIso y isoATexto van y vuelven", () => {
    expect(fechaIso(new Date(2026, 10, 8, 15).getTime())).toBe("2026-11-08");
    expect(isoATexto("2026-11-08")).toBe("08-11-2026");
    expect(leerFechaTermino(isoATexto("2026-11-08"))).not.toBeNull();
  });

  test("sin fecha o mal escrita, isoATexto queda vacío", () => {
    expect(isoATexto("")).toBe("");
    expect(isoATexto("8-11-2026")).toBe("");
  });
});

describe("personasQueFaltan", () => {
  const area = (dotacion: number, participantes: number) =>
    ({ areaId: "a", nombre: "A", dotacion, participantes, depositos: 0, participacion: 0, esMiArea: false });

  test("suma lo que le falta a cada área para llegar a su meta", () => {
    // 60 % de 20 son 12 (faltan 7); 60 % de 8 son 4,8 → 5 (falta 1).
    expect(personasQueFaltan(60, [area(20, 5), area(8, 4)])).toBe(8);
  });

  test("las áreas que ya llegaron no suman", () => {
    expect(personasQueFaltan(50, [area(10, 7), area(4, 1)])).toBe(1);
  });

  test("un área cuyo porcentaje redondeado llega a la meta no suma, igual que en avanceAreas", () => {
    const fila = { ...area(40, 11), participacion: porcentaje(11, 40) };
    expect(avanceAreas(28, [fila])[0].cumple).toBe(true);
    expect(personasQueFaltan(28, [fila])).toBe(0);
  });

  test("un área sin dotación no pide personas", () => {
    expect(personasQueFaltan(60, [area(0, 0)])).toBe(0);
  });
});
