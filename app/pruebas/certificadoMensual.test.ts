import { afterEach, describe, expect, test, vi } from "vitest";
import {
  certificadoDelMes,
  etiquetaMes,
  mesDe,
  mesesConCertificado,
  tieneEstimados,
} from "../src/lib/certificadoMensual";
import { certificado, fecha, fijarAhora, registro, validado } from "./fabrica";

afterEach(() => {
  vi.useRealTimers();
});

test("mesDe y etiquetaMes", () => {
  expect(mesDe(fecha(2026, 9, 1, 0))).toBe("2026-09");
  expect(mesDe(fecha(2026, 12, 31, 23))).toBe("2026-12");
  expect(etiquetaMes("2026-09")).toBe("septiembre de 2026");
  expect(etiquetaMes("2027-01")).toBe("enero de 2027");
});

test("mesesConCertificado: solo meses con algo certificado, del más reciente al más antiguo", () => {
  const meses = mesesConCertificado([
    certificado({ creadoEn: fecha(2026, 7, 10) }),
    certificado({ creadoEn: fecha(2026, 9, 2) }),
    certificado({ creadoEn: fecha(2026, 9, 20) }),
    validado({ creadoEn: fecha(2026, 8, 5) }),
  ]);
  expect(meses).toEqual(["2026-09", "2026-07"]);
});

describe("certificadoDelMes", () => {
  test("sin depósitos certificados ese mes no hay certificado", () => {
    expect(certificadoDelMes([validado({ creadoEn: fecha(2026, 9, 5) })], "2026-09")).toBeNull();
    expect(certificadoDelMes([certificado({ creadoEn: fecha(2026, 8, 5) })], "2026-09")).toBeNull();
  });

  test("suma solo lo certificado, pero detalla todos los depósitos del mes", () => {
    const c = certificadoDelMes(
      [
        certificado({ creadoEn: fecha(2026, 9, 3), material: "Plástico", kgDeclarado: 0.4 }),
        certificado({ creadoEn: fecha(2026, 9, 4), material: "Vidrio", talla: "L", kgDeclarado: 8 }),
        certificado({ creadoEn: fecha(2026, 9, 5), material: "Plástico", talla: "L", kgDeclarado: 0.8 }),
        validado({ creadoEn: fecha(2026, 9, 6), kgDeclarado: 1.5 }),
        registro({ creadoEn: fecha(2026, 9, 7), estado: "rechazado", kgDeclarado: 12 }),
        certificado({ creadoEn: fecha(2026, 8, 30), kgDeclarado: 5 }),
      ],
      "2026-09"
    )!;

    expect(c.kgCertificados).toBe(9.2);
    expect(c.certificados).toHaveLength(3);
    expect(c.registros).toHaveLength(5);
    expect(c.porMaterial).toEqual([
      { material: "Plástico", kg: 1.2, depositos: 2 },
      { material: "Vidrio", kg: 8, depositos: 1 },
    ]);
  });

  test("detalla los depósitos del más antiguo al más reciente", () => {
    const c = certificadoDelMes(
      [
        certificado({ id: "tarde", creadoEn: fecha(2026, 9, 20) }),
        certificado({ id: "temprano", creadoEn: fecha(2026, 9, 2) }),
      ],
      "2026-09"
    )!;
    expect(c.registros.map((r) => r.id)).toEqual(["temprano", "tarde"]);
  });

  test("usa el depto del depósito más reciente, si se cambió durante el mes", () => {
    const c = certificadoDelMes(
      [
        certificado({ creadoEn: fecha(2026, 9, 2), depto: "Depto 101" }),
        certificado({ creadoEn: fecha(2026, 9, 20), depto: "Depto 305" }),
      ],
      "2026-09"
    )!;
    expect(c.depto).toBe("Depto 305");
  });

  test("el código es estable para el residente y el mes, y distinto entre meses y residentes", () => {
    const deAna = (mes: number) =>
      certificadoDelMes([certificado({ creadoEn: fecha(2026, mes, 5) })], `2026-0${mes}`)!.codigo;
    const deBeto = certificadoDelMes(
      [certificado({ residenteId: "beto", creadoEn: fecha(2026, 9, 5) })],
      "2026-09"
    )!.codigo;

    expect(deAna(9)).toMatch(/^ECO-2609-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    expect(deAna(9)).toBe(deAna(9));
    expect(deAna(9)).not.toBe(deAna(8));
    expect(deAna(9)).not.toBe(deBeto);
  });

  test("enCurso solo si es el mes actual", () => {
    fijarAhora(fecha(2026, 9, 16));
    const registros = [
      certificado({ creadoEn: fecha(2026, 9, 5) }),
      certificado({ creadoEn: fecha(2026, 8, 5) }),
    ];
    expect(certificadoDelMes(registros, "2026-09")!.enCurso).toBe(true);
    expect(certificadoDelMes(registros, "2026-08")!.enCurso).toBe(false);
  });

  test("tieneEstimados: si algún certificado se declaró por talla", () => {
    const porTalla = certificadoDelMes([certificado({ creadoEn: fecha(2026, 9, 5) })], "2026-09")!;
    const enKilos = certificadoDelMes(
      [certificado({ creadoEn: fecha(2026, 9, 5), talla: null, kgDeclarado: 2 })],
      "2026-09"
    )!;
    expect(tieneEstimados(porTalla)).toBe(true);
    expect(tieneEstimados(enKilos)).toBe(false);
  });
});
