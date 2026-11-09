import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/**
 * Un estado de navegación (qué pantalla o sección se ve) que en la web también
 * vive en el historial del navegador. Cada cambio agrega una entrada, así el
 * botón Atrás del navegador o el gesto de volver del teléfono vuelven a la
 * pantalla anterior dentro de RecyTrack en vez de salir de la app; y como el
 * historial sobrevive a una recarga, recargar deja donde se estaba.
 *
 * Cada parte de la app guarda lo suyo bajo su `clave` ("acceso", "pila",
 * "seccion"). En la app nativa es un estado común y `atras` usa la alternativa.
 *
 * - `leer`: valida lo guardado (puede venir de otra cuenta o de una versión
 *   anterior); null si no sirve, y entonces se usa `inicial`.
 * - `direccion`: lo que se ve en la barra de direcciones.
 * - `desdeDireccion`: si no hay nada guardado (un enlace abierto en una
 *   pestaña nueva), lee la pantalla desde la dirección; null si no sirve.
 */
export function useNavegacionWeb<T>(
  clave: string,
  inicial: () => T,
  leer: (guardado: unknown) => T | null,
  direccion: (valor: T) => string,
  desdeDireccion?: (direccion: string) => T | null
) {
  const web = Platform.OS === "web";
  const [valor, setValor] = useState<T>(
    () =>
      (web ? leer(window.history.state?.[clave]) ?? desdeDireccion?.(window.location.hash) : null) ?? inicial()
  );
  // Lo vigente, para no apilar dos veces la misma pantalla.
  const actual = useRef(valor);
  actual.current = valor;

  useEffect(() => {
    if (!web) return;
    // La entrada en que se entra (o se recarga) queda con el estado de ahora.
    window.history.replaceState({ ...window.history.state, [clave]: actual.current }, "", direccion(actual.current));
    const alVolver = (evento: PopStateEvent) => setValor(leer(evento.state?.[clave]) ?? inicial());
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
    // Las funciones son puras y la clave fija: basta con suscribirse al montar.
  }, []);

  /** Pasa a `nuevo` y, en la web, lo deja como una entrada nueva del historial. */
  const ir = useCallback(
    (nuevo: T) => {
      if (JSON.stringify(nuevo) === JSON.stringify(actual.current)) return;
      setValor(nuevo);
      if (web) window.history.pushState({ [clave]: nuevo }, "", direccion(nuevo));
    },
    [web, clave, direccion]
  );

  /** Vuelve atrás: en la web, como el botón del navegador; si no, a `alternativa`. */
  const atras = useCallback(
    (alternativa: T) => {
      if (web) window.history.back();
      else setValor(alternativa);
    },
    [web]
  );

  return { valor, ir, atras };
}
