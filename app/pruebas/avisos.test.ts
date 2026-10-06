import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { construirAvisos, esNuevo, type Aviso } from "../src/lib/avisos";
import { contenedoresPorRetirar } from "../src/lib/derivados";
import {
  certificado,
  contenedor,
  fecha,
  fijarAhora,
  incidencia as incidenciaBase,
  registro,
  usuario,
  validado,
} from "./fabrica";

const DIA = 86_400_000;

beforeEach(() => {
  fijarAhora(fecha(2026, 9, 16));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Una incidencia de ayer: dentro de la ventana de avisos. */
const incidencia: typeof incidenciaBase = (cambios = {}) =>
  incidenciaBase({ reportadoEn: Date.now() - DIA, ...cambios });

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

describe("colaborador", () => {
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

  test("no ve los depósitos de otros colaboradores", () => {
    const deBeto = certificado({ colaboradorId: "beto", creadoEn: Date.now() - DIA });
    expect(construirAvisos(usuario(), [deBeto], [])).toEqual([]);
  });

  test("solo lo del último mes", () => {
    const antiguo = certificado({ creadoEn: Date.now() - 40 * DIA });
    expect(construirAvisos(usuario(), [antiguo], [])).toEqual([]);
  });

  test("ve en rojo la contaminación reciente de su planta", () => {
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

describe("validador", () => {
  const carla = usuario({ id: "carla", rol: "validador" });

  test("un aviso por cada depósito pendiente de su planta", () => {
    const pendiente = registro({ creadoEn: Date.now() - 3_600_000 });
    const avisos = construirAvisos(
      carla,
      [pendiente, validado(), registro({ plantaId: "planta-2" })],
      []
    );
    expect(avisos.map((a) => a.id)).toEqual([`${pendiente.id}-pendiente`]);
    expect(avisos[0].detalle).toContain("contenedor K7QM9X");
  });

  test("no ve contenedores por retirar ni advertencias: eso es del administrador", () => {
    const registros = [validado()];
    const avisos = construirAvisos(
      carla,
      registros,
      contenedoresPorRetirar(registros, [contenedor()]),
      [incidencia()]
    );
    expect(avisos).toEqual([]);
  });
});

describe("administrador", () => {
  const adela = usuario({ id: "adela", rol: "administrador", areaId: null, areaNombre: null });
  const CONTENEDORES = [contenedor(), contenedor({ codigo: "VDRQ7X", material: "Vidrio", punto: "Bodega" })];

  test("un aviso por contenedor listo para retiro", () => {
    const registros = [validado(), validado(), validado({ contenedor: "VDRQ7X", material: "Vidrio" })];
    const avisos = construirAvisos(adela, registros, contenedoresPorRetirar(registros, CONTENEDORES));
    expect(avisos.map((a) => a.titulo).sort()).toEqual([
      "Contenedor de plástico (Casino): listo para retiro",
      "Contenedor de vidrio (Bodega): listo para retiro",
    ]);
  });

  test("el aviso vuelve a ser nuevo si llega otro depósito validado al contenedor", () => {
    const primero = validado({ validadoEn: Date.now() - 3_600_000 });
    const antes = construirAvisos(adela, [primero], contenedoresPorRetirar([primero], CONTENEDORES));
    const segundo = validado({ validadoEn: Date.now() - 60_000 });
    const despues = construirAvisos(
      adela,
      [primero, segundo],
      contenedoresPorRetirar([primero, segundo], CONTENEDORES)
    );
    expect(despues[0].id).not.toBe(antes[0].id);
  });

  test("advierte los contenedores contaminados que aún no se retiran", () => {
    const avisos = construirAvisos(adela, [], [], [incidencia(), incidencia({ id: "i2", atendida: true })]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0].titulo).toBe("Precaución en el contenedor de papel/cartón");
  });

  test("no recibe un aviso por cada depósito pendiente", () => {
    expect(construirAvisos(adela, [registro()], [])).toEqual([]);
  });
});

test("sin sesión no hay avisos", () => {
  expect(construirAvisos(null, [certificado()], [])).toEqual([]);
});
