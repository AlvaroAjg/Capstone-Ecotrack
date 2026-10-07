import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { rankingDeAreas } from "../src/lib/derivados";
import { indicadoresDelMes, rondaDeHoy } from "../src/lib/resumenPanel";
import {
  EMBOTELLADO,
  FERMENTACION,
  certificado,
  contenedor,
  fecha,
  fijarAhora,
  incidencia,
  registro,
  resumen,
  validado,
} from "./fabrica";

// Los tests corren el miércoles 16 de septiembre de 2026 al mediodía.
beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("indicadoresDelMes", () => {
  const ranking = rankingDeAreas(
    [EMBOTELLADO, FERMENTACION],
    resumen({
      embotellado: { depositos: 9, participantes: 6 },
      fermentacion: { depositos: 4, participantes: 3 },
    }),
    null
  );

  test("participación de la planta: participantes de todas las áreas ÷ su dotación", () => {
    const ind = indicadoresDelMes([], [], ranking);
    // 9 de 30 personas.
    expect(ind).toMatchObject({ participacion: 30, participantes: 9, dotacion: 30 });
  });

  test("cuenta y pesa los validados del mes, no los de meses anteriores", () => {
    const registros = [
      validado({ validadoEn: fecha(2026, 9, 3), kgDeclarado: 0.4 }),
      certificado({ validadoEn: fecha(2026, 9, 10), kgDeclarado: 1.2 }),
      validado({ validadoEn: fecha(2026, 8, 28), kgDeclarado: 5 }),
      registro(),
      registro(),
      registro({ estado: "rechazado", validadoEn: fecha(2026, 9, 10) }),
    ];
    const ind = indicadoresDelMes(registros, [], ranking);
    expect(ind).toMatchObject({ validados: 2, kgEstimados: 1.6, porValidar: 2 });
  });

  test("una ronda es un día con validaciones, rechazos o reportes", () => {
    const registros = [
      validado({ validadoEn: fecha(2026, 9, 3, 8) }),
      validado({ validadoEn: fecha(2026, 9, 3, 9) }),
      registro({ estado: "rechazado", validadoEn: fecha(2026, 9, 7) }),
      validado({ validadoEn: fecha(2026, 8, 31) }),
    ];
    const incidencias = [
      incidencia({ reportadoEn: fecha(2026, 9, 10) }),
      incidencia({ id: "i2", reportadoEn: fecha(2026, 8, 20) }),
    ];
    const ind = indicadoresDelMes(registros, incidencias, ranking);
    // 3, 7 y 10 de septiembre.
    expect(ind.rondas).toBe(3);
    expect(ind.conObservacion).toBe(1);
  });
});

describe("rondaDeHoy", () => {
  const PLASTICO = contenedor({ codigo: "PLA111", punto: "Casino", material: "Plástico" });
  const VIDRIO = contenedor({ codigo: "VID222", punto: "Bodega", material: "Vidrio" });
  const PAPEL = contenedor({ codigo: "PAP333", punto: "Casino", material: "Papel/cartón" });
  const VIEJO = contenedor({ codigo: "OLD444", punto: "Casino", activo: false });
  const CONTENEDORES = [PLASTICO, VIDRIO, PAPEL, VIEJO];

  test("un contenedor por fila, activos y ordenados por punto limpio", () => {
    const filas = rondaDeHoy([], [], CONTENEDORES);
    expect(filas.map((f) => f.codigo)).toEqual(["VID222", "PAP333", "PLA111"]);
    expect(filas.every((f) => f.estado === "vacio")).toBe(true);
  });

  test("conforme si hoy se validó, con la hora de la última revisión", () => {
    const registros = [
      validado({ contenedor: "PLA111", validadoEn: fecha(2026, 9, 16, 8) }),
      validado({ contenedor: "PLA111", validadoEn: fecha(2026, 9, 16, 9) }),
      validado({ contenedor: "PLA111", validadoEn: fecha(2026, 9, 15, 9) }),
    ];
    const fila = rondaDeHoy(registros, [], CONTENEDORES).find((f) => f.codigo === "PLA111");
    expect(fila).toMatchObject({
      estado: "conforme",
      revisados: 2,
      revisadoEn: fecha(2026, 9, 16, 9),
    });
  });

  test("el reporte de contaminación pesa más que el resto", () => {
    const registros = [validado({ contenedor: "PAP333", validadoEn: fecha(2026, 9, 16, 8) })];
    const incidencias = [incidencia({ contenedor: "PAP333", reportadoEn: fecha(2026, 9, 16, 8) })];
    const fila = rondaDeHoy(registros, incidencias, CONTENEDORES).find((f) => f.codigo === "PAP333");
    expect(fila?.estado).toBe("observacion");
  });

  test("sin material si hoy se rechazó la tanda", () => {
    const registros = [
      registro({ contenedor: "VID222", estado: "rechazado", validadoEn: fecha(2026, 9, 16, 8) }),
    ];
    const fila = rondaDeHoy(registros, [], CONTENEDORES).find((f) => f.codigo === "VID222");
    expect(fila?.estado).toBe("sinMaterial");
  });

  test("pendiente si tiene depósitos esperando y hoy no se ha revisado", () => {
    const registros = [registro({ contenedor: "PLA111" }), registro({ contenedor: "PLA111" })];
    const fila = rondaDeHoy(registros, [], CONTENEDORES).find((f) => f.codigo === "PLA111");
    expect(fila).toMatchObject({ estado: "pendiente", pendientes: 2, revisadoEn: null });
  });
});
