import { expect, test } from "vitest";
import { mesDe } from "../src/lib/certificadoMensual";
import { idParticipacion, idResumen } from "../src/lib/resumenMes";
import { fecha } from "./fabrica";

test("el resumen es uno por planta y mes", () => {
  expect(idResumen("chadwick", "2026-10")).toBe("chadwick_2026-10");
});

test("la participación es una por mes y persona", () => {
  expect(idParticipacion("2026-10", "ana")).toBe("2026-10_ana");
});

test("el mes de un depósito sale de su fecha local, con dos dígitos", () => {
  expect(mesDe(fecha(2026, 9, 30, 23))).toBe("2026-09");
  expect(mesDe(fecha(2026, 10, 1, 0))).toBe("2026-10");
});
