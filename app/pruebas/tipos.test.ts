/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  CONTAMINANTES,
  KG_POR_TALLA,
  kgEfectivo,
  kgEstimado,
  nombreContenedor,
} from "../src/lib/tipos";
import { registro } from "./fabrica";

const reglas = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

describe("tabla de kilos por talla", () => {
  test("es la misma que exigen las reglas de Firestore", () => {
    // Si no coinciden, las reglas rechazan los depósitos que manda la app.
    const bloque = reglas.match(/function kgPorTalla\(\)\s*\{\s*return\s*(\{[\s\S]*?\});/);
    expect(bloque, "no encontré kgPorTalla en firestore.rules").not.toBeNull();
    const enReglas = JSON.parse(bloque![1].replace(/'/g, '"'));
    expect(enReglas).toEqual(KG_POR_TALLA);
  });

  test("una bolsa más grande siempre pesa más", () => {
    for (const tallas of Object.values(KG_POR_TALLA)) {
      expect(tallas.S).toBeLessThan(tallas.M);
      expect(tallas.M).toBeLessThan(tallas.L);
      expect(tallas.L).toBeLessThan(tallas.XL);
    }
  });

  test("kgEstimado lee la tabla", () => {
    expect(kgEstimado("Vidrio", "L")).toBe(8);
    expect(kgEstimado("Plástico", "S")).toBe(0.1);
  });
});

test("la lista de contaminantes es la misma que aceptan las reglas", () => {
  const lista = reglas.match(/contaminante in\s*(\[[^\]]*\])/);
  expect(lista, "no encontré la lista de contaminantes en firestore.rules").not.toBeNull();
  expect(JSON.parse(lista![1].replace(/'/g, '"'))).toEqual([...CONTAMINANTES]);
});

describe("kgEfectivo", () => {
  test("usa los kilos confirmados por el administrador si existen", () => {
    expect(kgEfectivo(registro({ kgDeclarado: 0.4, kgConfirmado: 0.8 }))).toBe(0.8);
  });

  test("si no, los declarados", () => {
    expect(kgEfectivo(registro({ kgDeclarado: 0.4, kgConfirmado: null }))).toBe(0.4);
  });

  test("un cero confirmado es cero, no los declarados", () => {
    expect(kgEfectivo(registro({ kgDeclarado: 0.4, kgConfirmado: 0 }))).toBe(0);
  });
});

test("nombreContenedor", () => {
  expect(nombreContenedor({ material: "Vidrio" })).toBe("Contenedor de vidrio");
  expect(nombreContenedor({ material: "Papel/cartón" })).toBe("Contenedor de papel/cartón");
  expect(nombreContenedor({ material: null })).toBe("Contenedor mixto");
});
