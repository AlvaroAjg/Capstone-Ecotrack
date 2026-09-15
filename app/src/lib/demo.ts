import type { Rol } from "./tipos";

/**
 * Cuentas del entorno de demostración.
 *
 * Existen para que preparar una demo sea un solo toque en lugar de tres
 * registros a mano. Son cuentas de prueba dentro de tu propio proyecto de
 * Firebase: antes del piloto real conviene borrarlas desde la consola.
 */
export const PASSWORD_DEMO = "ecotrack2026";

export interface CuentaDemo {
  rol: Rol;
  email: string;
  password: string;
  nombre: string;
  depto: string;
  torreId: string | null;
  torreNombre: string | null;
}

export const CUENTAS_DEMO: CuentaDemo[] = [
  {
    rol: "residente",
    email: "residente@ecotrack.cl",
    password: PASSWORD_DEMO,
    nombre: "Álvaro Jaña",
    depto: "Depto 305",
    torreId: "torre-a",
    torreNombre: "Torre A",
  },
  {
    rol: "administrador",
    email: "admin@ecotrack.cl",
    password: PASSWORD_DEMO,
    nombre: "Carla Méndez",
    depto: "Administración",
    torreId: "torre-a",
    torreNombre: "Torre A",
  },
  {
    rol: "gestor",
    email: "gestor@ecotrack.cl",
    password: PASSWORD_DEMO,
    nombre: "Recicla Sur SpA",
    depto: "Gestor externo",
    torreId: null,
    torreNombre: null,
  },
];

/** Prellena el campo de correo en cada panel de la pared de demostración. */
export const CORREOS_DEMO: Record<string, string> = Object.fromEntries(
  CUENTAS_DEMO.map((c) => [c.rol, c.email])
);
