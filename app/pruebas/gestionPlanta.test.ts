import { describe, expect, test } from "vitest";
import {
  agruparPorPunto,
  filasPersonas,
  generarCodigoArea,
  paginar,
  personasPorArea,
  validadoresDeRonda,
} from "../src/lib/gestionPlanta";
import { contenedor, fecha, registro, usuario } from "./fabrica";

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

describe("filasPersonas", () => {
  const PERSONAS = [
    usuario({ id: "ana", nombre: "Ana Pérez", email: "aperez@vina.cl" }),
    usuario({ id: "bruno", nombre: "Bruno Díaz", areaId: "fermentacion" }),
    usuario({ id: "carla", nombre: "Carla Soto", rol: "validador" }),
  ];

  test("por nombre, con la fecha del último depósito de cada uno", () => {
    const filas = filasPersonas(
      PERSONAS,
      [
        registro({ colaboradorId: "ana", creadoEn: fecha(2026, 9, 3) }),
        registro({ colaboradorId: "ana", creadoEn: fecha(2026, 9, 10) }),
      ],
      { busqueda: "", areaId: null }
    );
    expect(filas.map((f) => f.persona.id)).toEqual(["ana", "bruno", "carla"]);
    expect(filas[0].ultimoDeposito).toBe(fecha(2026, 9, 10));
    expect(filas[1].ultimoDeposito).toBeNull();
  });

  test("busca por nombre sin importar mayúsculas ni tildes", () => {
    const filas = filasPersonas(PERSONAS, [], { busqueda: "perez", areaId: null });
    expect(filas.map((f) => f.persona.id)).toEqual(["ana"]);
  });

  test("busca también por correo", () => {
    const filas = filasPersonas(PERSONAS, [], { busqueda: "APEREZ@", areaId: null });
    expect(filas.map((f) => f.persona.id)).toEqual(["ana"]);
  });

  test("filtra por área", () => {
    const filas = filasPersonas(PERSONAS, [], { busqueda: "", areaId: "fermentacion" });
    expect(filas.map((f) => f.persona.id)).toEqual(["bruno"]);
  });

  test("activa si depositó este mes; si no, sin depósitos; el administrador no tiene estado", () => {
    const filas = filasPersonas(
      [...PERSONAS, usuario({ id: "adela", nombre: "Adela", rol: "administrador", areaId: null })],
      [
        registro({ colaboradorId: "ana", creadoEn: fecha(2026, 9, 2) }),
        registro({ colaboradorId: "bruno", creadoEn: fecha(2026, 8, 31) }),
      ],
      { busqueda: "", areaId: null },
      fecha(2026, 9, 16)
    );
    const estado = Object.fromEntries(filas.map((f) => [f.persona.id, f.estado]));
    expect(estado).toEqual({ adela: null, ana: "activa", bruno: "sinDepositos", carla: "sinDepositos" });
  });
});

describe("paginar", () => {
  const LISTA = Array.from({ length: 23 }, (_, i) => i);

  test("corta la lista en páginas", () => {
    const p = paginar(LISTA, 2, 10);
    expect(p.elementos).toEqual([20, 21, 22]);
    expect(p).toMatchObject({ pagina: 2, paginas: 3, total: 23 });
  });

  test("una página fuera de rango muestra la última", () => {
    expect(paginar(LISTA, 7, 10).pagina).toBe(2);
    expect(paginar(LISTA, -1, 10).pagina).toBe(0);
  });

  test("una lista vacía tiene una página vacía", () => {
    expect(paginar([], 0, 10)).toEqual({ elementos: [], pagina: 0, paginas: 1, total: 0 });
  });
});

describe("validadoresDeRonda", () => {
  test("distingue al titular del suplente", () => {
    const v = validadoresDeRonda([
      usuario({ id: "ana" }),
      usuario({ id: "rosa", nombre: "Rosa", rol: "validador" }),
      usuario({ id: "tomas", nombre: "Tomás", rol: "validador", suplente: true }),
    ]);
    expect(v.titular?.id).toBe("rosa");
    expect(v.suplente?.id).toBe("tomas");
    expect(v.otros).toEqual([]);
  });

  test("sin validadores no hay ni titular ni suplente", () => {
    expect(validadoresDeRonda([usuario()])).toEqual({ titular: null, suplente: null, otros: [] });
  });

  test("si sobran validadores, el primero por nombre ocupa el puesto y el resto queda aparte", () => {
    const v = validadoresDeRonda([
      usuario({ id: "zoe", nombre: "Zoe", rol: "validador" }),
      usuario({ id: "beto", nombre: "Beto", rol: "validador" }),
    ]);
    expect(v.titular?.id).toBe("beto");
    expect(v.suplente).toBeNull();
    expect(v.otros.map((p) => p.id)).toEqual(["zoe"]);
  });
});
