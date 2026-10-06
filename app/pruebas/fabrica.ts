// Datos de prueba compartidos por los tests de la lógica de la app.

import { vi } from "vitest";
import type {
  Area,
  Contenedor,
  Incidencia,
  Planta,
  Registro,
  ResumenMes,
  Usuario,
} from "../src/lib/tipos";

/** Fecha local; `mes` va de 1 a 12, no de 0 a 11 como en Date. */
export function fecha(anio: number, mes: number, dia: number, hora = 12): number {
  return new Date(anio, mes - 1, dia, hora).getTime();
}

/**
 * Fija "ahora" (Date y Date.now) sin congelar los temporizadores. Los tests
 * corren el miércoles 16 de septiembre de 2026 al mediodía, salvo que digan
 * otra cosa.
 */
export function fijarAhora(instante: number = fecha(2026, 9, 16)): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(instante);
}

export const PLANTA: Planta = {
  id: "planta-1",
  nombre: "Planta Piloto",
  empresa: "Viña Piloto",
};

export const EMBOTELLADO: Area = {
  id: "embotellado",
  plantaId: "planta-1",
  nombre: "Embotellado",
  codigo: "EMB-4821",
  dotacion: 20,
};

export const FERMENTACION: Area = {
  id: "fermentacion",
  plantaId: "planta-1",
  nombre: "Fermentación",
  codigo: "FER-1234",
  dotacion: 10,
};

let contador = 0;

/** Un depósito pendiente de Ana, de Embotellado, con lo que se le cambie. */
export function registro(cambios: Partial<Registro> = {}): Registro {
  contador++;
  return {
    id: `r${contador}`,
    colaboradorId: "ana",
    plantaId: "planta-1",
    areaId: "embotellado",
    material: "Plástico",
    talla: "M",
    kgDeclarado: 0.4,
    kgConfirmado: null,
    contenedor: "K7QM9X",
    estado: "pendiente",
    creadoEn: fecha(2026, 9, 15),
    validadoEn: null,
    validadoPor: null,
    certificadoEn: null,
    certificadoPor: null,
    codigo: null,
    retiroId: null,
    ...cambios,
  };
}

/** Un depósito que ya completó la cadena, con los kilos confirmados. */
export function certificado(cambios: Partial<Registro> = {}): Registro {
  const base = registro(cambios);
  return {
    ...base,
    estado: "certificado",
    kgConfirmado: base.kgDeclarado,
    validadoEn: base.creadoEn + 60_000,
    validadoPor: "carla",
    certificadoEn: base.creadoEn + 120_000,
    certificadoPor: "adela",
    codigo: "ECO-AAAA-BBBB",
    retiroId: "RET-CCCC",
    ...cambios,
  };
}

/** Un depósito validado por el validador, esperando el retiro. */
export function validado(cambios: Partial<Registro> = {}): Registro {
  const base = registro(cambios);
  return {
    ...base,
    estado: "validado",
    kgConfirmado: base.kgDeclarado,
    validadoEn: base.creadoEn + 60_000,
    validadoPor: "carla",
    ...cambios,
  };
}

/** Ana, colaboradora de Embotellado. */
export function usuario(cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: "ana",
    nombre: "Ana",
    email: "ana@test.cl",
    rol: "colaborador",
    plantaId: "planta-1",
    areaId: "embotellado",
    areaNombre: "Embotellado",
    avisosVistosHasta: 0,
    ...cambios,
  };
}

/** El contenedor de plástico del punto limpio del casino. */
export function contenedor(cambios: Partial<Contenedor> = {}): Contenedor {
  return {
    codigo: "K7QM9X",
    plantaId: "planta-1",
    punto: "Casino",
    material: "Plástico",
    activo: true,
    creadoEn: fecha(2026, 9, 1),
    ...cambios,
  };
}

/** Vidrio encontrado en el contenedor de papel/cartón, todavía sin retirar. */
export function incidencia(cambios: Partial<Incidencia> = {}): Incidencia {
  return {
    id: "i1",
    plantaId: "planta-1",
    contenedor: "K7QM9X",
    contenedorNombre: "Contenedor de papel/cartón",
    contaminante: "Vidrio",
    reportadoEn: fecha(2026, 9, 10),
    reportadoPor: "carla",
    atendida: false,
    atendidaEn: null,
    retiroId: null,
    ...cambios,
  };
}

/** El resumen de septiembre de la planta, con lo que lleve cada área. */
export function resumen(areas: ResumenMes["areas"] = {}): ResumenMes {
  return {
    plantaId: "planta-1",
    mes: "2026-09",
    areas,
    ultimoRegistro: "r1",
  };
}
