import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  avanceIncentivo,
  contenedoresPorRetirar,
  rankingDeAreas,
  unirRegistros,
} from "../src/lib/derivados";
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
  test("de más a menos participación, marcando mi área", () => {
    // Embotellado: 5 de 20 (25%). Fermentación: 4 de 10 (40%).
    const ranking = rankingDeAreas(
      AREAS,
      resumen({
        embotellado: { depositos: 12, participantes: 5 },
        fermentacion: { depositos: 6, participantes: 4 },
      }),
      "embotellado"
    );
    expect(ranking.map((f) => [f.areaId, f.participacion, f.esMiArea])).toEqual([
      ["fermentacion", 40, false],
      ["embotellado", 25, true],
    ]);
  });

  test("gana la participación, no la cantidad de depósitos", () => {
    const ranking = rankingDeAreas(
      AREAS,
      resumen({
        embotellado: { depositos: 50, participantes: 2 },
        fermentacion: { depositos: 3, participantes: 3 },
      }),
      null
    );
    expect(ranking[0].areaId).toBe("fermentacion");
  });

  test("a igual participación, va primero la de más depósitos", () => {
    // 50% en ambas: 10 de 20 y 5 de 10.
    const ranking = rankingDeAreas(
      AREAS,
      resumen({
        embotellado: { depositos: 10, participantes: 10 },
        fermentacion: { depositos: 15, participantes: 5 },
      }),
      null
    );
    expect(ranking.map((f) => f.areaId)).toEqual(["fermentacion", "embotellado"]);
  });

  test("incluye a las áreas sin depósitos, con 0", () => {
    const ranking = rankingDeAreas(
      AREAS,
      resumen({ embotellado: { depositos: 1, participantes: 1 } }),
      null
    );
    expect(ranking).toHaveLength(2);
    expect(ranking[1]).toMatchObject({ areaId: "fermentacion", participantes: 0, participacion: 0 });
  });

  test("sin resumen del mes, todas en 0", () => {
    const ranking = rankingDeAreas(AREAS, null, "embotellado");
    expect(ranking.every((f) => f.participacion === 0 && f.depositos === 0)).toBe(true);
  });

  test("no pasa de 100% si la dotación quedó desactualizada", () => {
    const [fila] = rankingDeAreas(
      [FERMENTACION],
      resumen({ fermentacion: { depositos: 12, participantes: 12 } }),
      null
    );
    expect(fila.participacion).toBe(100);
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

  test("cuánto le falta a mi área para la meta", () => {
    // 6 de 20 personas de Embotellado: 30 %.
    const ranking = rankingDeAreas(AREAS, resumen({ embotellado: { depositos: 9, participantes: 6 } }), "embotellado");
    expect(avanceIncentivo(CAMPANA, ranking)).toMatchObject({
      meta: 50,
      participacion: 30,
      faltan: 20,
      cumplida: false,
    });
  });

  test("si mi área pasó la meta, está cumplida y no le falta nada", () => {
    const ranking = rankingDeAreas(AREAS, resumen({ fermentacion: { depositos: 8, participantes: 7 } }), "fermentacion");
    expect(avanceIncentivo(CAMPANA, ranking)).toMatchObject({ participacion: 70, faltan: 0, cumplida: true });
  });

  test("sin campaña, terminada o sin área, no hay tarjeta", () => {
    const ranking = rankingDeAreas(AREAS, null, "embotellado");
    expect(avanceIncentivo(null, ranking)).toBeNull();
    expect(avanceIncentivo({ ...CAMPANA, terminaEn: fecha(2026, 9, 15) }, ranking)).toBeNull();
    expect(avanceIncentivo(CAMPANA, rankingDeAreas(AREAS, null, null))).toBeNull();
  });
});
