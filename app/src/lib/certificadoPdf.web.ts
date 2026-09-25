import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fechaCorta, fechaLarga, formatKg } from "./formato";
import { tieneEstimados, type CertificadoMensual } from "./certificadoMensual";
import { kgEfectivo, type Registro } from "./tipos";

/**
 * Certificado mensual de reciclaje en PDF, generado en el dispositivo.
 *
 * Se arma con pdf-lib y no con window.print(): imprimir HTML no es confiable en
 * una PWA de iPhone, y así el archivo es idéntico en cualquier dispositivo.
 * La primera página resume el mes; después viene el detalle de cada depósito
 * con las fechas de su paso por la cadena, en tantas páginas como haga falta.
 */

export const certificadoPdfDisponible = true;

const ANCHO = 595; // A4 en puntos
const ALTO = 842;
const MARGEN = 40;
/** Donde termina el área útil: debajo va el pie de página. */
const LIMITE_INFERIOR = ALTO - 80;
const ALTO_FILA = 17;

const VERDE = rgb(0.086, 0.502, 0.238); // #15803D
const VERDE_OSCURO = rgb(0.078, 0.325, 0.176);
const VERDE_CLARO = rgb(0.86, 0.95, 0.89);
const GRIS = rgb(0.42, 0.45, 0.5);
const GRIS_SUAVE = rgb(0.62, 0.64, 0.68);
const GRIS_CLARO = rgb(0.9, 0.91, 0.93);
const FONDO_FILA = rgb(0.97, 0.98, 0.98);
const TEXTO = rgb(0.07, 0.09, 0.15);

/**
 * Las fuentes estándar del PDF solo codifican Latin-1: tildes y eñes sí, pero un
 * emoji o una letra fuera de ese rango haría fallar la generación. Se normalizan
 * los espacios especiales que produce toLocaleString y se reemplaza lo demás.
 */
function seguro(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[\s  ]+/g, " ")
    .replace(/[^\x20-\x7E¡-ÿ]/g, "?");
}

interface Pincel {
  pagina: PDFPage;
  normal: PDFFont;
  negrita: PDFFont;
}

type Color = ReturnType<typeof rgb>;

/** Texto centrado horizontalmente. `arriba` se mide desde el borde superior. */
function centrado(
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

function izquierda(
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

function linea(p: Pincel, arriba: number) {
  p.pagina.drawLine({
    start: { x: MARGEN, y: ALTO - arriba },
    end: { x: ANCHO - MARGEN, y: ALTO - arriba },
    thickness: 0.8,
    color: GRIS_CLARO,
  });
}

function kilos(r: Registro): string {
  const kg = formatKg(kgEfectivo(r)).replace(" kg", "");
  return r.talla ? `aprox. ${kg}` : kg;
}

/** Última columna: en qué quedó el depósito. */
function situacion(r: Registro): string {
  switch (r.estado) {
    case "certificado":
      return [r.codigoRetiro, r.codigo].filter(Boolean).join(" · ") || "Certificado";
    case "validado":
      return "En proceso: esperando retiro";
    case "pendiente":
      return "En proceso: esperando validación";
    case "rechazado":
      return "Rechazado: no suma";
  }
}

/** Columnas de la tabla de detalle: [título, x]. */
const COLUMNAS: [string, number][] = [
  ["DEPÓSITO", MARGEN],
  ["MATERIAL", 110],
  ["TALLA", 184],
  ["KG", 226],
  ["VALIDADO", 280],
  ["CERTIFICADO", 344],
  ["RETIRO · CÓDIGO", 416],
];

function encabezadoTabla(p: Pincel, arriba: number) {
  for (const [titulo, x] of COLUMNAS) {
    izquierda(p, titulo, x, arriba, 7, { negrita: true, color: GRIS });
  }
  linea(p, arriba + 6);
}

function filaTabla(p: Pincel, r: Registro, arriba: number, sombreada: boolean) {
  if (sombreada) {
    p.pagina.drawRectangle({
      x: MARGEN - 4,
      y: ALTO - arriba - 5,
      width: ANCHO - 2 * MARGEN + 8,
      height: ALTO_FILA,
      color: FONDO_FILA,
    });
  }
  // Lo que no suma al total (en proceso o rechazado) va en gris.
  const color = r.estado === "certificado" ? TEXTO : GRIS_SUAVE;
  const celdas = [
    fechaCorta(r.creadoEn),
    r.material,
    r.talla ? `Talla ${r.talla}` : "-",
    kilos(r),
    fechaCorta(r.validadoEn),
    fechaCorta(r.certificadoEn),
    situacion(r),
  ];
  celdas.forEach((texto, i) => {
    izquierda(p, texto, COLUMNAS[i][1], arriba, i === 6 ? 7 : 8, { color });
  });
}

export async function generarCertificadoPdf(c: CertificadoMensual): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado EcoTrack ${c.codigo}`);
  doc.setAuthor("EcoTrack");
  doc.setSubject(`Certificado mensual de reciclaje, ${c.etiqueta}`);

  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const nuevaPagina = (): Pincel => ({ pagina: doc.addPage([ANCHO, ALTO]), normal, negrita });

  // ------------------------------------------------------------ página 1
  let p = nuevaPagina();
  const titulo = c.etiqueta.charAt(0).toUpperCase() + c.etiqueta.slice(1);

  p.pagina.drawRectangle({ x: 0, y: ALTO - 110, width: ANCHO, height: 110, color: VERDE });
  p.pagina.drawRectangle({ x: 0, y: ALTO - 110, width: ANCHO, height: 5, color: VERDE_OSCURO });
  centrado(p, "EcoTrack", 58, 28, { negrita: true, color: rgb(1, 1, 1) });
  centrado(p, "Reciclaje verificado, desde tu torre hacia arriba", 80, 10, { color: VERDE_CLARO });

  centrado(p, "CERTIFICADO MENSUAL DE RECICLAJE", 148, 16, { negrita: true });
  centrado(p, titulo, 168, 12, { negrita: true, color: VERDE });

  centrado(p, "Se certifica que", 202, 10, { color: GRIS });
  centrado(p, c.residente, 226, 20, { negrita: true });
  centrado(p, `${c.torreNombre} · ${c.depto}`, 244, 10, { color: GRIS });

  centrado(p, "recicló de forma verificada", 274, 10, { color: GRIS });
  const total = formatKg(c.kgCertificados);
  centrado(p, tieneEstimados(c) ? `aprox. ${total}` : total, 310, 32, {
    negrita: true,
    color: VERDE,
  });
  centrado(
    p,
    `en ${c.certificados.length} depósito${c.certificados.length === 1 ? "" : "s"} que completaron la cadena de verificación`,
    328,
    10,
    { color: GRIS }
  );
  centrado(
    p,
    c.porMaterial
      .map((m) => `${m.material}: ${formatKg(m.kg)} (${m.depositos})`)
      .join("   ·   "),
    348,
    9,
    { negrita: true }
  );

  // Código del certificado
  const cajaAncho = 260;
  p.pagina.drawRectangle({
    x: (ANCHO - cajaAncho) / 2,
    y: ALTO - 418,
    width: cajaAncho,
    height: 50,
    color: FONDO_FILA,
    borderColor: GRIS_CLARO,
    borderWidth: 1,
  });
  centrado(p, "CÓDIGO DEL CERTIFICADO", 385, 8, { color: GRIS });
  centrado(p, c.codigo, 406, 18, { negrita: true });

  if (c.enCurso) {
    centrado(
      p,
      `Mes en curso: este certificado se completa con cada retiro. Estado al ${fechaLarga(Date.now())}`,
      436,
      8.5,
      { color: GRIS }
    );
  }

  // ------------------------------------------------------------ detalle
  let arriba = 470;
  izquierda(p, "DETALLE DE DEPÓSITOS DEL MES", MARGEN, arriba, 9, { negrita: true, color: GRIS });
  izquierda(
    p,
    "Fecha de cada etapa: depósito, validación del administrador y retiro del gestor.",
    MARGEN,
    arriba + 13,
    8,
    { color: GRIS }
  );
  arriba += 34;
  encabezadoTabla(p, arriba);
  arriba += ALTO_FILA + 4;

  c.registros.forEach((r, i) => {
    if (arriba > LIMITE_INFERIOR) {
      p = nuevaPagina();
      izquierda(p, `EcoTrack · Certificado mensual · ${titulo} · ${c.codigo}`, MARGEN, 50, 9, {
        negrita: true,
        color: GRIS,
      });
      izquierda(p, `${c.residente} · ${c.torreNombre} · ${c.depto}`, MARGEN, 63, 8.5, {
        color: GRIS,
      });
      arriba = 92;
      encabezadoTabla(p, arriba);
      arriba += ALTO_FILA + 4;
    }
    filaTabla(p, r, arriba, i % 2 === 0);
    arriba += ALTO_FILA;
  });

  // ------------------------------------------------------------ pie de cada página
  const paginas = doc.getPages();
  paginas.forEach((pagina, i) => {
    const pie: Pincel = { pagina, normal, negrita };
    pagina.drawLine({
      start: { x: MARGEN, y: 58 },
      end: { x: ANCHO - MARGEN, y: 58 },
      thickness: 0.8,
      color: GRIS_CLARO,
    });
    centrado(
      pie,
      `Emitido el ${fechaLarga(Date.now())} · Certificado ${c.codigo} · Página ${i + 1} de ${paginas.length}`,
      ALTO - 44,
      8,
      { color: GRIS }
    );
    centrado(
      pie,
      "Solo suman al total los depósitos certificados; en gris, los que siguen en proceso o fueron rechazados. \"aprox.\": kilos estimados según la talla declarada.",
      ALTO - 32,
      6.5,
      { color: GRIS }
    );
  });

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
export async function descargarCertificado(c: CertificadoMensual): Promise<ResultadoDescarga> {
  const bytes = await generarCertificadoPdf(c);
  const nombre = `EcoTrack-Certificado-${c.mes}-${c.codigo}.pdf`;
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
