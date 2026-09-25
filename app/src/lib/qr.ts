import qrcode from "qrcode-generator";

/**
 * Código QR de un contenedor.
 *
 * El contenido del QR es `ECOTRACK:<torreId>:<codigo>`, por ejemplo
 * `ECOTRACK:torre-a:K7QM9X`. El código es aleatorio y no adivinable: para
 * registrar un depósito hay que estar frente al contenedor. Bajo el QR impreso
 * va el mismo código, que también se acepta escrito a mano cuando la cámara no
 * lo lee. Qué material recibe y de qué torre es lo dice el documento
 * `contenedores/{codigo}`, no el QR: así un QR alterado no sirve de nada.
 */
const PREFIJO = "ECOTRACK";

/** Sin letras ni números que se confundan al leerlos (0/O, 1/I). */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LARGO = 6;

/** Código nuevo para un contenedor, p. ej. "K7QM9X". */
export function generarCodigoContenedor(): string {
  return Array.from(
    { length: LARGO },
    () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  ).join("");
}

/** Texto que se codifica en el QR impreso en el contenedor. */
export function contenidoQr(torreId: string, codigo: string): string {
  return `${PREFIJO}:${torreId}:${codigo}`;
}

export type LecturaQr = { ok: true; codigo: string } | { ok: false; error: string };

/**
 * Saca el código de contenedor de lo que llegó de la cámara o del campo
 * manual. Solo revisa el formato y la torre del QR: si el contenedor existe,
 * está activo y qué material recibe se comprueba después, contra Firestore.
 */
export function interpretarQr(texto: string, torreIdUsuario: string | null): LecturaQr {
  if (!torreIdUsuario) {
    return { ok: false, error: "Tu cuenta no está vinculada a una torre." };
  }

  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Ingresa el código del contenedor." };

  let codigo = limpio;
  const partes = limpio.split(":");
  if (partes[0].toUpperCase() === PREFIJO) {
    if (partes.length !== 3 || !partes[1] || !partes[2]) {
      return { ok: false, error: "El código QR no tiene el formato de EcoTrack." };
    }
    if (partes[1] !== torreIdUsuario) {
      return {
        ok: false,
        error: "Ese contenedor es de otra torre. Solo puedes depositar en los de tu torre.",
      };
    }
    codigo = partes[2];
  }

  // Se toleran espacios, guiones y minúsculas al escribirlo a mano.
  codigo = codigo.toUpperCase().replace(/[\s-]/g, "");

  // Los QR anteriores decían "T-A-01" ("TA01" sin guiones, 4 caracteres, así
  // que no se confunde con un código nuevo): ya no identifican un contenedor.
  if (/^T[A-Z]\d{2}$/.test(codigo)) {
    return {
      ok: false,
      error: "Ese es un código antiguo. Pídele al administrador el QR nuevo del contenedor.",
    };
  }
  if (codigo.length !== LARGO || [...codigo].some((c) => !ALFABETO.includes(c))) {
    return { ok: false, error: "No reconozco ese código. Tiene 6 caracteres, como K7QM9X." };
  }
  return { ok: true, codigo };
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
