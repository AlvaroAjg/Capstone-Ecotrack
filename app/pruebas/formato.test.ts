import { afterEach, describe, expect, test, vi } from "vitest";
import {
  cantidadDeposito,
  esDeHoy,
  esDelMesActual,
  fechaCorta,
  formatKg,
  generarCodigoRetiro,
  generarCodigoVerificacion,
  porcentaje,
  sumaKg,
  tiempoRelativo,
} from "../src/lib/formato";
import { fecha, fijarAhora, registro } from "./fabrica";

afterEach(() => {
  vi.useRealTimers();
});

describe("kilos", () => {
  test("formatKg usa coma decimal y un decimal", () => {
    expect(formatKg(2)).toBe("2,0 kg");
    expect(formatKg(1.25)).toBe("1,3 kg");
  });

  test("sumaKg redondea a un decimal sin arrastrar error de coma flotante", () => {
    // 0.1 + 0.2 = 0.30000000000000004 en JavaScript.
    expect(sumaKg([0.1, 0.2])).toBe(0.3);
    expect(sumaKg([])).toBe(0);
  });

  test("cantidadDeposito muestra la talla, o solo los kilos en depósitos antiguos", () => {
    expect(cantidadDeposito(registro({ talla: "M", kgDeclarado: 0.4 }))).toBe("Talla M · ≈ 0,4 kg");
    expect(cantidadDeposito(registro({ talla: null, kgDeclarado: 2 }))).toBe("2,0 kg");
  });
});

describe("porcentaje", () => {
  test("redondea al entero", () => {
    expect(porcentaje(1, 3)).toBe(33);
  });

  test("no pasa de 100 ni baja de 0", () => {
    expect(porcentaje(250, 200)).toBe(100);
    expect(porcentaje(-5, 200)).toBe(0);
  });

  test("con total 0 da 0 en vez de dividir por cero", () => {
    expect(porcentaje(5, 0)).toBe(0);
  });
});

describe("fechas", () => {
  test("esDelMesActual", () => {
    fijarAhora(fecha(2026, 9, 16));
    expect(esDelMesActual(fecha(2026, 9, 1, 0))).toBe(true);
    expect(esDelMesActual(fecha(2026, 8, 31, 23))).toBe(false);
    expect(esDelMesActual(fecha(2025, 9, 16))).toBe(false);
    expect(esDelMesActual(null)).toBe(false);
  });

  test("esDeHoy", () => {
    fijarAhora(fecha(2026, 9, 16, 12));
    expect(esDeHoy(fecha(2026, 9, 16, 0))).toBe(true);
    expect(esDeHoy(fecha(2026, 9, 15, 23))).toBe(false);
    expect(esDeHoy(null)).toBe(false);
  });

  test("tiempoRelativo", () => {
    fijarAhora(fecha(2026, 9, 16, 12));
    const ahora = Date.now();
    expect(tiempoRelativo(ahora - 10_000)).toBe("recién");
    expect(tiempoRelativo(ahora - 5 * 60_000)).toBe("hace 5 min");
    expect(tiempoRelativo(ahora - 3 * 3_600_000)).toBe("hace 3 h");
    expect(tiempoRelativo(ahora - 30 * 3_600_000)).toBe("ayer");
    expect(tiempoRelativo(ahora - 5 * 86_400_000)).toBe("hace 5 días");
  });

  test("fechaCorta", () => {
    expect(fechaCorta(new Date(2026, 8, 3, 9, 5).getTime())).toBe("03/09 09:05");
    expect(fechaCorta(null)).toBe("-");
  });
});

describe("códigos", () => {
  // Sin 0/O ni 1/I, que se confunden al leerlos.
  const bloque = "[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}";

  test("de certificado: ECO-XXXX-XXXX", () => {
    for (let i = 0; i < 50; i++) {
      expect(generarCodigoVerificacion()).toMatch(new RegExp(`^ECO-${bloque}-${bloque}$`));
    }
  });

  test("de retiro: RET-XXXX", () => {
    for (let i = 0; i < 50; i++) {
      expect(generarCodigoRetiro()).toMatch(new RegExp(`^RET-${bloque}$`));
    }
  });
});
