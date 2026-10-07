import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { observacionesDelMes, rondasDelMes } from "../src/lib/rondas";
import { contenedor, fecha, fijarAhora, incidencia, registro, validado } from "./fabrica";

// Los tests corren el miércoles 16 de septiembre de 2026 al mediodía.
beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

/** El estado del día `d` de septiembre. */
function estadoDel(dias: ReturnType<typeof rondasDelMes>, d: number) {
  return dias[d - 1].estado;
}

describe("rondasDelMes", () => {
  test("un día por cada día del mes; los que no llegan son futuro", () => {
    const dias = rondasDelMes([], []);
    expect(dias).toHaveLength(30);
    expect(estadoDel(dias, 1)).toBe("sinDepositos");
    expect(estadoDel(dias, 17)).toBe("futuro");
  });

  test("completada si ese día se validó algo", () => {
    const dias = rondasDelMes(
      [validado({ creadoEn: fecha(2026, 9, 2, 9), validadoEn: fecha(2026, 9, 3, 8) })],
      []
    );
    expect(estadoDel(dias, 3)).toBe("completada");
    expect(dias[2].revisados).toBe(1);
  });

  test("no realizada si había depósitos esperando y no se revisó nada", () => {
    // Registrado el 2 y validado recién el 4: el 2 y el 3 terminaron con él esperando.
    const dias = rondasDelMes(
      [validado({ creadoEn: fecha(2026, 9, 2, 9), validadoEn: fecha(2026, 9, 4, 8) })],
      []
    );
    expect(estadoDel(dias, 2)).toBe("noRealizada");
    expect(estadoDel(dias, 3)).toBe("noRealizada");
    expect(estadoDel(dias, 4)).toBe("completada");
    expect(estadoDel(dias, 5)).toBe("sinDepositos");
  });

  test("un reporte de contaminación también cuenta como ronda", () => {
    const dias = rondasDelMes(
      [registro({ creadoEn: fecha(2026, 9, 7, 9) })],
      [incidencia({ reportadoEn: fecha(2026, 9, 8, 8) })]
    );
    expect(estadoDel(dias, 8)).toBe("completada");
  });

  test("hoy, con depósitos esperando y sin revisar, está en curso", () => {
    const dias = rondasDelMes([registro({ creadoEn: fecha(2026, 9, 16, 9) })], []);
    expect(estadoDel(dias, 16)).toBe("enCurso");
    expect(dias[15].pendientes).toBe(1);
  });
});

describe("observacionesDelMes", () => {
  const CONTENEDORES = [contenedor({ codigo: "PAP111", punto: "Casino", material: "Papel/cartón" })];

  test("reportes y rechazos del mes, el más reciente primero", () => {
    const obs = observacionesDelMes(
      [
        registro({ contenedor: "PAP111", estado: "rechazado", validadoEn: fecha(2026, 9, 10, 8) }),
        registro({ contenedor: "PAP111", estado: "rechazado", validadoEn: fecha(2026, 9, 10, 9) }),
        registro({ contenedor: "PAP111", estado: "rechazado", validadoEn: fecha(2026, 8, 30) }),
      ],
      [incidencia({ contenedor: "PAP111", contaminante: "Vidrio", reportadoEn: fecha(2026, 9, 12) })],
      CONTENEDORES
    );
    expect(obs).toEqual([
      {
        fecha: fecha(2026, 9, 12),
        codigo: "PAP111",
        contenedor: "Contenedor de papel/cartón",
        punto: "Casino",
        tipo: "observacion",
        detalle: "Se encontró vidrio",
      },
      {
        fecha: fecha(2026, 9, 10, 9),
        codigo: "PAP111",
        contenedor: "Contenedor de papel/cartón",
        punto: "Casino",
        tipo: "sinMaterial",
        detalle: "2 depósitos rechazados",
      },
    ]);
  });
});
