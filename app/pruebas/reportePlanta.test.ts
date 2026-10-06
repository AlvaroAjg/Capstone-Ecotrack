import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mesesReportables, reporteDePlanta } from "../src/lib/reportePlanta";
import type { Incidencia, Registro } from "../src/lib/tipos";
import {
  EMBOTELLADO,
  FERMENTACION,
  PLANTA,
  certificado,
  fecha,
  fijarAhora,
  incidencia,
  registro,
  validado,
} from "./fabrica";

const HORA = 3_600_000;
const AREAS = [EMBOTELLADO, FERMENTACION];

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

/** El reporte de la planta piloto, con sus dos áreas. */
function reporte(mes: string, registros: Registro[], incidencias: Incidencia[] = []) {
  return reporteDePlanta(PLANTA, AREAS, mes, registros, incidencias);
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
  test("el mes actual y los meses con actividad de la planta, del más reciente al más antiguo", () => {
    const meses = mesesReportables(
      "planta-1",
      [
        registro({ creadoEn: fecha(2026, 6, 10) }),
        certificado({ creadoEn: fecha(2026, 7, 30), certificadoEn: fecha(2026, 8, 2) }),
        registro({ plantaId: "planta-2", creadoEn: fecha(2026, 3, 1) }),
      ],
      [incidencia({ reportadoEn: fecha(2026, 5, 20) })]
    );
    expect(meses).toEqual(["2026-09", "2026-08", "2026-07", "2026-06", "2026-05"]);
  });
});

describe("reporteDePlanta", () => {
  test("kilos: los certificados en el mes, por material", () => {
    const r = reporte(
      "2026-09",
      [
        certificado({ kgDeclarado: 0.4 }),
        certificado({ material: "Vidrio", talla: "L", kgDeclarado: 8 }),
        // Depositado en agosto y certificado en septiembre: suma a septiembre.
        certificado({ creadoEn: fecha(2026, 8, 30), certificadoEn: fecha(2026, 9, 1), kgDeclarado: 0.8, talla: "L" }),
        // Certificado en agosto: no suma.
        certificado({ creadoEn: fecha(2026, 8, 3), certificadoEn: fecha(2026, 8, 5), kgDeclarado: 5 }),
        validado({ kgDeclarado: 12 }),
        certificado({ plantaId: "planta-2", kgDeclarado: 3 }),
      ]
    );
    expect(r.kgCertificados).toBe(9.2);
    expect(r.porMaterial).toEqual([
      { material: "Plástico", kg: 1.2, depositos: 2 },
      { material: "Vidrio", kg: 8, depositos: 1 },
    ]);
  });

  test("depósitos del mes según en qué quedaron", () => {
    const r = reporte(
      "2026-09",
      [
        registro(),
        registro(),
        validado(),
        certificado(),
        registro({ estado: "rechazado" }),
        registro({ creadoEn: fecha(2026, 8, 20) }),
      ]
    );
    expect(r.depositos).toEqual({ total: 5, pendientes: 2, validados: 1, certificados: 1, rechazados: 1 });
  });

  test("participación: personas con algún depósito del mes que no fue rechazado, sobre la dotación de la planta", () => {
    const r = reporte("2026-09", [
      registro({ colaboradorId: "ana" }),
      validado({ colaboradorId: "ana" }),
      certificado({ colaboradorId: "beto", areaId: "fermentacion" }),
      registro({ colaboradorId: "eva", estado: "rechazado" }),
    ]);
    expect(r.participantes).toBe(2);
    expect(r.dotacion).toBe(30);
    expect(r.participacion).toBe(7);
  });

  test("áreas por kilos certificados, de más a menos, sin nombres de personas", () => {
    const r = reporte("2026-09", [
      certificado({ kgDeclarado: 0.4 }),
      certificado({ areaId: "fermentacion", material: "Vidrio", talla: "L", kgDeclarado: 8 }),
      certificado({ kgDeclarado: 0.8, talla: "L" }),
      validado({ areaId: "fermentacion", kgDeclarado: 12 }),
    ]);
    expect(r.areas).toEqual([
      { area: "Fermentación", kg: 8, depositos: 1 },
      { area: "Embotellado", kg: 1.2, depositos: 2 },
    ]);
    expect(JSON.stringify(r)).not.toContain("Ana");
  });

  test("tiempos de la cadena y el porcentaje dentro de 48 horas", () => {
    const r = reporte(
      "2026-09",
      [conTiempos(2, 20), conTiempos(10, 30), conTiempos(24, 36)]
    );
    expect(r.horasHastaValidacion).toBe(12);
    expect(r.horasHastaRetiro).toBe(28.7);
    expect(r.horasCadena).toBe(40.7);
    // 22 h y 40 h cumplen; 60 h no.
    expect(r.dentroDe48h).toBe(67);
  });

  test("sin certificados, los tiempos quedan sin datos en vez de 0", () => {
    const r = reporte("2026-09", [registro()]);
    expect(r).toMatchObject({ horasCadena: null, dentroDe48h: null, kgCertificados: 0, retiros: 0 });
  });

  test("retiros: los distintos en que salió lo certificado en el mes", () => {
    const r = reporte(
      "2026-09",
      [
        certificado({ retiroId: "RET-AAAA" }),
        certificado({ retiroId: "RET-AAAA" }),
        certificado({ retiroId: "RET-BBBB" }),
      ]
    );
    expect(r.retiros).toBe(2);
  });

  test("contaminaciones de la planta en el mes, de la más antigua a la más reciente", () => {
    const r = reporte(
      "2026-09",
      [],
      [
        incidencia({ id: "tarde", reportadoEn: fecha(2026, 9, 12) }),
        incidencia({ id: "temprano", reportadoEn: fecha(2026, 9, 2) }),
        incidencia({ id: "agosto", reportadoEn: fecha(2026, 8, 30) }),
        incidencia({ id: "otraPlanta", plantaId: "planta-2" }),
      ]
    );
    expect(r.contaminaciones.map((i) => i.id)).toEqual(["temprano", "tarde"]);
  });

  test("enCurso solo para el mes actual", () => {
    expect(reporte("2026-09", []).enCurso).toBe(true);
    expect(reporte("2026-08", [])).toMatchObject({
      enCurso: false,
      etiqueta: "agosto de 2026",
    });
  });
});
