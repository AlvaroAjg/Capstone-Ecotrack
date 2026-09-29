// Datos de prueba compartidos por los tests de la lógica de la app.

import { vi } from "vitest";
import type { Registro, Torre, Usuario } from "../src/lib/tipos";

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

let contador = 0;

/** Un depósito pendiente de Ana en la Torre A, con lo que se le cambie. */
export function registro(cambios: Partial<Registro> = {}): Registro {
  contador++;
  return {
    id: `r${contador}`,
    residenteId: "ana",
    residente: "Ana",
    depto: "Depto 305",
    torreId: "torre-a",
    torreNombre: "Torre A",
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
    codigoRetiro: null,
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
    certificadoPor: "gus",
    codigo: "ECO-AAAA-BBBB",
    codigoRetiro: "RET-CCCC",
    ...cambios,
  };
}

/** Un depósito validado por el administrador, esperando el retiro. */
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

export const TORRE_A: Torre = {
  id: "torre-a",
  nombre: "Torre A",
  condominio: "Condominio Piloto",
  codigoInvitacion: "ECO-TORRE-A",
  metaKg: 200,
  deptosTotales: 20,
};

export const TORRE_B: Torre = {
  id: "torre-b",
  nombre: "Torre B",
  condominio: "Condominio Piloto",
  codigoInvitacion: "ECO-TORRE-B",
  metaKg: 150,
  deptosTotales: 10,
};

export function usuario(cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: "ana",
    nombre: "Ana",
    email: "ana@test.cl",
    depto: "Depto 305",
    rol: "residente",
    torreId: "torre-a",
    torreNombre: "Torre A",
    avisosVistosHasta: 0,
    ...cambios,
  };
}
