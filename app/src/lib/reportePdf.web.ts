import { fechaCorta, fechaLarga, formatKg } from "./formato";
import {
  ANCHO,
  ALTO,
  ALTO_FILA,
  FONDO_FILA,
  GRIS,
  GRIS_CLARO,
  LIMITE_INFERIOR,
  MARGEN,
  ROJO,
  TEXTO,
  VERDE,
  VERDE_CLARO,
  centrado,
  derecha,
  entregarPdf,
  franjaMarca,
  izquierda,
  linea,
  nuevoDocumento,
  piesDePagina,
  type Color,
  type Pincel,
  type ResultadoDescarga,
} from "./pdfComun";
import { META_HORAS_CADENA, META_PARTICIPACION, type ReporteTorre } from "./reporteTorre";

/**
 * Reporte mensual de la torre en PDF, para el administrador (ver
 * reporteTorre.ts para los cálculos y pdfComun.ts para el estilo). Una
 * primera página con el resumen y los indicadores del piloto, y después el
 * detalle por departamento y los contenedores contaminados.
 */

export const reportePdfDisponible = true;

const DERECHA = ANCHO - MARGEN;

function horas(h: number | null): string {
  if (h === null) return "sin datos";
  if (h < 1) return "menos de 1 h";
  return h < 48 ? `${h.toFixed(1).replace(".", ",")} h` : `${(h / 24).toFixed(1).replace(".", ",")} días`;
}

function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

/** Una tarjeta con un número grande y su etiqueta. */
function tarjeta(p: Pincel, x: number, arriba: number, ancho: number, valor: string, etiqueta: string, color: Color) {
  p.pagina.drawRectangle({
    x,
    y: ALTO - arriba - 58,
    width: ancho,
    height: 58,
    color: FONDO_FILA,
    borderColor: GRIS_CLARO,
    borderWidth: 1,
  });
  const centro = (texto: string, desde: number, tamano: number, negrita: boolean, c: Color) => {
    const fuente = negrita ? p.negrita : p.normal;
    const w = fuente.widthOfTextAtSize(texto, tamano);
    izquierda(p, texto, x + (ancho - w) / 2, arriba + desde, tamano, { negrita, color: c });
  };
  centro(valor, 28, 18, true, color);
  centro(etiqueta, 46, 7.5, false, GRIS);
}

function barra(p: Pincel, x: number, arriba: number, ancho: number, avance: number) {
  p.pagina.drawRectangle({ x, y: ALTO - arriba, width: ancho, height: 6, color: GRIS_CLARO });
  if (avance > 0) {
    p.pagina.drawRectangle({
      x,
      y: ALTO - arriba,
      width: (ancho * Math.min(avance, 100)) / 100,
      height: 6,
      color: VERDE,
    });
  }
}

function tituloSeccion(p: Pincel, texto: string, arriba: number) {
  izquierda(p, texto.toUpperCase(), MARGEN, arriba, 9, { negrita: true, color: GRIS });
}

export async function generarReportePdf(r: ReporteTorre): Promise<Uint8Array> {
  const titulo = r.etiqueta.charAt(0).toUpperCase() + r.etiqueta.slice(1);
  const referencia = `Reporte ${r.torre.nombre} · ${r.etiqueta}`;
  const { doc, normal, negrita, nuevaPagina } = await nuevoDocumento({
    titulo: `Reporte EcoTrack ${r.torre.nombre} ${r.mes}`,
    asunto: `Reporte mensual de reciclaje de ${r.torre.nombre}, ${r.etiqueta}`,
  });

  let p = nuevaPagina();
  let arriba = 0;

  /** Pasa a una página nueva si lo que viene no cabe. */
  const espacio = (alto: number) => {
    if (arriba + alto <= LIMITE_INFERIOR) return;
    p = nuevaPagina();
    izquierda(p, `EcoTrack · ${referencia}`, MARGEN, 50, 9, { negrita: true, color: GRIS });
    arriba = 80;
  };

  // ------------------------------------------------------------ portada
  franjaMarca(p);
  centrado(p, "REPORTE MENSUAL DE LA TORRE", 148, 16, { negrita: true });
  centrado(p, `${r.torre.nombre}${r.torre.condominio ? ` · ${r.torre.condominio}` : ""}`, 168, 12, {
    negrita: true,
    color: VERDE,
  });
  centrado(p, titulo, 186, 10, { color: GRIS });
  if (r.enCurso) {
    centrado(p, `Mes en curso: estado al ${fechaLarga(Date.now())}`, 200, 8.5, { color: GRIS });
  }

  // Cuatro números del mes
  arriba = 216;
  const separacion = 10;
  const anchoTarjeta = (ANCHO - 2 * MARGEN - 3 * separacion) / 4;
  const tarjetas: [string, string, Color][] = [
    [formatKg(r.kgCertificados), "kilos certificados", VERDE],
    [`${r.participacion}%`, `participación (${r.deptosActivos} de ${r.deptosTotales} deptos.)`, TEXTO],
    [`${r.depositos.total}`, "depósitos del mes", TEXTO],
    [`${r.contaminaciones.length}`, "contenedores contaminados", r.contaminaciones.length > 0 ? ROJO : VERDE],
  ];
  tarjetas.forEach(([valor, etiqueta, color], i) =>
    tarjeta(p, MARGEN + i * (anchoTarjeta + separacion), arriba, anchoTarjeta, valor, etiqueta, color)
  );
  arriba += 84;

  // ------------------------------------------------------------ indicadores del piloto
  tituloSeccion(p, "Indicadores del piloto", arriba);
  arriba += 18;
  const columnasIndicador = [MARGEN, 250, 400];
  ["INDICADOR", "RESULTADO", "META"].forEach((t, i) =>
    izquierda(p, t, columnasIndicador[i], arriba, 7, { negrita: true, color: GRIS })
  );
  derecha(p, "ESTADO", DERECHA, arriba, 7, { negrita: true, color: GRIS });
  linea(p, arriba + 6);
  arriba += ALTO_FILA + 4;

  const indicadores: [string, string, string, boolean | null][] = [
    [
      "Participación de departamentos",
      `${r.participacion}%`,
      `${META_PARTICIPACION}% o más`,
      r.deptosTotales > 0 ? r.participacion >= META_PARTICIPACION : null,
    ],
    [
      "Flujo completo, del depósito al certificado",
      r.horasCadena === null
        ? "sin depósitos certificados"
        : `${horas(r.horasCadena)} promedio (${r.dentroDe48h}% bajo ${META_HORAS_CADENA} h)`,
      `menos de ${META_HORAS_CADENA} h promedio`,
      r.horasCadena === null ? null : r.horasCadena < META_HORAS_CADENA,
    ],
    [
      "Meta de kilos de la torre",
      `${formatKg(r.kgCertificados)} de ${formatKg(r.metaKg)} (${r.avanceMeta}%)`,
      `${formatKg(r.metaKg)} (vigente)`,
      r.metaKg > 0 ? r.kgCertificados >= r.metaKg : null,
    ],
  ];
  indicadores.forEach(([nombre, resultado, meta, cumple], i) => {
    if (i % 2 === 0) {
      p.pagina.drawRectangle({
        x: MARGEN - 4,
        y: ALTO - arriba - 5,
        width: ANCHO - 2 * MARGEN + 8,
        height: ALTO_FILA,
        color: FONDO_FILA,
      });
    }
    izquierda(p, nombre, columnasIndicador[0], arriba, 8.5);
    izquierda(p, resultado, columnasIndicador[1], arriba, 8.5, { negrita: true });
    izquierda(p, meta, columnasIndicador[2], arriba, 8.5, { color: GRIS });
    const [estado, color] =
      cumple === null ? ["Sin datos", GRIS] : cumple ? ["Cumple", VERDE] : ["No cumple", ROJO];
    derecha(p, estado, DERECHA, arriba, 8.5, { negrita: true, color });
    arriba += ALTO_FILA;
  });
  arriba += 22;

  // ------------------------------------------------------------ por material
  tituloSeccion(p, "Kilos certificados por material", arriba);
  arriba += 18;
  if (r.porMaterial.length === 0) {
    izquierda(p, "Todavía no hay kilos certificados este mes.", MARGEN, arriba, 9, { color: GRIS });
    arriba += ALTO_FILA;
  } else {
    const maximo = Math.max(...r.porMaterial.map((m) => m.kg));
    for (const m of r.porMaterial) {
      izquierda(p, m.material, MARGEN, arriba, 9);
      izquierda(p, plural(m.depositos, "depósito", "depósitos"), 130, arriba, 8.5, { color: GRIS });
      barra(p, 220, arriba - 1, 240, maximo > 0 ? (m.kg / maximo) * 100 : 0);
      derecha(p, formatKg(m.kg), DERECHA, arriba, 9, { negrita: true });
      arriba += ALTO_FILA + 2;
    }
  }
  arriba += 18;

  // ------------------------------------------------------------ cadena
  espacio(120);
  tituloSeccion(p, "La cadena este mes", arriba);
  arriba += 18;
  const d = r.depositos;
  const filasCadena: [string, string][] = [
    [
      "Depósitos registrados",
      `${d.total}: ${plural(d.certificados, "certificado", "certificados")}, ${d.validados} esperando retiro, ${d.pendientes} por validar, ${plural(d.rechazados, "rechazado", "rechazados")}`,
    ],
    ["Retiros del gestor", plural(r.retiros, "retiro", "retiros")],
    ["Promedio hasta la validación del administrador", horas(r.horasHastaValidacion)],
    ["Promedio desde la validación hasta el retiro", horas(r.horasHastaRetiro)],
    ["Promedio de la cadena completa", horas(r.horasCadena)],
  ];
  for (const [nombre, valor] of filasCadena) {
    izquierda(p, nombre, MARGEN, arriba, 8.5, { color: GRIS });
    izquierda(p, valor, 260, arriba, 8.5, { negrita: true });
    arriba += ALTO_FILA;
  }
  arriba += 18;

  // ------------------------------------------------------------ departamentos
  espacio(60);
  tituloSeccion(p, "Departamentos que más reciclaron", arriba);
  izquierda(p, "Kilos certificados en el mes. Solo el número de departamento, sin nombres.", MARGEN, arriba + 13, 8, {
    color: GRIS,
  });
  arriba += 32;
  if (r.deptos.length === 0) {
    izquierda(p, "Ningún departamento tiene kilos certificados este mes.", MARGEN, arriba, 9, { color: GRIS });
    arriba += ALTO_FILA;
  } else {
    const encabezado = () => {
      ["#", "DEPARTAMENTO", "DEPÓSITOS"].forEach((t, i) =>
        izquierda(p, t, [MARGEN, 70, 250][i], arriba, 7, { negrita: true, color: GRIS })
      );
      derecha(p, "KILOS", DERECHA, arriba, 7, { negrita: true, color: GRIS });
      linea(p, arriba + 6);
      arriba += ALTO_FILA + 4;
    };
    encabezado();
    r.deptos.forEach((fila, i) => {
      if (arriba + ALTO_FILA > LIMITE_INFERIOR) {
        espacio(ALTO_FILA * 2);
        encabezado();
      }
      if (i % 2 === 0) {
        p.pagina.drawRectangle({
          x: MARGEN - 4,
          y: ALTO - arriba - 5,
          width: ANCHO - 2 * MARGEN + 8,
          height: ALTO_FILA,
          color: FONDO_FILA,
        });
      }
      izquierda(p, `${i + 1}`, MARGEN, arriba, 8.5, { color: GRIS });
      izquierda(p, fila.depto, 70, arriba, 8.5);
      izquierda(p, `${fila.depositos}`, 250, arriba, 8.5, { color: GRIS });
      derecha(p, formatKg(fila.kg), DERECHA, arriba, 8.5, { negrita: true });
      arriba += ALTO_FILA;
    });
  }
  arriba += 18;

  // ------------------------------------------------------------ contaminación
  espacio(60);
  tituloSeccion(p, "Contenedores contaminados", arriba);
  arriba += 18;
  if (r.contaminaciones.length === 0) {
    p.pagina.drawRectangle({
      x: MARGEN,
      y: ALTO - arriba - 8,
      width: ANCHO - 2 * MARGEN,
      height: 24,
      color: VERDE_CLARO,
    });
    izquierda(p, "Ningún contenedor contaminado este mes: la torre está separando bien.", MARGEN + 10, arriba + 6, 9, {
      negrita: true,
      color: VERDE,
    });
    arriba += 30;
  } else {
    for (const i of r.contaminaciones) {
      espacio(ALTO_FILA * 2);
      izquierda(p, fechaCorta(i.reportadoEn), MARGEN, arriba, 8.5, { color: GRIS });
      izquierda(p, `${i.contaminante} en el ${i.contenedorNombre.toLowerCase()}`, 120, arriba, 8.5, {
        negrita: true,
        color: ROJO,
      });
      derecha(p, i.atendida ? `Retirado${i.codigoRetiro ? ` (${i.codigoRetiro})` : ""}` : "Por retirar", DERECHA, arriba, 8.5, {
        color: GRIS,
      });
      arriba += ALTO_FILA;
    }
  }

  piesDePagina(
    doc,
    { normal, negrita },
    referencia,
    "Kilos: los certificados en el mes, estimados según la talla declarada. Participación y depósitos: según la fecha del depósito. Tiempos: sobre los certificados en el mes."
  );

  return doc.save();
}

/** Genera el reporte y lo entrega al usuario (ver entregarPdf). */
export async function descargarReporte(r: ReporteTorre): Promise<ResultadoDescarga> {
  const bytes = await generarReportePdf(r);
  const nombre = `EcoTrack-Reporte-${r.torre.nombre.replace(/\s+/g, "")}-${r.mes}.pdf`;
  return entregarPdf(bytes, nombre, `Reporte EcoTrack ${r.torre.nombre}`);
}
