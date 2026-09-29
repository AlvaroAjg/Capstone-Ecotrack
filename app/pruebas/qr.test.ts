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
    expect(interpretarQr(contenidoQr("torre-a", codigo), "torre-a")).toEqual({ ok: true, codigo });
  });
});

describe("interpretarQr", () => {
  test("acepta el QR de un contenedor de su torre", () => {
    expect(interpretarQr("ECOTRACK:torre-a:K7QM9X", "torre-a")).toEqual({ ok: true, codigo: "K7QM9X" });
  });

  test("rechaza el QR de otra torre", () => {
    const r = interpretarQr("ECOTRACK:torre-b:K7QM9X", "torre-a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("otra torre");
  });

  test("acepta el código escrito a mano, con minúsculas, espacios o guiones", () => {
    expect(interpretarQr("k7qm9x", "torre-a")).toEqual({ ok: true, codigo: "K7QM9X" });
    expect(interpretarQr(" K7Q-M9X ", "torre-a")).toEqual({ ok: true, codigo: "K7QM9X" });
    expect(interpretarQr("K7Q M9X", "torre-a")).toEqual({ ok: true, codigo: "K7QM9X" });
  });

  test("rechaza los QR antiguos (T-A-01) con un mensaje que lo explica", () => {
    const r = interpretarQr("T-A-01", "torre-a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("antiguo");
  });

  test("rechaza códigos con otro largo o con caracteres que no se usan", () => {
    for (const texto of ["K7QM9", "K7QM9XX", "K7QM90", "K7QMOX", "K7QM1X"]) {
      expect(interpretarQr(texto, "torre-a").ok).toBe(false);
    }
  });

  test("rechaza un QR de EcoTrack mal formado", () => {
    expect(interpretarQr("ECOTRACK:torre-a", "torre-a").ok).toBe(false);
    expect(interpretarQr("ECOTRACK:torre-a:K7QM9X:extra", "torre-a").ok).toBe(false);
  });

  test("pide el código si viene vacío", () => {
    expect(interpretarQr("   ", "torre-a")).toEqual({ ok: false, error: "Ingresa el código del contenedor." });
  });

  test("sin torre no se puede depositar", () => {
    expect(interpretarQr("K7QM9X", null).ok).toBe(false);
  });
});

test("matrizQr es cuadrada y tiene módulos oscuros", () => {
  const matriz = matrizQr("ECOTRACK:torre-a:K7QM9X");
  expect(matriz.length).toBeGreaterThanOrEqual(21);
  expect(matriz.every((fila) => fila.length === matriz.length)).toBe(true);
  expect(matriz.flat().some(Boolean)).toBe(true);
});
