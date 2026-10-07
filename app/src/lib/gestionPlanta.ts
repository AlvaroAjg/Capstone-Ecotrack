// Cálculos de las secciones del panel donde el administrador configura la
// planta: contenedores por punto limpio, áreas y personas. Son funciones puras
// (sin React ni Firestore) para poder probarlas.

import { nombreContenedor, type Contenedor } from "./tipos";

export interface PuntoLimpio {
  punto: string;
  contenedores: Contenedor[];
}

/**
 * Los contenedores activos agrupados por punto limpio, por nombre. Todavía no
 * se sabe cuántos puntos limpios tiene la planta: cada contenedor lleva el
 * suyo, y los puntos salen de ahí. Dentro de un punto, primero el mixto y
 * después por material.
 */
export function agruparPorPunto(contenedores: Contenedor[]): PuntoLimpio[] {
  const porPunto = new Map<string, Contenedor[]>();
  for (const c of contenedores) {
    if (!c.activo) continue;
    porPunto.set(c.punto, [...(porPunto.get(c.punto) ?? []), c]);
  }
  return Array.from(porPunto.entries())
    .map(([punto, lista]) => ({
      punto,
      contenedores: lista.sort(
        (a, b) =>
          Number(a.material !== null) - Number(b.material !== null) ||
          nombreContenedor(a).localeCompare(nombreContenedor(b), "es")
      ),
    }))
    .sort((a, b) => a.punto.localeCompare(b.punto, "es"));
}
