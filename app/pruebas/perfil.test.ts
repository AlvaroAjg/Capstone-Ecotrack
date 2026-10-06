import { describe, expect, test } from "vitest";
import { normalizarNombre, validarContrasenaNueva, validarNombre } from "../src/lib/perfil";

describe("nombre", () => {
  test("se limpian los espacios de más", () => {
    expect(normalizarNombre("  Ana   María  Pérez ")).toBe("Ana María Pérez");
  });

  test("entre 3 y 60 caracteres, contados sin los espacios de más", () => {
    expect(validarNombre("Ana")).toBeUndefined();
    expect(validarNombre("  Al  ")).toBeDefined();
    expect(validarNombre("a".repeat(61))).toBeDefined();
  });
});

describe("cambio de contraseña", () => {
  test("válido", () => {
    expect(validarContrasenaNueva("vieja1", "nueva12", "nueva12")).toBeUndefined();
  });

  test("pide la actual", () => {
    expect(validarContrasenaNueva("", "nueva12", "nueva12")).toBe("Ingresa tu contraseña actual.");
  });

  test("al menos 6 caracteres", () => {
    expect(validarContrasenaNueva("vieja1", "corta", "corta")).toContain("al menos 6");
  });

  test("distinta de la actual", () => {
    expect(validarContrasenaNueva("vieja1", "vieja1", "vieja1")).toContain("distinta");
  });

  test("repetida igual", () => {
    expect(validarContrasenaNueva("vieja1", "nueva12", "nueva13")).toContain("no coinciden");
  });
});
