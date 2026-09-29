import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { construirAvisos, esNuevo, type Aviso } from "../src/lib/avisos";
import { lotesPorRetirar } from "../src/lib/derivados";
import type { Incidencia } from "../src/lib/tipos";
import { TORRE_A, certificado, fecha, fijarAhora, registro, usuario, validado } from "./fabrica";

const DIA = 86_400_000;

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

function incidencia(cambios: Partial<Incidencia> = {}): Incidencia {
  return {
    id: "i1",
    torreId: "torre-a",
    torreNombre: "Torre A",
    contenedor: "K7QM9X",
    contenedorNombre: "Contenedor de papel/cartón",
    contaminante: "Vidrio",
    reportadoEn: Date.now() - DIA,
    reportadoPor: "carla",
    atendida: false,
    atendidaEn: null,
    codigoRetiro: null,
    ...cambios,
  };
}

describe("esNuevo", () => {
  const aviso = (fechaAviso: number): Aviso => ({ id: "a", emoji: "", titulo: "", detalle: "", fecha: fechaAviso });

  test("es nuevo si es posterior a la última vez que se vieron", () => {
    const ahora = Date.now();
    expect(esNuevo(aviso(ahora - DIA), ahora - 2 * DIA)).toBe(true);
    expect(esNuevo(aviso(ahora - 3 * DIA), ahora - 2 * DIA)).toBe(false);
  });

  test("lo de hace más de una semana no se marca como nuevo aunque nunca se haya visto", () => {
    expect(esNuevo(aviso(Date.now() - 8 * DIA), 0)).toBe(false);
  });
});

describe("residente", () => {
  test("un aviso por cada paso de la cadena de sus depósitos", () => {
    const c = certificado({ creadoEn: Date.now() - 2 * DIA });
    const avisos = construirAvisos(usuario(), [c], []);
    expect(avisos.map((a) => a.id)).toEqual([`${c.id}-certificado`, `${c.id}-validado`]);
    expect(avisos.every((a) => a.registroId === c.id)).toBe(true);
  });

  test("avisa si su depósito fue rechazado", () => {
    const r = registro({ estado: "rechazado", validadoEn: Date.now() - DIA, validadoPor: "carla" });
    expect(construirAvisos(usuario(), [r], [])[0].titulo).toBe("Depósito rechazado");
  });

  test("no ve los depósitos de otros residentes", () => {
    const deBeto = certificado({ residenteId: "beto", creadoEn: Date.now() - DIA });
    expect(construirAvisos(usuario(), [deBeto], [])).toEqual([]);
  });

  test("solo lo del último mes", () => {
    const antiguo = certificado({ creadoEn: Date.now() - 40 * DIA });
    expect(construirAvisos(usuario(), [antiguo], [])).toEqual([]);
  });

  test("ve en rojo la contaminación reciente de su torre", () => {
    const avisos = construirAvisos(usuario(), [], [], [incidencia()]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0].tono).toBe("alerta");
    expect(avisos[0].titulo).toBe("Se encontró vidrio en el contenedor de papel/cartón");
  });

  test("del más reciente al más antiguo y con un tope de 30", () => {
    const muchos = Array.from({ length: 40 }, (_, i) =>
      certificado({ creadoEn: Date.now() - (i + 1) * 3_600_000 })
    );
    const avisos = construirAvisos(usuario(), muchos, []);
    expect(avisos).toHaveLength(30);
    for (let i = 1; i < avisos.length; i++) {
      expect(avisos[i - 1].fecha).toBeGreaterThanOrEqual(avisos[i].fecha);
    }
  });
});

describe("administrador", () => {
  const carla = usuario({ id: "carla", rol: "administrador", depto: "Administración" });

  test("un aviso por cada depósito pendiente de su torre", () => {
    const pendiente = registro({ creadoEn: Date.now() - 3_600_000 });
    const avisos = construirAvisos(carla, [pendiente, validado(), registro({ torreId: "torre-b" })], []);
    expect(avisos.map((a) => a.id)).toEqual([`${pendiente.id}-pendiente`]);
    expect(avisos[0].detalle).toContain("Depto 305");
  });
});

describe("gestor", () => {
  const gus = usuario({ id: "gus", rol: "gestor", torreId: null, torreNombre: null });

  test("un aviso por torre con contenedor listo para retiro", () => {
    const registros = [validado(), validado(), validado({ torreId: "torre-b", torreNombre: "Torre B" })];
    const avisos = construirAvisos(gus, registros, lotesPorRetirar(registros, [TORRE_A]));
    expect(avisos).toHaveLength(2);
    expect(avisos.map((a) => a.titulo).sort()).toEqual([
      "Torre A: contenedor listo para retiro",
      "Torre B: contenedor listo para retiro",
    ]);
  });

  test("el aviso vuelve a ser nuevo si llega otro depósito validado a la torre", () => {
    const primero = validado({ validadoEn: Date.now() - 3_600_000 });
    const antes = construirAvisos(gus, [primero], lotesPorRetirar([primero], [TORRE_A]));
    const segundo = validado({ validadoEn: Date.now() - 60_000 });
    const despues = construirAvisos(gus, [primero, segundo], lotesPorRetirar([primero, segundo], [TORRE_A]));
    expect(despues[0].id).not.toBe(antes[0].id);
  });

  test("advierte los contenedores contaminados que aún no retira", () => {
    const avisos = construirAvisos(gus, [], [], [incidencia(), incidencia({ id: "i2", atendida: true })]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0].titulo).toBe("Precaución en Torre A");
  });
});

test("sin sesión no hay avisos", () => {
  expect(construirAvisos(null, [certificado()], [])).toEqual([]);
});
