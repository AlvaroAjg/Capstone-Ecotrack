// Lo que la navegación guarda en el historial del navegador (ver
// state/historial.ts): leerlo de vuelta con cuidado, porque el historial
// sobrevive a una recarga y puede traer una pantalla de otra cuenta o de una
// versión anterior de la app.

export interface RutaGuardada {
  pantalla: string;
  params: { registroId?: string };
}

/**
 * La pila de pantallas guardada en el historial, o null si no sirve: debe
 * empezar en una pantalla raíz de este rol y tener solo pantallas conocidas.
 */
export function pilaGuardada(
  valor: unknown,
  permitidas: readonly string[],
  raices: readonly string[]
): RutaGuardada[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  const pila: RutaGuardada[] = [];
  for (const ruta of valor) {
    if (typeof ruta !== "object" || ruta === null) return null;
    const { pantalla, params } = ruta as { pantalla?: unknown; params?: unknown };
    if (typeof pantalla !== "string" || !permitidas.includes(pantalla)) return null;
    const registroId = (params as { registroId?: unknown } | undefined)?.registroId;
    if (registroId !== undefined && typeof registroId !== "string") return null;
    pila.push({ pantalla, params: registroId ? { registroId } : {} });
  }
  return raices.includes(pila[0].pantalla) ? pila : null;
}

/** Una opción guardada en el historial (la sección del panel, login o registro), o null. */
export function opcionGuardada<T extends string>(valor: unknown, validas: readonly T[]): T | null {
  return typeof valor === "string" && (validas as readonly string[]).includes(valor) ? (valor as T) : null;
}

/**
 * La dirección que se ve en el navegador para una pantalla: «#inicio»,
 * «#deposito/abc123». Al recargar manda el estado guardado en el historial;
 * la dirección solo se lee cuando no hay nada guardado (un enlace abierto en
 * una pestaña nueva).
 */
export function direccion(nombre: string, id?: string): string {
  return `#${nombre}${id ? `/${encodeURIComponent(id)}` : ""}`;
}
