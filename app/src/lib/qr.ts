import qrcode from "qrcode-generator";

/**
 * Código QR de un contenedor.
 *
 * El contenido del QR es `ECOTRACK:<torreId>:<contenedor>`, por ejemplo
 * `ECOTRACK:torre-a:T-A-01`. Lleva la torre para poder rechazar en el momento un
 * QR de otra torre: un residente solo puede depositar en los contenedores de la
 * torre a la que pertenece.
 *
 * El identificador corto del contenedor (`T-A-01`) también se acepta escrito a
 * mano: es el respaldo cuando la cámara no lee el código o hay poca luz.
 */
const PREFIJO = "ECOTRACK";

/** `torre-a` → `T-A`. Es la parte fija del identificador de sus contenedores. */
export function siglaTorre(torreId: string): string {
  return torreId.replace(/^torre-/, "T-").toUpperCase();
}

/** Identificador del n-ésimo contenedor de una torre: `torre-a`, 1 → `T-A-01`. */
export function idContenedor(torreId: string, numero = 1): string {
  return `${siglaTorre(torreId)}-${String(numero).padStart(2, "0")}`;
}

/** Texto que se codifica en el QR impreso en el contenedor. */
export function contenidoQr(torreId: string, numero = 1): string {
  return `${PREFIJO}:${torreId}:${idContenedor(torreId, numero)}`;
}

export type LecturaContenedor =
  | { ok: true; contenedor: string }
  | { ok: false; error: string };

/**
 * Interpreta lo que llegó de la cámara o del campo manual y comprueba que el
 * contenedor pertenezca a la torre del usuario.
 */
export function interpretarContenedor(
  texto: string,
  torreIdUsuario: string | null
): LecturaContenedor {
  if (!torreIdUsuario) {
    return { ok: false, error: "Tu cuenta no está vinculada a una torre." };
  }

  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Ingresa el código del contenedor." };

  const partes = limpio.split(":");

  if (partes[0].toUpperCase() === PREFIJO) {
    if (partes.length !== 3 || !partes[1] || !partes[2]) {
      return { ok: false, error: "El código QR no tiene el formato de EcoTrack." };
    }
    const [, torreId, contenedor] = partes;
    if (torreId !== torreIdUsuario) {
      return {
        ok: false,
        error: "Ese contenedor es de otra torre. Solo puedes depositar en el de tu torre.",
      };
    }
    return { ok: true, contenedor: contenedor.toUpperCase() };
  }

  // Ingreso manual del identificador corto, p. ej. "t-a-01".
  const corto = limpio.toUpperCase();
  const patron = new RegExp(`^${siglaTorre(torreIdUsuario)}-\\d{2}$`);
  if (patron.test(corto)) return { ok: true, contenedor: corto };

  if (/^T-[A-Z0-9]+-\d{2}$/.test(corto)) {
    return {
      ok: false,
      error: "Ese contenedor es de otra torre. Solo puedes depositar en el de tu torre.",
    };
  }
  return { ok: false, error: "No reconozco ese código. Debe verse así: T-A-01." };
}

/**
 * Matriz de módulos del QR (true = módulo oscuro), para dibujarla sin depender
 * de canvas: sirve igual en web y en el teléfono.
 */
export function matrizQr(texto: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();

  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, fila) =>
    Array.from({ length: n }, (_, col) => qr.isDark(fila, col))
  );
}
