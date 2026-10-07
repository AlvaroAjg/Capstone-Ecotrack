import { describe, expect, test } from "vitest";
import { agruparPorPunto, generarCodigoArea, personasPorArea } from "../src/lib/gestionPlanta";
import { contenedor, usuario } from "./fabrica";

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

describe("generarCodigoArea", () => {
  test("tres letras del nombre, sin tildes, y cuatro cifras", () => {
    expect(generarCodigoArea("Fermentación", [], () => 0.5)).toBe("FER-5500");
    expect(generarCodigoArea("Él", [], () => 0)).toBe("ELX-1000");
  });

  test("no repite un código que ya existe", () => {
    const valores = [0, 0, 0.5];
    const azar = () => valores.shift() ?? 0.9;
    expect(generarCodigoArea("Bodega", ["BOD-1000"], azar)).toBe("BOD-5500");
  });
});

describe("personasPorArea", () => {
  test("cuenta colaboradores y validadores por área, sin el administrador", () => {
    const cuenta = personasPorArea([
      usuario({ id: "a" }),
      usuario({ id: "b", rol: "validador" }),
      usuario({ id: "c", areaId: "fermentacion" }),
      usuario({ id: "d", rol: "administrador", areaId: null }),
      usuario({ id: "e", areaId: null }),
    ]);
    expect(cuenta).toEqual({ embotellado: 2, fermentacion: 1 });
  });
});
