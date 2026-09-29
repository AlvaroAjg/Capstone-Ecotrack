import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fechaLarga } from "./formato";

/**
 * Piezas comunes de los PDF de EcoTrack (certificado del residente y reporte
 * del administrador), generados en el dispositivo con pdf-lib y no con
 * window.print(): imprimir HTML no es confiable en una PWA de iPhone, y así el
 * archivo es idéntico en cualquier dispositivo.
 *
 * Solo lo importan los archivos .web.ts: en el teléfono nativo no se incluye.
 */

export const ANCHO = 595; // A4 en puntos
export const ALTO = 842;
export const MARGEN = 40;
/** Donde termina el área útil: debajo va el pie de página. */
export const LIMITE_INFERIOR = ALTO - 80;
export const ALTO_FILA = 17;

export const BLANCO = rgb(1, 1, 1);
export const VERDE = rgb(0.086, 0.502, 0.238); // #15803D
export const VERDE_OSCURO = rgb(0.078, 0.325, 0.176);
export const VERDE_CLARO = rgb(0.86, 0.95, 0.89);
export const ROJO = rgb(0.725, 0.11, 0.11); // #B91C1C
export const GRIS = rgb(0.42, 0.45, 0.5);
export const GRIS_SUAVE = rgb(0.62, 0.64, 0.68);
export const GRIS_CLARO = rgb(0.9, 0.91, 0.93);
export const FONDO_FILA = rgb(0.97, 0.98, 0.98);
export const TEXTO = rgb(0.07, 0.09, 0.15);

export type Color = ReturnType<typeof rgb>;

export interface Pincel {
  pagina: PDFPage;
  normal: PDFFont;
  negrita: PDFFont;
}

/** Un documento A4 con las fuentes ya cargadas y una forma de agregar páginas. */
export async function nuevoDocumento(metadatos: { titulo: string; asunto: string }) {
  const doc = await PDFDocument.create();
  doc.setTitle(metadatos.titulo);
  doc.setAuthor("EcoTrack");
  doc.setSubject(metadatos.asunto);

  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const nuevaPagina = (): Pincel => ({ pagina: doc.addPage([ANCHO, ALTO]), normal, negrita });
  return { doc, normal, negrita, nuevaPagina };
}

/**
 * Las fuentes estándar del PDF solo codifican Latin-1: tildes y eñes sí, pero un
 * emoji o una letra fuera de ese rango haría fallar la generación. Se normalizan
 * los espacios especiales que produce toLocaleString y se reemplaza lo demás.
 */
export function seguro(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[\s  ]+/g, " ")
    .replace(/[^\x20-\x7E¡-ÿ]/g, "?");
}

/** Texto centrado horizontalmente. `arriba` se mide desde el borde superior. */
export function centrado(
  p: Pincel,
  texto: string,
  arriba: number,
  tamano: number,
  opciones: { negrita?: boolean; color?: Color } = {}
) {
  const limpio = seguro(texto);
  const fuente = opciones.negrita ? p.negrita : p.normal;
  p.pagina.drawText(limpio, {
    x: (ANCHO - fuente.widthOfTextAtSize(limpio, tamano)) / 2,
    y: ALTO - arriba,
    size: tamano,
    font: fuente,
    color: opciones.color ?? TEXTO,
  });
}

export function izquierda(
  p: Pincel,
  texto: string,
  x: number,
  arriba: number,
  tamano: number,
  opciones: { negrita?: boolean; color?: Color } = {}
) {
  p.pagina.drawText(seguro(texto), {
    x,
    y: ALTO - arriba,
    size: tamano,
    font: opciones.negrita ? p.negrita : p.normal,
    color: opciones.color ?? TEXTO,
  });
}

/** Texto alineado a la derecha, terminando en `x`. */
export function derecha(
  p: Pincel,
  texto: string,
  x: number,
  arriba: number,
  tamano: number,
  opciones: { negrita?: boolean; color?: Color } = {}
) {
  const limpio = seguro(texto);
  const fuente = opciones.negrita ? p.negrita : p.normal;
  p.pagina.drawText(limpio, {
    x: x - fuente.widthOfTextAtSize(limpio, tamano),
    y: ALTO - arriba,
    size: tamano,
    font: fuente,
    color: opciones.color ?? TEXTO,
  });
}

export function linea(p: Pincel, arriba: number) {
  p.pagina.drawLine({
    start: { x: MARGEN, y: ALTO - arriba },
    end: { x: ANCHO - MARGEN, y: ALTO - arriba },
    thickness: 0.8,
    color: GRIS_CLARO,
  });
}

/** Franja verde superior con la marca, igual en todos los documentos. */
export function franjaMarca(p: Pincel) {
  p.pagina.drawRectangle({ x: 0, y: ALTO - 110, width: ANCHO, height: 110, color: VERDE });
  p.pagina.drawRectangle({ x: 0, y: ALTO - 110, width: ANCHO, height: 5, color: VERDE_OSCURO });
  centrado(p, "EcoTrack", 58, 28, { negrita: true, color: BLANCO });
  centrado(p, "Reciclaje verificado, desde tu torre hacia arriba", 80, 10, { color: VERDE_CLARO });
}

/**
 * Pie de cada página: fecha de emisión, referencia del documento, número de
 * página y una nota. Se dibuja al final, cuando ya se sabe cuántas páginas hay.
 */
export function piesDePagina(
  doc: PDFDocument,
  fuentes: { normal: PDFFont; negrita: PDFFont },
  referencia: string,
  nota: string
) {
  const paginas = doc.getPages();
  paginas.forEach((pagina, i) => {
    const pie: Pincel = { pagina, ...fuentes };
    pagina.drawLine({
      start: { x: MARGEN, y: 58 },
      end: { x: ANCHO - MARGEN, y: 58 },
      thickness: 0.8,
      color: GRIS_CLARO,
    });
    centrado(
      pie,
      `Emitido el ${fechaLarga(Date.now())} · ${referencia} · Página ${i + 1} de ${paginas.length}`,
      ALTO - 44,
      8,
      { color: GRIS }
    );
    centrado(pie, nota, ALTO - 32, 6.5, { color: GRIS });
  });
}

export type ResultadoDescarga = "compartido" | "descargado" | "cancelado";

/** ¿El dispositivo es táctil (teléfono o tableta)? Ahí conviene la hoja de compartir. */
function esTactil(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Entrega un PDF al usuario.
 *
 * En iPhone se abre la hoja de compartir con el archivo, desde donde se puede
 * "Guardar en Archivos" o enviarlo por WhatsApp o correo. En un computador se
 * descarga directamente. Debe llamarse dentro del gesto del usuario (un toque):
 * iOS rechaza compartir si pasó demasiado tiempo desde el toque.
 */
export async function entregarPdf(
  bytes: Uint8Array,
  nombre: string,
  titulo: string
): Promise<ResultadoDescarga> {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });

  if (esTactil() && typeof File === "function" && navigator.canShare && navigator.share) {
    const archivo = new File([blob], nombre, { type: "application/pdf" });
    if (navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: titulo });
        return "compartido";
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return "cancelado";
        // Cualquier otro fallo (p. ej. permiso de iOS): se intenta la descarga directa.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "descargado";
}
