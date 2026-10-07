import { describe, expect, test } from "vitest";
import { agruparPorPunto } from "../src/lib/gestionPlanta";
import { contenedor } from "./fabrica";

describe("agruparPorPunto", () => {
  test("agrupa los activos por punto limpio, el mixto primero", () => {
    const puntos = agruparPorPunto([
      contenedor({ codigo: "VID111", punto: "Casino", material: "Vidrio" }),
      contenedor({ codigo: "MIX222", punto: "Casino", material: null }),
      contenedor({ codigo: "PAP333", punto: "Bodega", material: "Papel/cartón" }),
      contenedor({ codigo: "OLD444", punto: "Bodega", activo: false }),
    ]);
    expect(puntos.map((p) => p.punto)).toEqual(["Bodega", "Casino"]);
    expect(puntos[0].contenedores.map((c) => c.codigo)).toEqual(["PAP333"]);
    expect(puntos[1].contenedores.map((c) => c.codigo)).toEqual(["MIX222", "VID111"]);
  });

  test("un punto sin contenedores activos no aparece", () => {
    expect(agruparPorPunto([contenedor({ activo: false })])).toEqual([]);
  });
});
