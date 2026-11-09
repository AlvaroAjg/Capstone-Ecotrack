import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { detalleRetiro, quienesRetiraron, retirosDelMes, validarRetiro } from "../src/lib/retiros";
import type { Retiro } from "../src/lib/tipos";
import { certificado, contenedor, fecha, fijarAhora } from "./fabrica";

// Los tests corren el miércoles 16 de septiembre de 2026 al mediodía.
beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("validarRetiro", () => {
  const BASE = { fecha: "16-09-2026", quienRetira: " Recicladora Sur ", guia: "", peso: "" };

  test("hoy vale la hora actual; sin guía ni peso, quedan en null", () => {
    expect(validarRetiro(BASE, 2)).toEqual({
      ok: true,
      datos: { fecha: fecha(2026, 9, 16), quienRetira: "Recicladora Sur", guia: null, pesoKg: null },
    });
  });

  test("un día anterior vale el final de ese día; el peso acepta coma decimal", () => {
    const r = validarRetiro({ ...BASE, fecha: "14-09-2026", guia: " G-123 ", peso: "38,5" }, 1);
    expect(r).toEqual({
      ok: true,
      datos: {
        fecha: new Date(2026, 8, 14, 23, 59, 59, 999).getTime(),
        quienRetira: "Recicladora Sur",
        guia: "G-123",
        pesoKg: 38.5,
      },
    });
  });

  test("rechaza lo que la regla de Firestore no acepta", () => {
    expect(validarRetiro(BASE, 0).ok).toBe(false);
    expect(validarRetiro({ ...BASE, fecha: "17-09-2026" }, 1).ok).toBe(false);
    expect(validarRetiro({ ...BASE, fecha: "31-09-2026" }, 1).ok).toBe(false);
    expect(validarRetiro({ ...BASE, quienRetira: " " }, 1).ok).toBe(false);
    expect(validarRetiro({ ...BASE, guia: "x".repeat(41) }, 1).ok).toBe(false);
    expect(validarRetiro({ ...BASE, peso: "0" }, 1).ok).toBe(false);
    expect(validarRetiro({ ...BASE, peso: "abc" }, 1).ok).toBe(false);
  });
});

describe("retirosDelMes", () => {
  function retiro(cambios: Partial<Retiro>): Retiro {
    return {
      id: "RET-AAAA",
      plantaId: "planta-1",
      fecha: fecha(2026, 9, 10),
      quienRetira: "Recicladora Sur",
      guia: null,
      contenedores: ["K7QM9X"],
      pesoKg: null,
      depositos: 3,
      kgEstimado: 2.4,
      registradoPor: "adela",
      registradoEn: fecha(2026, 9, 10),
      ...cambios,
    };
  }

  test("los del mes, el más reciente primero, con verificado si se informó el peso", () => {
    const lista = retirosDelMes([
      retiro({ id: "RET-1", fecha: fecha(2026, 9, 3), pesoKg: 12 }),
      retiro({ id: "RET-2", fecha: fecha(2026, 9, 12) }),
      retiro({ id: "RET-0", fecha: fecha(2026, 8, 28) }),
    ]);
    expect(lista.map((r) => [r.id, r.verificado])).toEqual([
      ["RET-2", false],
      ["RET-1", true],
    ]);
  });
});

describe("detalleRetiro", () => {
  const CONTENEDORES = [
    contenedor({ codigo: "PLA111", punto: "Casino", material: "Plástico" }),
    contenedor({ codigo: "MIX222", punto: "Bodega", material: null }),
    contenedor({ codigo: "OLD333", punto: "Bodega", activo: false }),
    contenedor({ codigo: "VID444", punto: "Patio", material: "Vidrio" }),
  ];
  const retiro = (cambios: Partial<Retiro>): Retiro => ({
    id: "RET-1",
    plantaId: "planta-1",
    fecha: fecha(2026, 9, 10),
    quienRetira: "Recicladora Sur",
    guia: null,
    contenedores: [],
    pesoKg: null,
    depositos: 0,
    kgEstimado: 0,
    registradoPor: "carla",
    registradoEn: fecha(2026, 9, 10),
    ...cambios,
  });

  test("los puntos de sus contenedores y los materiales de sus depósitos", () => {
    const registros = [
      certificado({ retiroId: "RET-1", contenedor: "PLA111", material: "Plástico" }),
      certificado({ retiroId: "RET-1", contenedor: "MIX222", material: "Papel/cartón" }),
      certificado({ retiroId: "RET-1", contenedor: "MIX222", material: "Metal" }),
      certificado({ retiroId: "OTRO", contenedor: "VID444", material: "Vidrio" }),
    ];
    expect(detalleRetiro(retiro({ contenedores: ["PLA111", "MIX222"] }), CONTENEDORES, registros)).toEqual({
      puntos: "Casino y Bodega",
      materiales: "Papel/cartón, plástico y metal",
    });
  });

  test("si pasó por todos los puntos de la planta, lo dice así", () => {
    const detalle = detalleRetiro(retiro({ contenedores: ["PLA111", "OLD333", "VID444"] }), CONTENEDORES, []);
    expect(detalle.puntos).toBe("Los 3 puntos");
  });

  test("todos los materiales, o un guion si no hay depósitos", () => {
    const registros = (["Papel/cartón", "Plástico", "Vidrio", "Metal", "Aluminio"] as const).map((material) =>
      certificado({ retiroId: "RET-1", material })
    );
    expect(detalleRetiro(retiro({ contenedores: ["PLA111"] }), CONTENEDORES, registros).materiales).toBe("Todos");
    expect(detalleRetiro(retiro({ contenedores: ["PLA111"] }), CONTENEDORES, registros.slice(0, 4)).materiales).toBe(
      "Papel/cartón, plástico, vidrio y metal"
    );
    expect(detalleRetiro(retiro({ contenedores: ["PLA111"] }), CONTENEDORES, []).materiales).toBe("—");
  });
});

describe("quienesRetiraron", () => {
  const r = (quienRetira: string, dia: number) =>
    ({ quienRetira, fecha: fecha(2026, 9, dia) }) as Retiro;

  test("los más recientes primero, sin repetir aunque cambie la mayúscula", () => {
    expect(quienesRetiraron([r("Retiro municipal", 2), r("Recicladora Sur", 9), r("retiro municipal", 12)])).toEqual([
      "retiro municipal",
      "Recicladora Sur",
    ]);
  });

  test("hasta el máximo pedido", () => {
    expect(quienesRetiraron([r("A", 1), r("B", 2), r("C", 3)], 2)).toEqual(["C", "B"]);
  });
});
