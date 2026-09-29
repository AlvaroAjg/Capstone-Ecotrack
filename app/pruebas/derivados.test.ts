import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  ecoPuntosPorTorre,
  lotesPorRetirar,
  rankingDeTorres,
  resumenDeTorre,
  unirRegistros,
} from "../src/lib/derivados";
import type { Mision, Registro } from "../src/lib/tipos";
import { TORRE_A, TORRE_B, certificado, fecha, fijarAhora, registro, validado } from "./fabrica";

const TORRES = [TORRE_A, TORRE_B];

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("unirRegistros", () => {
  test("junta varias consultas sin repetir y del más reciente al más antiguo", () => {
    const viejo = registro({ id: "viejo", creadoEn: fecha(2026, 9, 1) });
    const nuevo = registro({ id: "nuevo", creadoEn: fecha(2026, 9, 15) });
    const medio = registro({ id: "medio", creadoEn: fecha(2026, 9, 8) });
    const unidos = unirRegistros([[viejo, nuevo], [nuevo, medio], []]);
    expect(unidos.map((r) => r.id)).toEqual(["nuevo", "medio", "viejo"]);
  });
});

describe("resumenDeTorre", () => {
  test("kilos del mes: solo lo certificado este mes, aunque se haya depositado el anterior", () => {
    const registros = [
      certificado({ kgDeclarado: 0.4 }),
      // Depositado en agosto, certificado en septiembre: suma a septiembre.
      certificado({
        creadoEn: fecha(2026, 8, 30),
        certificadoEn: fecha(2026, 9, 2),
        material: "Vidrio",
        talla: "L",
        kgDeclarado: 8,
      }),
      // Certificado en agosto: no suma.
      certificado({ creadoEn: fecha(2026, 8, 10), certificadoEn: fecha(2026, 8, 12), kgDeclarado: 5 }),
      validado({ kgDeclarado: 12 }),
      certificado({ torreId: "torre-b", kgDeclarado: 3 }),
    ];
    expect(resumenDeTorre("torre-a", TORRES, registros, null).kgMes).toBe(8.4);
  });

  test("participación: departamentos distintos con algún depósito del mes que no fue rechazado", () => {
    const registros = [
      registro({ depto: "Depto 101" }),
      registro({ depto: "Depto 101" }),
      validado({ depto: "Depto 102" }),
      registro({ depto: "Depto 103", estado: "rechazado" }),
      registro({ depto: "Depto 104", creadoEn: fecha(2026, 8, 20) }),
    ];
    const r = resumenDeTorre("torre-a", TORRES, registros, null);
    expect(r.deptosActivos).toBe(2);
    expect(r.deptosTotales).toBe(20);
    expect(r.participacion).toBe(10);
  });

  test("la misión de la torre reemplaza la meta base, solo si es de esa torre", () => {
    const mision: Mision = {
      torreId: "torre-a",
      metaKg: 50,
      incentivo: "Pizza",
      actualizadaEn: 0,
      actualizadaPor: "carla",
    };
    const registros = [certificado({ talla: "XL", material: "Papel/cartón", kgDeclarado: 5 })];
    expect(resumenDeTorre("torre-a", TORRES, registros, mision).metaKg).toBe(50);
    expect(resumenDeTorre("torre-a", TORRES, registros, mision).avanceMeta).toBe(10);
    expect(resumenDeTorre("torre-a", TORRES, registros, null).metaKg).toBe(200);
    expect(resumenDeTorre("torre-b", TORRES, registros, mision).metaKg).toBe(150);
  });

  test("pendientes de la torre, de cualquier fecha", () => {
    const antiguo = registro({ creadoEn: fecha(2026, 7, 1) });
    const r = resumenDeTorre("torre-a", TORRES, [antiguo, validado(), registro({ torreId: "torre-b" })], null);
    expect(r.pendientes).toEqual([antiguo]);
  });

  test("sin datos todo es 0, sin pisos artificiales", () => {
    const r = resumenDeTorre("torre-a", TORRES, [], null);
    expect(r).toMatchObject({ kgMes: 0, deptosActivos: 0, participacion: 0, avanceMeta: 0 });
  });
});

describe("ranking", () => {
  test("de más a menos kilos certificados, marcando mi torre", () => {
    const registros = [
      certificado({ kgDeclarado: 0.4 }),
      certificado({ torreId: "torre-b", material: "Vidrio", talla: "S", kgDeclarado: 1.5 }),
    ];
    const ranking = rankingDeTorres(TORRES, registros, null, "torre-a");
    expect(ranking.map((f) => [f.torreId, f.kg, f.esMiTorre])).toEqual([
      ["torre-b", 1.5, false],
      ["torre-a", 0.4, true],
    ]);
  });

  test("incluye a las torres sin depósitos, con 0", () => {
    const ranking = rankingDeTorres(TORRES, [certificado()], null, null);
    expect(ranking).toHaveLength(2);
    expect(ranking[1]).toMatchObject({ torreId: "torre-b", kg: 0, ecoPuntos: 0 });
  });
});

describe("ecoPuntosPorTorre", () => {
  test("suma los EcoPuntos de cada residente en su torre", () => {
    // Con depósitos de dos materiales y 6,5 kg, cualquier misión de la semana
    // queda cumplida: 50 por residente y semana.
    const semana = (residenteId: string, torreId: string): Registro[] => [
      registro({ residenteId, torreId, creadoEn: fecha(2026, 9, 14), material: "Papel/cartón", talla: "XL", kgDeclarado: 5 }),
      registro({ residenteId, torreId, creadoEn: fecha(2026, 9, 15), material: "Vidrio", talla: "S", kgDeclarado: 1.5 }),
    ];
    const puntos = ecoPuntosPorTorre([
      ...semana("ana", "torre-a"),
      ...semana("eva", "torre-a"),
      ...semana("beto", "torre-b"),
    ]);
    expect(puntos.get("torre-a")).toBe(100);
    expect(puntos.get("torre-b")).toBe(50);
  });
});

describe("lotesPorRetirar", () => {
  test("un lote por torre con sus validados, el que espera hace más tiempo primero", () => {
    const registros = [
      validado({ torreId: "torre-a", validadoEn: fecha(2026, 9, 15), kgDeclarado: 0.4 }),
      validado({ torreId: "torre-a", validadoEn: fecha(2026, 9, 14), material: "Vidrio", talla: "L", kgDeclarado: 8 }),
      validado({ torreId: "torre-b", validadoEn: fecha(2026, 9, 10), kgDeclarado: 0.4 }),
      registro({ torreId: "torre-a" }),
      certificado({ torreId: "torre-a" }),
    ];
    const lotes = lotesPorRetirar(registros, TORRES);

    expect(lotes.map((l) => l.torreId)).toEqual(["torre-b", "torre-a"]);
    expect(lotes[1]).toMatchObject({
      torreNombre: "Torre A",
      depositos: 2,
      kgTotal: 8.4,
      esperandoDesde: fecha(2026, 9, 14),
      porMaterial: [
        { material: "Vidrio", kg: 8 },
        { material: "Plástico", kg: 0.4 },
      ],
    });
  });

  test("usa los kilos confirmados por el administrador", () => {
    const [lote] = lotesPorRetirar([validado({ kgDeclarado: 0.4, kgConfirmado: 0.8 })], TORRES);
    expect(lote.kgTotal).toBe(0.8);
  });

  test("si la torre no está en la lista, usa el nombre guardado en el depósito", () => {
    const [lote] = lotesPorRetirar([validado({ torreId: "torre-z", torreNombre: "Torre Z" })], TORRES);
    expect(lote.torreNombre).toBe("Torre Z");
  });

  test("sin validados no hay lotes", () => {
    expect(lotesPorRetirar([registro(), certificado()], TORRES)).toEqual([]);
  });
});
