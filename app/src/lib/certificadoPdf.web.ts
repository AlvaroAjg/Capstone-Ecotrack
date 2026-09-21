import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fechaLarga, formatKg } from "./formato";
import { kgEfectivo, type Registro } from "./tipos";

/**
 * Certificado de reciclaje en PDF, generado en el dispositivo.
 *
 * Se arma con pdf-lib y no con window.print(): imprimir HTML no es confiable en
 * una PWA de iPhone, y así el archivo es idéntico en cualquier dispositivo.
 */

export const certificadoPdfDisponible = true;

const ANCHO = 595; // A4 en puntos
const ALTO = 842;

const VERDE = rgb(0.086, 0.502, 0.238); // #15803D
const VERDE_OSCURO = rgb(0.078, 0.325, 0.176);
const VERDE_CLARO = rgb(0.86, 0.95, 0.89);
const GRIS = rgb(0.42, 0.45, 0.5);
const GRIS_CLARO = rgb(0.9, 0.91, 0.93);
const TEXTO = rgb(0.07, 0.09, 0.15);

/**
 * Las fuentes estándar del PDF solo codifican Latin-1: tildes y eñes sí, pero un
 * emoji o una letra fuera de ese rango haría fallar la generación. Se normalizan
 * los espacios especiales que produce toLocaleString y se reemplaza lo demás.
 */
function seguro(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[\s  ]+/g, " ")
    .replace(/[^\x20-\x7E¡-ÿ]/g, "?");
}

interface Pincel {
  pagina: PDFPage;
  normal: PDFFont;
  negrita: PDFFont;
}

/** Texto centrado horizontalmente. `arriba` se mide desde el borde superior. */
function centrado(
  p: Pincel,
  texto: string,
  arriba: number,
  tamano: number,
  opciones: { negrita?: boolean; color?: ReturnType<typeof rgb>; espaciado?: number } = {}
) {
  const limpio = seguro(texto);
  const fuente = opciones.negrita ? p.negrita : p.normal;
  const espaciado = opciones.espaciado ?? 0;
  const ancho =
    fuente.widthOfTextAtSize(limpio, tamano) + espaciado * Math.max(0, limpio.length - 1);

  p.pagina.drawText(limpio, {
    x: (ANCHO - ancho) / 2,
    y: ALTO - arriba,
    size: tamano,
    font: fuente,
    color: opciones.color ?? TEXTO,
    characterSpacing: espaciado,
  });
}

function izquierda(
  p: Pincel,
  texto: string,
  x: number,
  arriba: number,
  tamano: number,
  opciones: { negrita?: boolean; color?: ReturnType<typeof rgb> } = {}
) {
  p.pagina.drawText(seguro(texto), {
    x,
    y: ALTO - arriba,
    size: tamano,
    font: opciones.negrita ? p.negrita : p.normal,
    color: opciones.color ?? TEXTO,
  });
}

function etapa(
  p: Pincel,
  arriba: number,
  titulo: string,
  detalle: string,
  momento: number | null,
  ultima: boolean
) {
  const x = 96;
  if (!ultima) {
    p.pagina.drawLine({
      start: { x, y: ALTO - arriba - 9 },
      end: { x, y: ALTO - arriba - 52 },
      thickness: 1.5,
      color: VERDE_CLARO,
    });
  }
  p.pagina.drawCircle({ x, y: ALTO - arriba + 4, size: 9, color: VERDE });
  // Marca de verificación dibujada con líneas: la fuente estándar no trae "✓".
  p.pagina.drawLine({
    start: { x: x - 4, y: ALTO - arriba + 4 },
    end: { x: x - 1, y: ALTO - arriba + 1 },
    thickness: 1.6,
    color: rgb(1, 1, 1),
  });
  p.pagina.drawLine({
    start: { x: x - 1, y: ALTO - arriba + 1 },
    end: { x: x + 4.5, y: ALTO - arriba + 8 },
    thickness: 1.6,
    color: rgb(1, 1, 1),
  });

  izquierda(p, titulo, x + 22, arriba, 11, { negrita: true });
  izquierda(p, detalle, x + 22, arriba + 15, 9.5, { color: GRIS });
  if (momento) izquierda(p, fechaLarga(momento), x + 22, arriba + 28, 9, { color: GRIS });
}

export async function generarCertificadoPdf(registro: Registro): Promise<Uint8Array> {
  if (registro.estado !== "certificado" || !registro.codigo) {
    throw new Error("Este depósito todavía no completó la cadena de verificación.");
  }

  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado EcoTrack ${registro.codigo}`);
  doc.setAuthor("EcoTrack");
  doc.setSubject("Certificado de reciclaje verificado");

  const pagina = doc.addPage([ANCHO, ALTO]);
  const p: Pincel = {
    pagina,
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  // Encabezado
  pagina.drawRectangle({ x: 0, y: ALTO - 150, width: ANCHO, height: 150, color: VERDE });
  pagina.drawRectangle({ x: 0, y: ALTO - 150, width: ANCHO, height: 6, color: VERDE_OSCURO });
  centrado(p, "EcoTrack", 78, 34, { negrita: true, color: rgb(1, 1, 1) });
  centrado(p, "Reciclaje verificado, desde tu torre hacia arriba", 104, 11, {
    color: rgb(0.86, 0.95, 0.89),
  });

  // Título y beneficiario
  centrado(p, "CERTIFICADO DE RECICLAJE VERIFICADO", 205, 17, { negrita: true });
  pagina.drawRectangle({ x: ANCHO / 2 - 30, y: ALTO - 218, width: 60, height: 2.5, color: VERDE });

  centrado(p, "Se certifica que", 252, 12, { color: GRIS });
  centrado(p, registro.residente, 284, 24, { negrita: true });
  centrado(p, `${registro.torreNombre} · ${registro.depto}`, 306, 12, { color: GRIS });

  centrado(p, "recicló de forma verificada", 345, 12, { color: GRIS });
  centrado(p, formatKg(kgEfectivo(registro)), 388, 42, { negrita: true, color: VERDE });
  centrado(p, registro.material, 412, 15, { negrita: true });

  // Código
  const cajaAncho = 300;
  const cajaAlto = 62;
  pagina.drawRectangle({
    x: (ANCHO - cajaAncho) / 2,
    y: ALTO - 452 - cajaAlto,
    width: cajaAncho,
    height: cajaAlto,
    color: rgb(0.97, 0.98, 0.98),
    borderColor: GRIS_CLARO,
    borderWidth: 1,
  });
  centrado(p, "CÓDIGO DE VERIFICACIÓN", 472, 8.5, { color: GRIS, espaciado: 1.2 });
  centrado(p, registro.codigo, 498, 22, { negrita: true, espaciado: 3 });
  if (registro.codigoRetiro) {
    centrado(p, `Retirado en el lote ${registro.codigoRetiro}`, 538, 10, { color: GRIS });
  }

  // Trazabilidad
  izquierda(p, "TRAZABILIDAD", 72, 582, 9, { negrita: true, color: GRIS });
  pagina.drawLine({
    start: { x: 72, y: ALTO - 590 },
    end: { x: ANCHO - 72, y: ALTO - 590 },
    thickness: 0.8,
    color: GRIS_CLARO,
  });

  etapa(
    p,
    620,
    "Depósito registrado",
    `${registro.residente} · contenedor ${registro.contenedor}`,
    registro.creadoEn,
    false
  );
  etapa(
    p,
    680,
    "Validado por el administrador",
    "Confirmó la correcta deposición en el contenedor",
    registro.validadoEn,
    false
  );
  etapa(
    p,
    740,
    "Confirmado por el gestor",
    `Retiró el contenedor de ${registro.torreNombre}${
      registro.codigoRetiro ? ` (lote ${registro.codigoRetiro})` : ""
    }`,
    registro.certificadoEn,
    true
  );

  // Pie
  pagina.drawLine({
    start: { x: 72, y: 62 },
    end: { x: ANCHO - 72, y: 62 },
    thickness: 0.8,
    color: GRIS_CLARO,
  });
  centrado(
    p,
    `Emitido el ${fechaLarga(registro.certificadoEn ?? registro.creadoEn)} · EcoTrack`,
    ALTO - 46,
    8.5,
    { color: GRIS }
  );
  centrado(
    p,
    "El código identifica este certificado de forma única en el registro de EcoTrack.",
    ALTO - 34,
    8,
    { color: GRIS }
  );

  return doc.save();
}

export type ResultadoDescarga = "compartido" | "descargado" | "cancelado";

/** ¿El dispositivo es táctil (teléfono o tableta)? Ahí conviene la hoja de compartir. */
function esTactil(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Genera el PDF y lo entrega al usuario.
 *
 * En iPhone se abre la hoja de compartir con el archivo, desde donde se puede
 * "Guardar en Archivos" o enviarlo por WhatsApp o correo. En un computador se
 * descarga directamente. Debe llamarse dentro del gesto del usuario (un toque):
 * iOS rechaza compartir si pasó demasiado tiempo desde el toque.
 */
export async function descargarCertificado(registro: Registro): Promise<ResultadoDescarga> {
  const bytes = await generarCertificadoPdf(registro);
  const nombre = `EcoTrack-Certificado-${registro.codigo}.pdf`;
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });

  if (esTactil() && typeof File === "function" && navigator.canShare && navigator.share) {
    const archivo = new File([blob], nombre, { type: "application/pdf" });
    if (navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: "Certificado EcoTrack" });
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
