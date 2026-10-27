import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  indicadoresDelMes,
  inicioDeRonda,
  kilosPorMaterial,
  rondaDeHoy,
  rondaPorPunto,
  ultimaActividad,
  validadosPorSemana,
  type FilaRonda,
} from "../src/lib/resumenPanel";
import {
  certificado,
  contenedor,
  fecha,
  fijarAhora,
  incidencia,
  registro,
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
  test("cuenta y pesa los validados del mes elegido, no los de otros meses", () => {
    const registros = [
      validado({ validadoEn: fecha(2026, 9, 3), kgDeclarado: 0.4 }),
      certificado({ validadoEn: fecha(2026, 9, 10), kgDeclarado: 1.2 }),
      validado({ validadoEn: fecha(2026, 8, 28), kgDeclarado: 5 }),
      registro(),
      registro(),
      registro({ estado: "rechazado", validadoEn: fecha(2026, 9, 10) }),
    ];
    expect(indicadoresDelMes(registros, [], "2026-09")).toMatchObject({
      validados: 2,
      kgEstimados: 1.6,
      porValidar: 2,
    });
    expect(indicadoresDelMes(registros, [], "2026-08")).toMatchObject({ validados: 1, kgEstimados: 5 });
  });

  test("una ronda es un día con validaciones, rechazos o reportes; se compara con los días hábiles", () => {
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
    const ind = indicadoresDelMes(registros, incidencias, "2026-09");
    // 3, 7 y 10 de septiembre.
    expect(ind.rondas).toBe(3);
    expect(ind.conObservacion).toBe(1);
    // Del martes 1 al miércoles 16 de septiembre hay 12 días de lunes a viernes.
    expect(ind.diasHabiles).toBe(12);
    // Un mes que ya terminó cuenta todos sus días hábiles: agosto de 2026 tiene 21.
    expect(indicadoresDelMes([], [], "2026-08").diasHabiles).toBe(21);
  });

  test("un lote es un contenedor revisado en un día; sin material si se rechazó", () => {
    const registros = [
      validado({ contenedor: "PLA111", validadoEn: fecha(2026, 9, 3, 8) }),
      validado({ contenedor: "PLA111", validadoEn: fecha(2026, 9, 3, 9) }),
      validado({ contenedor: "VID222", validadoEn: fecha(2026, 9, 3, 8) }),
      registro({ contenedor: "PLA111", estado: "rechazado", validadoEn: fecha(2026, 9, 7) }),
      registro({ contenedor: "PLA111", estado: "rechazado", validadoEn: fecha(2026, 9, 7) }),
    ];
    expect(indicadoresDelMes(registros, [], "2026-09")).toMatchObject({ lotesRevisados: 3, sinMaterial: 1 });
  });
});

describe("validadosPorSemana", () => {
  test("de lunes a domingo, cortadas en el borde del mes, con la de hoy en curso", () => {
    const semanas = validadosPorSemana(
      [
        validado({ validadoEn: fecha(2026, 9, 2) }),
        validado({ validadoEn: fecha(2026, 9, 6) }),
        certificado({ validadoEn: fecha(2026, 9, 15) }),
        registro({ estado: "rechazado", validadoEn: fecha(2026, 9, 15) }),
        validado({ validadoEn: fecha(2026, 8, 31) }),
      ],
      "2026-09"
    );
    // Septiembre de 2026 parte un martes.
    expect(semanas).toEqual([
      { etiqueta: "1–6 sep", validados: 2, enCurso: false, futura: false },
      { etiqueta: "7–13 sep", validados: 0, enCurso: false, futura: false },
      { etiqueta: "14–20 sep", validados: 1, enCurso: true, futura: false },
      { etiqueta: "21–27 sep", validados: 0, enCurso: false, futura: true },
      { etiqueta: "28–30 sep", validados: 0, enCurso: false, futura: true },
    ]);
  });
});

describe("kilosPorMaterial", () => {
  test("los kilos validados del mes por material, de más a menos, con su porcentaje", () => {
    const materiales = kilosPorMaterial(
      [
        validado({ material: "Plástico", kgDeclarado: 0.4, validadoEn: fecha(2026, 9, 3) }),
        validado({ material: "Vidrio", talla: "M", kgDeclarado: 4, validadoEn: fecha(2026, 9, 4) }),
        certificado({ material: "Plástico", kgDeclarado: 0.8, validadoEn: fecha(2026, 9, 5) }),
        registro({ material: "Metal", kgDeclarado: 3 }),
        validado({ material: "Metal", kgDeclarado: 3, validadoEn: fecha(2026, 8, 30) }),
      ],
      "2026-09"
    );
    expect(materiales).toEqual([
      { material: "Vidrio", kg: 4, depositos: 1, porcentaje: 77 },
      { material: "Plástico", kg: 1.2, depositos: 2, porcentaje: 23 },
    ]);
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

describe("rondaPorPunto", () => {
  const fila = (cambios: Partial<FilaRonda>): FilaRonda => ({
    codigo: "K7QM9X",
    nombre: "Contenedor mixto",
    punto: "Casino",
    estado: "vacio",
    revisados: 0,
    pendientes: 0,
    revisadoEn: null,
    ...cambios,
  });

  test("agrupa los contenedores por punto y deja fuera los que no tienen nada que revisar", () => {
    const puntos = rondaPorPunto([
      fila({ codigo: "A", punto: "Bodega", estado: "conforme" }),
      fila({ codigo: "B", punto: "Casino", estado: "conforme" }),
      fila({ codigo: "C", punto: "Casino", estado: "vacio" }),
      fila({ codigo: "D", punto: "Patio", estado: "vacio" }),
    ]);
    expect(puntos).toEqual([
      { punto: "Bodega", estado: "conforme", contenedores: 1, pendientes: 0 },
      { punto: "Casino", estado: "conforme", contenedores: 1, pendientes: 0 },
    ]);
  });

  test("el punto sigue pendiente mientras le quede un contenedor por revisar", () => {
    const [casino] = rondaPorPunto([
      fila({ codigo: "A", estado: "observacion" }),
      fila({ codigo: "B", estado: "pendiente", pendientes: 2 }),
    ]);
    expect(casino).toMatchObject({ estado: "pendiente", contenedores: 2, pendientes: 2 });
  });

  test("revisado entero, toma el estado más grave de sus contenedores", () => {
    const [casino] = rondaPorPunto([
      fila({ codigo: "A", estado: "conforme" }),
      fila({ codigo: "B", estado: "observacion" }),
      fila({ codigo: "C", estado: "sinMaterial" }),
    ]);
    expect(casino.estado).toBe("observacion");
  });

  test("un contenedor sin punto se agrupa como Sin punto", () => {
    expect(rondaPorPunto([fila({ punto: "", estado: "pendiente" })])[0].punto).toBe("Sin punto");
  });
});

describe("inicioDeRonda", () => {
  test("null si hoy nadie ha revisado nada", () => {
    const registros = [validado({ validadoEn: fecha(2026, 9, 15, 9) }), registro()];
    expect(inicioDeRonda(registros, [])).toBeNull();
  });

  test("quién hizo la primera revisión del día y a qué hora", () => {
    const registros = [
      validado({ validadoEn: fecha(2026, 9, 16, 9), validadoPor: "vale" }),
      registro({ estado: "rechazado", validadoEn: fecha(2026, 9, 16, 8) + 30 * 60_000, validadoPor: "vale" }),
    ];
    expect(inicioDeRonda(registros, [])).toEqual({ validadorId: "vale", desde: fecha(2026, 9, 16, 8) + 30 * 60_000 });
  });

  test("un reporte de contaminación también cuenta como inicio", () => {
    const registros = [validado({ validadoEn: fecha(2026, 9, 16, 9), validadoPor: "vale" })];
    const incidencias = [incidencia({ reportadoEn: fecha(2026, 9, 16, 8), reportadoPor: "tomas" })];
    expect(inicioDeRonda(registros, incidencias)).toEqual({ validadorId: "tomas", desde: fecha(2026, 9, 16, 8) });
  });
});

describe("ultimaActividad", () => {
  test("null sin depósitos ni reportes", () => {
    expect(ultimaActividad([], [])).toBeNull();
  });

  test("lo último entre depósitos, validaciones, certificaciones y reportes", () => {
    const registros = [
      registro({ creadoEn: fecha(2026, 9, 14) }),
      certificado({ creadoEn: fecha(2026, 9, 15, 8) }),
    ];
    const incidencias = [incidencia({ reportadoEn: fecha(2026, 9, 15, 7) })];
    // El certificado se emitió dos minutos después de crearse el depósito (ver fabrica.ts).
    expect(ultimaActividad(registros, incidencias)).toBe(fecha(2026, 9, 15, 8) + 120_000);
  });

  test("un reporte posterior a todo lo demás", () => {
    const incidencias = [incidencia({ reportadoEn: fecha(2026, 9, 16, 11) })];
    expect(ultimaActividad([registro()], incidencias)).toBe(fecha(2026, 9, 16, 11));
  });
});
