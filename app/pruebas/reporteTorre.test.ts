import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mesesReportables, reporteDeTorre } from "../src/lib/reporteTorre";
import type { Incidencia, Mision } from "../src/lib/tipos";
import { TORRE_A, certificado, fecha, fijarAhora, registro, validado } from "./fabrica";

const HORA = 3_600_000;

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

function incidencia(cambios: Partial<Incidencia> = {}): Incidencia {
  return {
    id: "i1",
    torreId: "torre-a",
    torreNombre: "Torre A",
    contenedor: "K7QM9X",
    contenedorNombre: "Contenedor de papel/cartón",
    contaminante: "Vidrio",
    reportadoEn: fecha(2026, 9, 10),
    reportadoPor: "carla",
    atendida: false,
    atendidaEn: null,
    codigoRetiro: null,
    ...cambios,
  };
}

/** Un depósito que recorrió la cadena en `horasValidar` + `horasRetirar` horas. */
function conTiempos(horasValidar: number, horasRetirar: number, cambios = {}) {
  const creadoEn = fecha(2026, 9, 5);
  return certificado({
    creadoEn,
    validadoEn: creadoEn + horasValidar * HORA,
    certificadoEn: creadoEn + (horasValidar + horasRetirar) * HORA,
    ...cambios,
  });
}

describe("mesesReportables", () => {
  test("el mes actual y los meses con actividad de la torre, del más reciente al más antiguo", () => {
    const meses = mesesReportables(
      "torre-a",
      [
        registro({ creadoEn: fecha(2026, 6, 10) }),
        certificado({ creadoEn: fecha(2026, 7, 30), certificadoEn: fecha(2026, 8, 2) }),
        registro({ torreId: "torre-b", creadoEn: fecha(2026, 3, 1) }),
      ],
      [incidencia({ reportadoEn: fecha(2026, 5, 20) })]
    );
    expect(meses).toEqual(["2026-09", "2026-08", "2026-07", "2026-06", "2026-05"]);
  });
});

describe("reporteDeTorre", () => {
  test("kilos: los certificados en el mes, por material", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [
        certificado({ kgDeclarado: 0.4 }),
        certificado({ material: "Vidrio", talla: "L", kgDeclarado: 8 }),
        // Depositado en agosto y certificado en septiembre: suma a septiembre.
        certificado({ creadoEn: fecha(2026, 8, 30), certificadoEn: fecha(2026, 9, 1), kgDeclarado: 0.8, talla: "L" }),
        // Certificado en agosto: no suma.
        certificado({ creadoEn: fecha(2026, 8, 3), certificadoEn: fecha(2026, 8, 5), kgDeclarado: 5 }),
        validado({ kgDeclarado: 12 }),
        certificado({ torreId: "torre-b", kgDeclarado: 3 }),
      ],
      [],
      null
    );
    expect(r.kgCertificados).toBe(9.2);
    expect(r.porMaterial).toEqual([
      { material: "Plástico", kg: 1.2, depositos: 2 },
      { material: "Vidrio", kg: 8, depositos: 1 },
    ]);
  });

  test("depósitos del mes según en qué quedaron", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [
        registro(),
        registro(),
        validado(),
        certificado(),
        registro({ estado: "rechazado" }),
        registro({ creadoEn: fecha(2026, 8, 20) }),
      ],
      [],
      null
    );
    expect(r.depositos).toEqual({ total: 5, pendientes: 2, validados: 1, certificados: 1, rechazados: 1 });
  });

  test("participación: departamentos con algún depósito del mes que no fue rechazado", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [
        registro({ depto: "Depto 101" }),
        validado({ depto: "Depto 101" }),
        certificado({ depto: "Depto 102" }),
        registro({ depto: "Depto 103", estado: "rechazado" }),
      ],
      [],
      null
    );
    expect(r.deptosActivos).toBe(2);
    expect(r.participacion).toBe(10);
  });

  test("departamentos por kilos certificados, de más a menos, sin nombres", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [
        certificado({ depto: "Depto 101", kgDeclarado: 0.4 }),
        certificado({ depto: "Depto 202", material: "Vidrio", talla: "L", kgDeclarado: 8 }),
        certificado({ depto: "Depto 101", kgDeclarado: 0.8, talla: "L" }),
        validado({ depto: "Depto 303", kgDeclarado: 12 }),
      ],
      [],
      null
    );
    expect(r.deptos).toEqual([
      { depto: "Depto 202", kg: 8, depositos: 1 },
      { depto: "Depto 101", kg: 1.2, depositos: 2 },
    ]);
    expect(JSON.stringify(r.deptos)).not.toContain("Ana");
  });

  test("tiempos de la cadena y el porcentaje dentro de 48 horas", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [conTiempos(2, 20), conTiempos(10, 30), conTiempos(24, 36)],
      [],
      null
    );
    expect(r.horasHastaValidacion).toBe(12);
    expect(r.horasHastaRetiro).toBe(28.7);
    expect(r.horasCadena).toBe(40.7);
    // 22 h y 40 h cumplen; 60 h no.
    expect(r.dentroDe48h).toBe(67);
  });

  test("sin certificados, los tiempos quedan sin datos en vez de 0", () => {
    const r = reporteDeTorre(TORRE_A, "2026-09", [registro()], [], null);
    expect(r).toMatchObject({ horasCadena: null, dentroDe48h: null, kgCertificados: 0, retiros: 0 });
  });

  test("retiros: lotes distintos del gestor en el mes", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [
        certificado({ codigoRetiro: "RET-AAAA" }),
        certificado({ codigoRetiro: "RET-AAAA" }),
        certificado({ codigoRetiro: "RET-BBBB" }),
      ],
      [],
      null
    );
    expect(r.retiros).toBe(2);
  });

  test("contaminaciones de la torre en el mes, de la más antigua a la más reciente", () => {
    const r = reporteDeTorre(
      TORRE_A,
      "2026-09",
      [],
      [
        incidencia({ id: "tarde", reportadoEn: fecha(2026, 9, 12) }),
        incidencia({ id: "temprano", reportadoEn: fecha(2026, 9, 2) }),
        incidencia({ id: "agosto", reportadoEn: fecha(2026, 8, 30) }),
        incidencia({ id: "otraTorre", torreId: "torre-b" }),
      ],
      null
    );
    expect(r.contaminaciones.map((i) => i.id)).toEqual(["temprano", "tarde"]);
  });

  test("meta: la de la misión vigente de la torre, o la base", () => {
    const mision: Mision = { torreId: "torre-a", metaKg: 16, incentivo: "", actualizadaEn: 0, actualizadaPor: "carla" };
    const registros = [certificado({ material: "Vidrio", talla: "L", kgDeclarado: 8 })];
    expect(reporteDeTorre(TORRE_A, "2026-09", registros, [], mision)).toMatchObject({ metaKg: 16, avanceMeta: 50 });
    expect(reporteDeTorre(TORRE_A, "2026-09", registros, [], null)).toMatchObject({ metaKg: 200, avanceMeta: 4 });
  });

  test("enCurso solo para el mes actual", () => {
    expect(reporteDeTorre(TORRE_A, "2026-09", [], [], null).enCurso).toBe(true);
    expect(reporteDeTorre(TORRE_A, "2026-08", [], [], null)).toMatchObject({
      enCurso: false,
      etiqueta: "agosto de 2026",
    });
  });
});
