// Cálculos de las secciones del panel donde el administrador configura la
// planta: contenedores por punto limpio, áreas y personas. Son funciones puras
// (sin React ni Firestore) para poder probarlas.

import { nombreContenedor, type Contenedor, type Registro, type Usuario } from "./tipos";

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

/**
 * Código para unirse a un área: las tres primeras letras de su nombre y cuatro
 * cifras al azar, p. ej. «EMB-4821» para Embotellado. Las letras ayudan a
 * reconocerlo; las cifras, a que no se adivine. No repite uno de `existentes`.
 */
export function generarCodigoArea(
  nombre: string,
  existentes: string[],
  azar: () => number = Math.random
): string {
  const letras = nombre
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
  const usados = new Set(existentes.map((c) => c.toUpperCase()));
  for (let intento = 0; intento < 50; intento++) {
    const codigo = `${letras}-${1000 + Math.floor(azar() * 9000)}`;
    if (!usados.has(codigo)) return codigo;
  }
  throw new Error("No se pudo generar un código de área. Intenta de nuevo.");
}

/** Cuántas personas registradas tiene cada área (colaboradores y validadores). */
export function personasPorArea(personas: Usuario[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const p of personas) {
    if (p.rol === "administrador" || !p.areaId) continue;
    cuenta[p.areaId] = (cuenta[p.areaId] ?? 0) + 1;
  }
  return cuenta;
}

export interface FilaPersona {
  persona: Usuario;
  /** Último depósito que registró; null si nunca ha depositado. */
  ultimoDeposito: number | null;
}

/** Para buscar sin importar mayúsculas ni tildes. */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Las personas de la planta para la tabla del panel, por nombre, con la fecha
 * de su último depósito. `busqueda` filtra por nombre (sin importar tildes) y
 * `areaId`, por área; null muestra todas.
 */
export function filasPersonas(
  personas: Usuario[],
  registros: Registro[],
  filtro: { busqueda: string; areaId: string | null }
): FilaPersona[] {
  const ultimo = new Map<string, number>();
  for (const r of registros) {
    ultimo.set(r.colaboradorId, Math.max(ultimo.get(r.colaboradorId) ?? 0, r.creadoEn));
  }
  const buscado = normalizar(filtro.busqueda);
  return personas
    .filter((p) => !buscado || normalizar(p.nombre).includes(buscado))
    .filter((p) => filtro.areaId === null || p.areaId === filtro.areaId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((persona) => ({ persona, ultimoDeposito: ultimo.get(persona.id) ?? null }));
}
