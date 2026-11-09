import { describe, expect, test } from "vitest";
import { direccion, opcionGuardada, pilaGuardada } from "../src/lib/navegacion";

const PERMITIDAS = ["home", "escanear", "deposito", "perfil"];
const RAICES = ["home"];

describe("pilaGuardada", () => {
  test("devuelve la pila si empieza en una raíz y sus pantallas existen", () => {
    const guardada = [{ pantalla: "home", params: {} }, { pantalla: "deposito", params: { registroId: "r1" } }];
    expect(pilaGuardada(guardada, PERMITIDAS, RAICES)).toEqual(guardada);
  });

  test("null si no empieza en una raíz de este rol (otra cuenta, otro rol)", () => {
    expect(pilaGuardada([{ pantalla: "perfil", params: {} }], PERMITIDAS, RAICES)).toBeNull();
  });

  test("null si trae una pantalla que no existe o datos raros", () => {
    expect(pilaGuardada([{ pantalla: "home", params: {} }, { pantalla: "gestor", params: {} }], PERMITIDAS, RAICES)).toBeNull();
    expect(pilaGuardada([{ pantalla: "home", params: { registroId: 3 } }], PERMITIDAS, RAICES)).toBeNull();
    expect(pilaGuardada([], PERMITIDAS, RAICES)).toBeNull();
    expect(pilaGuardada("home", PERMITIDAS, RAICES)).toBeNull();
    expect(pilaGuardada(null, PERMITIDAS, RAICES)).toBeNull();
  });

  test("deja solo los parámetros conocidos", () => {
    const pila = pilaGuardada([{ pantalla: "home", params: { otro: "x" } }], PERMITIDAS, RAICES);
    expect(pila).toEqual([{ pantalla: "home", params: {} }]);
  });
});

describe("opcionGuardada", () => {
  test("solo una de las opciones válidas", () => {
    expect(opcionGuardada("rondas", ["resumen", "rondas"] as const)).toBe("rondas");
    expect(opcionGuardada("gestor", ["resumen", "rondas"] as const)).toBeNull();
    expect(opcionGuardada(undefined, ["resumen"] as const)).toBeNull();
  });
});

describe("direccion", () => {
  test("el nombre de la pantalla y, si tiene, su identificador", () => {
    expect(direccion("inicio")).toBe("#inicio");
    expect(direccion("deposito", "a b/c")).toBe("#deposito/a%20b%2Fc");
  });
});
