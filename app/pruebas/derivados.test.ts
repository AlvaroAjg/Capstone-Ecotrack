import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  avanceIncentivo,
  contenedoresPorRetirar,
  rankingDeAreas,
  unirRegistros,
} from "../src/lib/derivados";
import { semanaDe } from "../src/lib/puntaje";
import {
  EMBOTELLADO,
  FERMENTACION,
  certificado,
  contenedor,
  fecha,
  fijarAhora,
  registro,
  resumen,
  validado,
} from "./fabrica";
import type { Campana } from "../src/lib/tipos";

const AREAS = [EMBOTELLADO, FERMENTACION];

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

describe("rankingDeAreas", () => {
  const S1 = String(semanaDe(fecha(2026, 9, 1)));
  const S2 = String(semanaDe(fecha(2026, 9, 7)));
  const S3 = String(semanaDe(fecha(2026, 9, 14)));

  test("de más a menos puntaje, marcando mi área", () => {
    // Embotellado: 50 % de constancia y 1 kg por persona. Fermentación: 80 % y 0,5 kg.
    const ranking = rankingDeAreas(
      AREAS,
      resumen({
        embotellado: { depositos: 40, participantes: 12, semanas: { [S1]: 10, [S2]: 10, [S3]: 10 }, gramos: 20000 },
        fermentacion: { depositos: 30, participantes: 8, semanas: { [S1]: 8, [S2]: 8, [S3]: 8 }, gramos: 5000 },
      }),
      "embotellado"
    );
    expect(ranking.map((f) => [f.areaId, f.constancia, f.indiceKilos, f.puntaje, f.esMiArea])).toEqual([
      ["embotellado", 50, 100, 70, true],
      ["fermentacion", 80, 50, 68, false],
    ]);
  });

  test("no gana el área que recicló toda en un solo día", () => {
    const ranking = rankingDeAreas(
      AREAS,
      resumen({
        embotellado: { depositos: 36, participantes: 12, semanas: { [S1]: 12, [S2]: 12, [S3]: 12 }, gramos: 80000 },
        fermentacion: { depositos: 10, participantes: 10, semanas: { [S1]: 10 }, gramos: 15000 },
      }),
      null
    );
    expect(ranking.map((f) => [f.areaId, f.participacion, f.puntaje])).toEqual([
      ["embotellado", 60, 76],
      ["fermentacion", 100, 33],
    ]);
  });

  test("con todo empatado, se ordenan por nombre", () => {
    const ranking = rankingDeAreas(
      AREAS,
      resumen({
        embotellado: { depositos: 1, participantes: 1, semanas: {}, gramos: 0 },
        fermentacion: { depositos: 1, participantes: 1, semanas: {}, gramos: 0 },
      }),
      null
    );
    expect(ranking.map((f) => f.areaId)).toEqual(["embotellado", "fermentacion"]);
  });

  test("incluye a las áreas sin depósitos, con 0", () => {
    const ranking = rankingDeAreas(
      AREAS,
      resumen({ embotellado: { depositos: 1, participantes: 1, semanas: { [S3]: 1 }, gramos: 400 } }),
      null
    );
    expect(ranking).toHaveLength(2);
    expect(ranking[1]).toMatchObject({ areaId: "fermentacion", participantes: 0, participacion: 0, puntaje: 0 });
  });

  test("sin resumen del mes, todas en 0", () => {
    const ranking = rankingDeAreas(AREAS, null, "embotellado");
    expect(ranking.every((f) => f.puntaje === 0 && f.participacion === 0 && f.depositos === 0)).toBe(true);
  });

  test("un resumen anterior al puntaje, sin semanas ni kilos, queda en 0 sin fallar", () => {
    const [fila] = rankingDeAreas([FERMENTACION], resumen({ fermentacion: { depositos: 12, participantes: 12 } }), null);
    expect(fila).toMatchObject({ participacion: 100, constancia: 0, puntaje: 0 });
  });
});

describe("contenedoresPorRetirar", () => {
  const CONTENEDORES = [
    contenedor(),
    contenedor({ codigo: "VDRQ7X", material: "Vidrio", punto: "Bodega" }),
  ];

  test("uno por contenedor con sus validados, el que espera hace más tiempo primero", () => {
    const registros = [
      validado({ contenedor: "K7QM9X", validadoEn: fecha(2026, 9, 15), kgDeclarado: 0.4 }),
      validado({ contenedor: "K7QM9X", validadoEn: fecha(2026, 9, 14), talla: "L", kgDeclarado: 0.8 }),
      validado({ contenedor: "VDRQ7X", material: "Vidrio", validadoEn: fecha(2026, 9, 10), kgDeclarado: 8 }),
      registro({ contenedor: "K7QM9X" }),
      certificado({ contenedor: "K7QM9X" }),
    ];
    const grupos = contenedoresPorRetirar(registros, CONTENEDORES);

    expect(grupos.map((g) => g.contenedor)).toEqual(["VDRQ7X", "K7QM9X"]);
    expect(grupos[1]).toMatchObject({
      punto: "Casino",
      material: "Plástico",
      depositos: 2,
      kgEstimado: 1.2,
      esperandoDesde: fecha(2026, 9, 14),
    });
  });

  test("usa los kilos confirmados por el validador", () => {
    const [grupo] = contenedoresPorRetirar(
      [validado({ kgDeclarado: 0.4, kgConfirmado: 0.8 })],
      CONTENEDORES
    );
    expect(grupo.kgEstimado).toBe(0.8);
  });

  test("si el contenedor ya no está en la lista, igual se puede retirar", () => {
    const [grupo] = contenedoresPorRetirar([validado({ contenedor: "ZZZZZZ" })], CONTENEDORES);
    expect(grupo).toMatchObject({ contenedor: "ZZZZZZ", punto: "", depositos: 1 });
  });

  test("sin validados no hay nada que retirar", () => {
    expect(contenedoresPorRetirar([registro(), certificado()], CONTENEDORES)).toEqual([]);
  });
});

describe("avanceIncentivo", () => {
  const CAMPANA: Campana = {
    plantaId: "planta-1",
    nombre: "Septiembre verde",
    metaParticipacion: 50,
    incentivo: "Desayuno para el área",
    terminaEn: fecha(2026, 9, 30),
    actualizadaEn: fecha(2026, 9, 1),
    actualizadaPor: "adela",
  };

  const S1 = String(semanaDe(fecha(2026, 9, 1)));
  const S2 = String(semanaDe(fecha(2026, 9, 7)));
  const S3 = String(semanaDe(fecha(2026, 9, 14)));

  test("cuánto le falta a mi área para la meta de puntaje", () => {
    // Embotellado: 30 % de constancia y los únicos kilos de la planta (índice 100): 58 puntos.
    const ranking = rankingDeAreas(
      AREAS,
      resumen({ embotellado: { depositos: 18, participantes: 6, semanas: { [S1]: 6, [S2]: 6, [S3]: 6 }, gramos: 4000 } }),
      "embotellado"
    );
    expect(avanceIncentivo({ ...CAMPANA, metaParticipacion: 70 }, ranking)).toMatchObject({
      meta: 70,
      puntaje: 58,
      faltan: 12,
      cumplida: false,
    });
  });

  test("si mi área pasó la meta, está cumplida y no le falta nada", () => {
    const ranking = rankingDeAreas(
      AREAS,
      resumen({ fermentacion: { depositos: 21, participantes: 7, semanas: { [S1]: 7, [S2]: 7, [S3]: 7 }, gramos: 3000 } }),
      "fermentacion"
    );
    expect(avanceIncentivo(CAMPANA, ranking)).toMatchObject({ puntaje: 82, faltan: 0, cumplida: true });
  });

  test("sin campaña, terminada o sin área, no hay tarjeta", () => {
    const ranking = rankingDeAreas(AREAS, null, "embotellado");
    expect(avanceIncentivo(null, ranking)).toBeNull();
    expect(avanceIncentivo({ ...CAMPANA, terminaEn: fecha(2026, 9, 15) }, ranking)).toBeNull();
    expect(avanceIncentivo(CAMPANA, rankingDeAreas(AREAS, null, null))).toBeNull();
  });
});
