import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { certificadoDelMes } from "../src/lib/certificadoMensual";
import { generarCertificadoPdf } from "../src/lib/certificadoPdf.web";
import { generarReportePdf } from "../src/lib/reportePdf.web";
import { reporteDeTorre } from "../src/lib/reporteTorre";
import type { Incidencia } from "../src/lib/tipos";
import { TORRE_A, certificado, fecha, fijarAhora, registro } from "./fabrica";

// Los PDF se generan en el dispositivo: estos tests comprueban que se generan
// sin fallar (también con muchos datos y con caracteres que las fuentes del
// PDF no soportan) y que el resultado es un PDF válido.

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

async function abrir(bytes: Uint8Array) {
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  return PDFDocument.load(bytes);
}

describe("certificado mensual", () => {
  test("una página con pocos depósitos", async () => {
    const c = certificadoDelMes([certificado({ creadoEn: fecha(2026, 9, 5) })], "2026-09")!;
    const pdf = await abrir(await generarCertificadoPdf(c));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe(`Certificado RecyTrack ${c.codigo}`);
  });

  test("el detalle sigue en otras páginas y soporta emojis en los datos", async () => {
    const registros = Array.from({ length: 80 }, (_, i) =>
      certificado({ creadoEn: fecha(2026, 9, 1 + (i % 15)), residente: "Ana ♻️ Ñuñoa" })
    );
    const pdf = await abrir(await generarCertificadoPdf(certificadoDelMes(registros, "2026-09")!));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});

describe("reporte mensual de la torre", () => {
  test("se genera con un mes vacío", async () => {
    const pdf = await abrir(await generarReportePdf(reporteDeTorre(TORRE_A, "2026-09", [], [], null)));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Reporte RecyTrack Torre A 2026-09");
  });

  test("con muchos departamentos y contaminaciones sigue en otras páginas", async () => {
    const registros = Array.from({ length: 120 }, (_, i) =>
      certificado({ depto: `Depto ${100 + i}`, codigoRetiro: `RET-${i % 5}` })
    );
    registros.push(registro({ depto: "Depto 🏠 1" }));
    const incidencias: Incidencia[] = Array.from({ length: 12 }, (_, i) => ({
      id: `i${i}`,
      torreId: "torre-a",
      torreNombre: "Torre A",
      contenedor: "K7QM9X",
      contenedorNombre: "Contenedor mixto",
      contaminante: "Basura común",
      reportadoEn: fecha(2026, 9, 1 + i),
      reportadoPor: "carla",
      atendida: i % 2 === 0,
      atendidaEn: null,
      codigoRetiro: i % 2 === 0 ? "RET-AAAA" : null,
    }));
    const r = reporteDeTorre(TORRE_A, "2026-09", registros, incidencias, null);
    const pdf = await abrir(await generarReportePdf(r));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
