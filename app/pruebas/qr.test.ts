import { describe, expect, test } from "vitest";
import {
  contenidoQr,
  generarCodigoContenedor,
  interpretarQr,
  matrizQr,
} from "../src/lib/qr";

describe("código de contenedor", () => {
  test("tiene 6 caracteres sin letras ni números que se confundan", () => {
    for (let i = 0; i < 100; i++) {
      expect(generarCodigoContenedor()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  test("lo que se imprime en el QR se vuelve a leer igual", () => {
    const codigo = generarCodigoContenedor();
    expect(interpretarQr(contenidoQr("planta-1", codigo), "planta-1")).toEqual({ ok: true, codigo });
  });
});

describe("interpretarQr", () => {
  test("acepta el QR de un contenedor de su planta", () => {
    expect(interpretarQr("ECOTRACK:planta-1:K7QM9X", "planta-1")).toEqual({ ok: true, codigo: "K7QM9X" });
  });

  test("rechaza el QR de otra planta", () => {
    const r = interpretarQr("ECOTRACK:planta-2:K7QM9X", "planta-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("otra planta");
  });

  test("acepta el código escrito a mano, con minúsculas, espacios o guiones", () => {
    expect(interpretarQr("k7qm9x", "planta-1")).toEqual({ ok: true, codigo: "K7QM9X" });
    expect(interpretarQr(" K7Q-M9X ", "planta-1")).toEqual({ ok: true, codigo: "K7QM9X" });
    expect(interpretarQr("K7Q M9X", "planta-1")).toEqual({ ok: true, codigo: "K7QM9X" });
  });

  test("rechaza los QR antiguos (T-A-01) con un mensaje que lo explica", () => {
    const r = interpretarQr("T-A-01", "planta-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("antiguo");
  });

  test("rechaza códigos con otro largo o con caracteres que no se usan", () => {
    for (const texto of ["K7QM9", "K7QM9XX", "K7QM90", "K7QMOX", "K7QM1X"]) {
      expect(interpretarQr(texto, "planta-1").ok).toBe(false);
    }
  });

  test("rechaza un QR de EcoTrack mal formado", () => {
    expect(interpretarQr("ECOTRACK:planta-1", "planta-1").ok).toBe(false);
    expect(interpretarQr("ECOTRACK:planta-1:K7QM9X:extra", "planta-1").ok).toBe(false);
  });

  test("pide el código si viene vacío", () => {
    expect(interpretarQr("   ", "planta-1")).toEqual({ ok: false, error: "Ingresa el código del contenedor." });
  });

  test("sin planta no se puede depositar", () => {
    expect(interpretarQr("K7QM9X", null).ok).toBe(false);
  });
});

test("matrizQr es cuadrada y tiene módulos oscuros", () => {
  const matriz = matrizQr("ECOTRACK:planta-1:K7QM9X");
  expect(matriz.length).toBeGreaterThanOrEqual(21);
  expect(matriz.every((fila) => fila.length === matriz.length)).toBe(true);
  expect(matriz.flat().some(Boolean)).toBe(true);
});
