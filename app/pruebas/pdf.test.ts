import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { certificadoDelMes } from "../src/lib/certificadoMensual";
import { generarCertificadoPdf } from "../src/lib/certificadoPdf.web";
import { generarReportePdf } from "../src/lib/reportePdf.web";
import { reporteDePlanta } from "../src/lib/reportePlanta";
import type { Area } from "../src/lib/tipos";
import {
  EMBOTELLADO,
  PLANTA,
  certificado,
  fecha,
  fijarAhora,
  incidencia,
  registro,
} from "./fabrica";

const ANA = { nombre: "Ana", area: "Embotellado · Planta Piloto" };

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
    const c = certificadoDelMes([certificado({ creadoEn: fecha(2026, 9, 5) })], "2026-09", ANA)!;
    const pdf = await abrir(await generarCertificadoPdf(c));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe(`Certificado RecyTrack ${c.codigo}`);
  });

  test("el detalle sigue en otras páginas y soporta emojis en los datos", async () => {
    const registros = Array.from({ length: 80 }, (_, i) =>
      certificado({ creadoEn: fecha(2026, 9, 1 + (i % 15)) })
    );
    const persona = { nombre: "Ana ♻️ Ñuñoa", area: "Embotellado 🍾" };
    const pdf = await abrir(await generarCertificadoPdf(certificadoDelMes(registros, "2026-09", persona)!));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});

describe("reporte mensual de la planta", () => {
  test("se genera con un mes vacío", async () => {
    const pdf = await abrir(await generarReportePdf(reporteDePlanta(PLANTA, [EMBOTELLADO], "2026-09", [], [])));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Reporte RecyTrack Planta Piloto 2026-09");
  });

  test("con muchas áreas y contaminaciones sigue en otras páginas", async () => {
    const areas: Area[] = Array.from({ length: 120 }, (_, i) => ({
      ...EMBOTELLADO,
      id: `area-${i}`,
      nombre: i === 0 ? "Área 🏠 1" : `Área ${i}`,
    }));
    const registros = areas.map((a, i) => certificado({ areaId: a.id, retiroId: `RET-${i % 5}` }));
    registros.push(registro());
    const incidencias = Array.from({ length: 12 }, (_, i) =>
      incidencia({
        id: `i${i}`,
        contenedorNombre: "Contenedor mixto",
        contaminante: "Basura común",
        reportadoEn: fecha(2026, 9, 1 + i),
        atendida: i % 2 === 0,
        retiroId: i % 2 === 0 ? "RET-AAAA" : null,
      })
    );
    const r = reporteDePlanta(PLANTA, areas, "2026-09", registros, incidencias);
    const pdf = await abrir(await generarReportePdf(r));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
