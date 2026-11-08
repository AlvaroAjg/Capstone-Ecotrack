import { fechaCorta, fechaLarga, formatKg } from "./formato";
import { tieneEstimados, type CertificadoMensual } from "./certificadoMensual";
import {
  ALTO,
  ALTO_FILA,
  ANCHO,
  BLANCO,
  LIMITE_INFERIOR,
  MARCA,
  MARGEN,
  anchoTexto,
  centrado,
  centradoEn,
  derecha,
  entregarPdf,
  hex,
  izquierda,
  logo,
  nuevoDocumento,
  piesDePagina,
  tamanoQueCabe,
  type Pincel,
  type ResultadoDescarga,
} from "./pdfComun";
import { colorMaterial, kgEfectivo, type Registro } from "./tipos";

/**
 * Certificado mensual de reciclaje en PDF, generado en el dispositivo (ver
 * pdfComun.ts). La primera página es un diploma para imprimir y guardar: el
 * nombre, los kilos del mes, cuánto de cada material, el código y el sello.
 * Desde la segunda viene el detalle de cada depósito con las fechas de su
 * paso por la cadena, en tantas páginas como haga falta.
 */

export const certificadoPdfDisponible = true;

function kilos(r: Registro): string {
  const kg = formatKg(kgEfectivo(r)).replace(" kg", "");
  return r.talla ? `aprox. ${kg}` : kg;
}

/** Última columna: en qué quedó el depósito. */
function situacion(r: Registro): string {
  switch (r.estado) {
    case "certificado":
      return [r.retiroId, r.codigo].filter(Boolean).join(" · ") || "Certificado";
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
    izquierda(p, titulo, x, arriba, 7, { negrita: true, color: MARCA.tintaSuave });
  }
  p.pagina.drawLine({
    start: { x: MARGEN, y: ALTO - arriba - 6 },
    end: { x: ANCHO - MARGEN, y: ALTO - arriba - 6 },
    thickness: 1.2,
    color: MARCA.vino,
  });
}

function filaTabla(p: Pincel, r: Registro, arriba: number, sombreada: boolean) {
  if (sombreada) {
    p.pagina.drawRectangle({
      x: MARGEN - 4,
      y: ALTO - arriba - 5,
      width: ANCHO - 2 * MARGEN + 8,
      height: ALTO_FILA,
      color: MARCA.piedra,
    });
  }
  // Lo que no suma al total (en proceso o rechazado) va más tenue.
  const color = r.estado === "certificado" ? MARCA.tinta : MARCA.tintaSuave;
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

/** Marco doble del diploma: uno vino y, adentro, uno más fino. */
function marco(p: Pincel) {
  p.pagina.drawRectangle({ x: 0, y: 0, width: ANCHO, height: ALTO, color: MARCA.marfil });
  // Cerca del borde de la hoja, para que el pie de página quede adentro.
  p.pagina.drawRectangle({
    x: 14,
    y: 14,
    width: ANCHO - 28,
    height: ALTO - 28,
    borderColor: MARCA.vino,
    borderWidth: 1.5,
  });
  p.pagina.drawRectangle({
    x: 19,
    y: 19,
    width: ANCHO - 38,
    height: ALTO - 38,
    borderColor: MARCA.vinoSuave,
    borderWidth: 0.6,
  });
}

/** Sello "Verificado por RecyTrack", centrado en (x, centroArriba). */
function sello(p: Pincel, x: number, centroArriba: number) {
  const y = ALTO - centroArriba;
  p.pagina.drawCircle({ x, y, size: 46, borderColor: MARCA.ambar, borderWidth: 1.4, borderDashArray: [3, 3] });
  p.pagina.drawCircle({ x, y, size: 38, color: MARCA.ambarClaro });
  p.pagina.drawSvgPath("M -7 0 L -2 5 L 8 -6", {
    x,
    y: y + 12,
    borderColor: MARCA.ambarOscuro,
    borderWidth: 2,
  });
  centradoEn(p, "VERIFICADO", x, centroArriba + 4, 7.5, { negrita: true, color: MARCA.ambarOscuro });
  centradoEn(p, "por RecyTrack", x, centroArriba + 14, 6.5, { color: MARCA.ambarOscuro });
}

export async function generarCertificadoPdf(c: CertificadoMensual): Promise<Uint8Array> {
  const { doc, normal, negrita, serif, nuevaPagina } = await nuevoDocumento({
    titulo: `Certificado RecyTrack ${c.codigo}`,
    asunto: `Certificado mensual de reciclaje, ${c.etiqueta}`,
  });
  const titulo = c.etiqueta.charAt(0).toUpperCase() + c.etiqueta.slice(1);

  // ================================================================ página 1: diploma
  const p = nuevaPagina();
  marco(p);
  logo(p, (ANCHO - 46) / 2, 62, 46, MARCA.olivaHoja);
  centrado(p, "CERTIFICADO MENSUAL DE RECICLAJE", 132, 9.5, { negrita: true, color: MARCA.ambarOscuro });
  centrado(p, titulo, 152, 17, { serif: true, color: MARCA.vino });

  centrado(p, "Se certifica que", 212, 10, { color: MARCA.tintaSuave });
  centrado(p, c.nombre, 252, tamanoQueCabe(serif, c.nombre, 440, 38, 18), { serif: true, color: MARCA.vino });
  centrado(p, c.area, 272, 10, { color: MARCA.tintaMedia });

  centrado(p, "recicló de forma verificada", 306, 10, { color: MARCA.tintaSuave });
  // El total, en grande: «aprox.» delante si hay kilos estimados por talla.
  const numero = formatKg(c.kgCertificados).replace(" kg", "");
  const prefijo = tieneEstimados(c) ? "aprox. " : "";
  const anchoPrefijo = anchoTexto(p, prefijo, 18, { serif: true });
  const anchoNumero = anchoTexto(p, numero, 64, { serif: true });
  const anchoUnidad = anchoTexto(p, " kg", 26, { serif: true });
  let x = (ANCHO - anchoPrefijo - anchoNumero - anchoUnidad) / 2;
  if (prefijo) izquierda(p, prefijo, x, 370, 18, { serif: true, color: MARCA.oliva });
  x += anchoPrefijo;
  izquierda(p, numero, x, 370, 64, { serif: true, color: MARCA.oliva });
  izquierda(p, " kg", x + anchoNumero, 370, 26, { serif: true, color: MARCA.oliva });
  centrado(
    p,
    `en ${c.certificados.length} depósito${c.certificados.length === 1 ? "" : "s"} que completaron la cadena: registrados, validados en ronda y retirados`,
    392,
    8.5,
    { color: MARCA.tintaSuave }
  );
  if (c.enCurso) {
    centrado(p, `Mes en curso: se completa con cada retiro. Estado al ${fechaLarga(Date.now())}.`, 406, 8, {
      color: MARCA.ambarOscuro,
    });
  }

  // Un medallón por material, centrados.
  const separacion = 112;
  const primero = ANCHO / 2 - ((c.porMaterial.length - 1) * separacion) / 2;
  c.porMaterial.forEach((m, i) => {
    const centro = primero + i * separacion;
    p.pagina.drawCircle({
      x: centro,
      y: ALTO - 470,
      size: 25,
      color: BLANCO,
      borderColor: hex(colorMaterial(m.material)),
      borderWidth: 1.8,
    });
    centradoEn(p, formatKg(m.kg).replace(" kg", ""), centro, 474, 13, { serif: true, color: MARCA.tinta });
    centradoEn(p, m.material, centro, 510, 8, { negrita: true, color: MARCA.tintaMedia });
    centradoEn(p, `${m.depositos} depósito${m.depositos === 1 ? "" : "s"}`, centro, 521, 7, { color: MARCA.tintaSuave });
  });

  // Código, abajo a la izquierda, y el sello a la derecha.
  izquierda(p, "CÓDIGO DEL CERTIFICADO", 66, 690, 6.5, { negrita: true, color: MARCA.tintaSuave });
  izquierda(p, c.codigo, 66, 712, 18, { serif: true, color: MARCA.vino });
  izquierda(p, "El detalle de cada depósito, con su código", 66, 728, 7, { color: MARCA.tintaSuave });
  izquierda(p, "y el de su retiro, está en la página 2.", 66, 738, 7, { color: MARCA.tintaSuave });
  sello(p, ANCHO - 66 - 46, 700);

  // ================================================================ detalle
  let hoja = nuevaPagina();
  let arriba = 0;
  const cabecera = () => {
    hoja.pagina.drawRectangle({ x: 0, y: ALTO - 40, width: ANCHO, height: 40, color: MARCA.vino });
    logo(hoja, MARGEN, 8, 24);
    izquierda(hoja, "Detalle de depósitos", MARGEN + 30, 25, 13, { serif: true, color: MARCA.vinoTexto });
    derecha(hoja, `${c.nombre} · ${titulo} · ${c.codigo}`, ANCHO - MARGEN, 25, 8, { color: MARCA.vinoSuave });
    arriba = 70;
  };
  cabecera();
  izquierda(
    hoja,
    "Fecha de cada etapa: depósito, validación en el punto limpio y retiro del contenedor.",
    MARGEN,
    arriba,
    8,
    { color: MARCA.tintaSuave }
  );
  arriba += 22;
  encabezadoTabla(hoja, arriba);
  arriba += ALTO_FILA + 4;

  c.registros.forEach((r, i) => {
    if (arriba > LIMITE_INFERIOR) {
      hoja = nuevaPagina();
      cabecera();
      encabezadoTabla(hoja, arriba);
      arriba += ALTO_FILA + 4;
    }
    filaTabla(hoja, r, arriba, i % 2 === 0);
    arriba += ALTO_FILA;
  });

  piesDePagina(
    doc,
    { normal, negrita, serif },
    `Certificado ${c.codigo}`,
    "Solo suman al total los depósitos certificados; más tenues, los que siguen en proceso o fueron rechazados. \"aprox.\": kilos estimados según la talla declarada."
  );

  return doc.save();
}

export type { ResultadoDescarga };

/** Genera el PDF y lo entrega al usuario (ver entregarPdf). */
export async function descargarCertificado(c: CertificadoMensual): Promise<ResultadoDescarga> {
  const bytes = await generarCertificadoPdf(c);
  return entregarPdf(bytes, `RecyTrack-Certificado-${c.mes}-${c.codigo}.pdf`, "Certificado RecyTrack");
}
