import { fechaCorta, fechaLarga, formatKg } from "./formato";
import { tieneEstimados, type CertificadoMensual } from "./certificadoMensual";
import {
  ALTO,
  ALTO_FILA,
  ANCHO,
  FONDO_FILA,
  GRIS,
  GRIS_CLARO,
  GRIS_SUAVE,
  LIMITE_INFERIOR,
  MARGEN,
  TEXTO,
  VERDE,
  centrado,
  entregarPdf,
  franjaMarca,
  izquierda,
  linea,
  nuevoDocumento,
  piesDePagina,
  type Pincel,
  type ResultadoDescarga,
} from "./pdfComun";
import { kgEfectivo, type Registro } from "./tipos";

/**
 * Certificado mensual de reciclaje en PDF, generado en el dispositivo (ver
 * pdfComun.ts). La primera página resume el mes; después viene el detalle de
 * cada depósito con las fechas de su paso por la cadena, en tantas páginas
 * como haga falta.
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
  const { doc, normal, negrita, nuevaPagina } = await nuevoDocumento({
    titulo: `Certificado RecyTrack ${c.codigo}`,
    asunto: `Certificado mensual de reciclaje, ${c.etiqueta}`,
  });

  // ------------------------------------------------------------ página 1
  let p = nuevaPagina();
  const titulo = c.etiqueta.charAt(0).toUpperCase() + c.etiqueta.slice(1);

  franjaMarca(p);

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
      izquierda(p, `RecyTrack · Certificado mensual · ${titulo} · ${c.codigo}`, MARGEN, 50, 9, {
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

  piesDePagina(
    doc,
    { normal, negrita },
    `Certificado ${c.codigo}`,
    "Solo suman al total los depósitos certificados; en gris, los que siguen en proceso o fueron rechazados. \"aprox.\": kilos estimados según la talla declarada."
  );

  return doc.save();
}

export type { ResultadoDescarga };

/** Genera el PDF y lo entrega al usuario (ver entregarPdf). */
export async function descargarCertificado(c: CertificadoMensual): Promise<ResultadoDescarga> {
  const bytes = await generarCertificadoPdf(c);
  return entregarPdf(bytes, `RecyTrack-Certificado-${c.mes}-${c.codigo}.pdf`, "Certificado RecyTrack");
}
