import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fechaLarga } from "./formato";

/**
 * Piezas comunes de los PDF de RecyTrack (certificado del colaborador y reporte
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

export type Color = ReturnType<typeof rgb>;

/** "#3F6B2E" → el color de pdf-lib. */
export function hex(color: string): Color {
  const n = parseInt(color.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Los colores de RecyTrack, los mismos del panel (ver tailwind.config.js). */
export const MARCA = {
  vino: hex("#2B1424"),
  vinoTexto: hex("#F6EFF3"),
  vinoSuave: hex("#C3AEBC"),
  vinoNav: hex("#DCCDD6"),
  oliva: hex("#3F6B2E"),
  olivaClaro: hex("#E6EEDD"),
  olivaMedio: hex("#A9C98F"),
  olivaHoja: hex("#8DB574"),
  uva: hex("#CFE3BE"),
  ambar: hex("#A8732F"),
  ambarOscuro: hex("#7A4E17"),
  ambarClaro: hex("#F5EBDD"),
  ambarVivo: hex("#D9A35B"),
  rojizo: hex("#8A2A22"),
  piedra: hex("#F1F2EE"),
  piedraBorde: hex("#E2E4DE"),
  piedraLinea: hex("#ECEDE8"),
  piedraControl: hex("#CFD2CA"),
  marfil: hex("#FBFAF7"),
  tinta: hex("#221C20"),
  tintaMedia: hex("#4D474B"),
  tintaSuave: hex("#6E686C"),
};

export interface Pincel {
  pagina: PDFPage;
  normal: PDFFont;
  negrita: PDFFont;
  /** Con serifa, para títulos y números grandes, como Gloock en el panel. */
  serif: PDFFont;
}

interface OpcionesTexto {
  negrita?: boolean;
  serif?: boolean;
  color?: Color;
}

function fuenteDe(p: Pincel, opciones: OpcionesTexto): PDFFont {
  return opciones.serif ? p.serif : opciones.negrita ? p.negrita : p.normal;
}

/** Un documento A4 con las fuentes ya cargadas y una forma de agregar páginas. */
export async function nuevoDocumento(metadatos: { titulo: string; asunto: string }) {
  const doc = await PDFDocument.create();
  doc.setTitle(metadatos.titulo);
  doc.setAuthor("RecyTrack");
  doc.setSubject(metadatos.asunto);

  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const nuevaPagina = (): Pincel => ({ pagina: doc.addPage([ANCHO, ALTO]), normal, negrita, serif });
  return { doc, normal, negrita, serif, nuevaPagina };
}

/**
 * Las fuentes estándar del PDF solo codifican Latin-1: tildes y eñes sí, pero un
 * emoji o una letra fuera de ese rango haría fallar la generación. Se normalizan
 * los espacios especiales que produce toLocaleString, los guiones y comillas
 * tipográficos pasan a sus equivalentes simples (las semanas son «1–4 oct») y
 * se reemplaza lo demás.
 */
export function seguro(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[\s  ]+/g, " ")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E¡-ÿ]/g, "?");
}

/** Texto centrado horizontalmente. `arriba` se mide desde el borde superior. */
export function centrado(p: Pincel, texto: string, arriba: number, tamano: number, opciones: OpcionesTexto = {}) {
  centradoEn(p, texto, ANCHO / 2, arriba, tamano, opciones);
}

/** Texto centrado en `centro`, no en la página. */
export function centradoEn(
  p: Pincel,
  texto: string,
  centro: number,
  arriba: number,
  tamano: number,
  opciones: OpcionesTexto = {}
) {
  const limpio = seguro(texto);
  const fuente = fuenteDe(p, opciones);
  p.pagina.drawText(limpio, {
    x: centro - fuente.widthOfTextAtSize(limpio, tamano) / 2,
    y: ALTO - arriba,
    size: tamano,
    font: fuente,
    color: opciones.color ?? MARCA.tinta,
  });
}

export function izquierda(
  p: Pincel,
  texto: string,
  x: number,
  arriba: number,
  tamano: number,
  opciones: OpcionesTexto = {}
) {
  p.pagina.drawText(seguro(texto), {
    x,
    y: ALTO - arriba,
    size: tamano,
    font: fuenteDe(p, opciones),
    color: opciones.color ?? MARCA.tinta,
  });
}

/** Texto alineado a la derecha, terminando en `x`. */
export function derecha(
  p: Pincel,
  texto: string,
  x: number,
  arriba: number,
  tamano: number,
  opciones: OpcionesTexto = {}
) {
  const limpio = seguro(texto);
  const fuente = fuenteDe(p, opciones);
  p.pagina.drawText(limpio, {
    x: x - fuente.widthOfTextAtSize(limpio, tamano),
    y: ALTO - arriba,
    size: tamano,
    font: fuente,
    color: opciones.color ?? MARCA.tinta,
  });
}

/** El tamaño más grande, hasta `maximo`, con que `texto` cabe en `ancho`. */
export function tamanoQueCabe(fuente: PDFFont, texto: string, ancho: number, maximo: number, minimo = 8): number {
  const limpio = seguro(texto);
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(limpio, tamano) > ancho) tamano -= 0.5;
  return tamano;
}

/** Ancho de `texto` con esas opciones, para alinear cosas a su lado. */
export function anchoTexto(p: Pincel, texto: string, tamano: number, opciones: OpcionesTexto = {}): number {
  return fuenteDe(p, opciones).widthOfTextAtSize(seguro(texto), tamano);
}

/**
 * Rectángulo con esquinas redondeadas. `arriba` es su borde superior, medido
 * desde arriba de la página como el resto de las piezas.
 */
export function caja(
  p: Pincel,
  x: number,
  arriba: number,
  ancho: number,
  alto: number,
  opciones: { relleno?: Color; borde?: Color; grosor?: number; radio?: number } = {}
) {
  const r = Math.min(opciones.radio ?? 8, ancho / 2, alto / 2);
  const camino =
    `M ${r} 0 H ${ancho - r} A ${r} ${r} 0 0 1 ${ancho} ${r} V ${alto - r} ` +
    `A ${r} ${r} 0 0 1 ${ancho - r} ${alto} H ${r} A ${r} ${r} 0 0 1 0 ${alto - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  p.pagina.drawSvgPath(camino, {
    x,
    y: ALTO - arriba,
    color: opciones.relleno,
    borderColor: opciones.borde,
    borderWidth: opciones.borde ? opciones.grosor ?? 1 : 0,
  });
}

/**
 * Anillo de avance: un círculo de fondo y, encima, el arco del `porcentaje`
 * empezando arriba, en el sentido del reloj. `centroArriba` se mide desde
 * arriba de la página.
 */
export function anillo(
  p: Pincel,
  centroX: number,
  centroArriba: number,
  radio: number,
  grosor: number,
  porcentaje: number,
  color: Color,
  fondo: Color
) {
  const y = ALTO - centroArriba;
  p.pagina.drawCircle({ x: centroX, y, size: radio, borderColor: fondo, borderWidth: grosor });
  const avance = Math.max(0, Math.min(100, porcentaje));
  if (avance <= 0) return;
  if (avance >= 100) {
    p.pagina.drawCircle({ x: centroX, y, size: radio, borderColor: color, borderWidth: grosor });
    return;
  }
  const angulo = (avance / 100) * 2 * Math.PI;
  const finX = radio * Math.sin(angulo);
  const finY = -radio * Math.cos(angulo);
  const largo = avance > 50 ? 1 : 0;
  p.pagina.drawSvgPath(`M 0 ${-radio} A ${radio} ${radio} 0 ${largo} 1 ${finX} ${finY}`, {
    x: centroX,
    y,
    borderColor: color,
    borderWidth: grosor,
  });
}

/** Línea vertical punteada, para marcar una meta sobre una barra. */
export function marcaMeta(p: Pincel, x: number, arriba: number, alto: number, color: Color) {
  p.pagina.drawLine({
    start: { x, y: ALTO - arriba },
    end: { x, y: ALTO - arriba - alto },
    thickness: 1.2,
    color,
    dashArray: [2, 2],
  });
}

/** El logo de RecyTrack: seis uvas, la de abajo ámbar, y una hoja. `lado` es su tamaño. */
export function logo(p: Pincel, x: number, arriba: number, lado: number, uvas: Color = MARCA.uva) {
  const e = lado / 40;
  const uva = (cx: number, cy: number, color: Color) =>
    p.pagina.drawCircle({ x: x + cx * e, y: ALTO - arriba - cy * e, size: 4.3 * e, color });
  p.pagina.drawSvgPath("M 20 11 C 20 7 22.5 4.5 27 3.5 C 26.4 8.1 23.8 10.5 20 11 Z", {
    x,
    y: ALTO - arriba,
    scale: e,
    color: MARCA.olivaHoja,
  });
  uva(12, 17, uvas);
  uva(20, 17, uvas);
  uva(28, 17, uvas);
  uva(16, 24.5, uvas);
  uva(24, 24.5, uvas);
  uva(20, 32, MARCA.ambarVivo);
}

/**
 * Pie de cada página: fecha de emisión, referencia del documento, número de
 * página y una nota. Se dibuja al final, cuando ya se sabe cuántas páginas hay.
 */
export function piesDePagina(
  doc: PDFDocument,
  fuentes: { normal: PDFFont; negrita: PDFFont; serif: PDFFont },
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
      color: MARCA.piedraBorde,
    });
    centrado(
      pie,
      `Emitido el ${fechaLarga(Date.now())} · ${referencia} · Página ${i + 1} de ${paginas.length}`,
      ALTO - 44,
      8,
      { color: MARCA.tintaSuave }
    );
    centrado(pie, nota, ALTO - 32, 6.5, { color: MARCA.tintaSuave });
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
