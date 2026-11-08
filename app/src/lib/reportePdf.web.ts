import { fechaCorta, fechaLarga, formatKg, porcentaje } from "./formato";
import {
  ANCHO,
  ALTO,
  ALTO_FILA,
  BLANCO,
  LIMITE_INFERIOR,
  MARCA,
  MARGEN,
  anillo,
  caja,
  centradoEn,
  derecha,
  entregarPdf,
  hex,
  izquierda,
  logo,
  marcaMeta,
  nuevoDocumento,
  piesDePagina,
  seguro,
  type Color,
  type Pincel,
  type ResultadoDescarga,
} from "./pdfComun";
import { META_HORAS_CADENA, META_PARTICIPACION, META_RONDAS, type ReportePlanta } from "./reportePlanta";
import { colorMaterial } from "./tipos";

/**
 * Reporte mensual de la planta en PDF, para el administrador (ver
 * reportePlanta.ts para los cálculos y pdfComun.ts para el estilo). La primera
 * página es un tablero que se lee de un vistazo: indicadores, participación,
 * depósitos por semana, áreas, materiales y la cadena. La segunda trae el
 * detalle: todas las áreas, los retiros y los contenedores contaminados.
 */

export const reportePdfDisponible = true;

const DERECHA = ANCHO - MARGEN;
const ANCHO_UTIL = ANCHO - 2 * MARGEN;

function horas(h: number | null): string {
  if (h === null) return "sin datos";
  if (h < 1) return "menos de 1 h";
  return h < 48 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1).replace(".", ",")} días`;
}

function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

/** Recorta `texto` para que quepa en `ancho` con esa fuente y tamaño. */
function recortar(p: Pincel, texto: string, ancho: number, tamano: number): string {
  let limpio = seguro(texto);
  if (p.normal.widthOfTextAtSize(limpio, tamano) <= ancho) return limpio;
  while (limpio.length > 1 && p.normal.widthOfTextAtSize(`${limpio}...`, tamano) > ancho) limpio = limpio.slice(0, -1);
  return `${limpio}...`;
}

/** Barra horizontal: el riel claro y, encima, el avance. */
function barra(p: Pincel, x: number, arriba: number, ancho: number, alto: number, avance: number, color: Color) {
  caja(p, x, arriba, ancho, alto, { relleno: MARCA.piedraLinea, radio: alto / 2 });
  const largo = (ancho * Math.max(0, Math.min(avance, 100))) / 100;
  if (largo >= alto) caja(p, x, arriba, largo, alto, { relleno: color, radio: alto / 2 });
}

/** Título de un bloque del tablero. */
function tituloBloque(p: Pincel, texto: string, x: number, arriba: number, color: Color = MARCA.tinta) {
  izquierda(p, texto, x, arriba, 8.5, { negrita: true, color });
}

/** Título de una sección de la página de detalle. */
function tituloSeccion(p: Pincel, texto: string, arriba: number) {
  izquierda(p, texto, MARGEN, arriba, 15, { serif: true, color: MARCA.vino });
}

export async function generarReportePdf(r: ReportePlanta): Promise<Uint8Array> {
  const titulo = r.etiqueta.charAt(0).toUpperCase() + r.etiqueta.slice(1);
  const referencia = `Reporte ${r.planta.nombre} · ${r.etiqueta}`;
  const { doc, normal, negrita, serif, nuevaPagina } = await nuevoDocumento({
    titulo: `Reporte RecyTrack ${r.planta.nombre} ${r.mes}`,
    asunto: `Reporte mensual de reciclaje de ${r.planta.nombre}, ${r.etiqueta}`,
  });
  const ind = r.indicadores;
  const pctRondas = porcentaje(ind.rondas, ind.diasHabiles);

  // ================================================================ página 1
  const p = nuevaPagina();

  // ------------------------------------------------------------ encabezado
  p.pagina.drawRectangle({ x: 0, y: ALTO - 64, width: ANCHO, height: 64, color: MARCA.vino });
  logo(p, MARGEN, 14, 34);
  izquierda(p, "RecyTrack", MARGEN + 42, 34, 19, { serif: true, color: MARCA.vinoTexto });
  izquierda(p, "Reporte mensual de reciclaje", MARGEN + 42, 47, 8, { color: MARCA.vinoSuave });
  derecha(p, titulo, DERECHA, 34, 19, { serif: true, color: MARCA.vinoTexto });
  derecha(
    p,
    `${r.planta.nombre} · ${r.enCurso ? `estado al ${fechaLarga(Date.now())}` : "mes cerrado"}`,
    DERECHA,
    47,
    8,
    { color: MARCA.vinoSuave }
  );

  // ------------------------------------------------------------ indicadores
  const separacion = 8;
  const anchoKpi = (ANCHO_UTIL - 3 * separacion) / 4;
  const colorMeta = (cumple: boolean) => (cumple ? MARCA.oliva : MARCA.ambarOscuro);
  const kpis: { etiqueta: string; valor: string; detalle: string; avance: number | null; color: Color }[] = [
    {
      etiqueta: "PARTICIPACIÓN",
      valor: `${r.participacion}%`,
      detalle: `${r.participantes} de ${r.dotacion} · meta ${META_PARTICIPACION}%`,
      avance: (r.participacion / META_PARTICIPACION) * 100,
      color: colorMeta(r.dotacion > 0 && r.participacion >= META_PARTICIPACION),
    },
    {
      etiqueta: "DEPÓSITOS VALIDADOS",
      valor: `${ind.validados}`,
      detalle: "Con QR y confirmados en ronda",
      avance: null,
      color: MARCA.oliva,
    },
    {
      etiqueta: "MASA ESTIMADA",
      valor: formatKg(ind.kgEstimados),
      detalle: `${formatKg(r.kgCertificados)} certificados`,
      avance: ind.kgEstimados > 0 ? (r.kgCertificados / ind.kgEstimados) * 100 : 0,
      color: MARCA.oliva,
    },
    {
      etiqueta: "RONDAS COMPLETADAS",
      valor: `${pctRondas}%`,
      detalle: `${ind.rondas} de ${ind.diasHabiles} días · meta ${META_RONDAS}%`,
      avance: pctRondas,
      color: colorMeta(ind.diasHabiles > 0 && pctRondas >= META_RONDAS),
    },
  ];
  kpis.forEach((k, i) => {
    const x = MARGEN + i * (anchoKpi + separacion);
    caja(p, x, 80, anchoKpi, 70, { borde: MARCA.piedraBorde, radio: 8 });
    izquierda(p, k.etiqueta, x + 10, 94, 6.5, { negrita: true, color: MARCA.tintaSuave });
    izquierda(p, k.valor, x + 10, 118, 22, { serif: true, color: k.color });
    izquierda(p, k.detalle, x + 10, 131, 7, { color: MARCA.tintaMedia });
    if (k.avance !== null) barra(p, x + 10, 138, anchoKpi - 20, 4, k.avance, k.color);
  });

  // ------------------------------------------------------------ participación y semanas
  const arribaFila2 = 162;
  caja(p, MARGEN, arribaFila2, 150, 140, { relleno: MARCA.piedra, radio: 10 });
  tituloBloque(p, "Participación de la planta", MARGEN + 10, arribaFila2 + 16);
  const colorPart = colorMeta(r.dotacion > 0 && r.participacion >= META_PARTICIPACION);
  anillo(p, MARGEN + 75, arribaFila2 + 66, 34, 10, r.participacion, colorPart, MARCA.piedraControl);
  centradoEn(p, `${r.participacion}%`, MARGEN + 75, arribaFila2 + 70, 19, { serif: true, color: colorPart });
  centradoEn(p, `meta ${META_PARTICIPACION}%`, MARGEN + 75, arribaFila2 + 80, 6.5, { color: MARCA.tintaMedia });
  const meta = Math.ceil((META_PARTICIPACION * r.dotacion) / 100);
  const faltan = Math.max(0, meta - r.participantes);
  centradoEn(p, `${r.participantes} de ${r.dotacion} personas`, MARGEN + 75, arribaFila2 + 120, 7.5, {
    color: MARCA.tintaMedia,
  });
  centradoEn(
    p,
    r.dotacion === 0 ? "Sin áreas" : faltan > 0 ? `Faltan ${faltan} para la meta` : "Llegó a la meta",
    MARGEN + 75,
    arribaFila2 + 130,
    7.5,
    { negrita: true, color: colorPart }
  );

  const xSem = MARGEN + 160;
  const anchoSem = ANCHO_UTIL - 160;
  caja(p, xSem, arribaFila2, anchoSem, 140, { borde: MARCA.piedraBorde, radio: 10 });
  tituloBloque(p, "Depósitos validados por semana", xSem + 12, arribaFila2 + 16);
  derecha(p, `${ind.validados} en el mes`, xSem + anchoSem - 12, arribaFila2 + 16, 7, { color: MARCA.tintaSuave });
  const base = arribaFila2 + 108;
  const maximo = Math.max(1, ...r.semanas.map((s) => s.validados));
  const hueco = (anchoSem - 24) / Math.max(1, r.semanas.length);
  p.pagina.drawLine({
    start: { x: xSem + 12, y: ALTO - base },
    end: { x: xSem + anchoSem - 12, y: ALTO - base },
    thickness: 0.8,
    color: MARCA.piedraControl,
  });
  r.semanas.forEach((s, i) => {
    const centro = xSem + 12 + hueco * (i + 0.5);
    const alto = s.futura ? 0 : Math.max(2, Math.round((s.validados / maximo) * 62));
    if (!s.futura) {
      const ancho = Math.min(36, hueco * 0.6);
      caja(p, centro - ancho / 2, base - alto, ancho, alto + 3, {
        relleno: s.enCurso ? MARCA.olivaMedio : MARCA.oliva,
        radio: 3,
      });
      // Las esquinas de abajo quedan bajo la línea base: se tapan con el fondo blanco.
      p.pagina.drawRectangle({ x: centro - ancho / 2, y: ALTO - base - 3, width: ancho, height: 3, color: BLANCO });
      centradoEn(p, `${s.validados}`, centro, base - alto - 4, 10, { serif: true, color: MARCA.tinta });
    }
    centradoEn(p, s.etiqueta, centro, base + 11, 6.5, { color: s.futura ? MARCA.tintaSuave : MARCA.tintaMedia });
    if (s.enCurso) centradoEn(p, "en curso", centro, base + 20, 6, { color: MARCA.tintaSuave });
  });

  // ------------------------------------------------------------ áreas y materiales
  const arribaFila3 = 314;
  const anchoAreas = 285;
  caja(p, MARGEN, arribaFila3, anchoAreas, 176, { borde: MARCA.piedraBorde, radio: 10 });
  tituloBloque(p, "Participación por área", MARGEN + 12, arribaFila3 + 16);
  marcaMeta(p, MARGEN + anchoAreas - 70, arribaFila3 + 9, 8, MARCA.ambar);
  izquierda(p, `meta ${META_PARTICIPACION}%`, MARGEN + anchoAreas - 64, arribaFila3 + 16, 6.5, {
    color: MARCA.tintaSuave,
  });
  const MAX_AREAS = 8;
  const xRiel = MARGEN + 12 + 98;
  const anchoRiel = anchoAreas - 12 - 98 - 46;
  if (r.areas.length === 0) {
    izquierda(p, "La planta todavía no tiene áreas.", MARGEN + 12, arribaFila3 + 36, 8, { color: MARCA.tintaSuave });
  }
  r.areas.slice(0, MAX_AREAS).forEach((a, i) => {
    const arriba = arribaFila3 + 36 + i * 16;
    const cumple = a.participacion >= META_PARTICIPACION;
    izquierda(p, recortar(p, a.area, 94, 7.5), MARGEN + 12, arriba, 7.5, { color: MARCA.tinta });
    barra(p, xRiel, arriba - 6, anchoRiel, 6, a.participacion, cumple ? MARCA.oliva : MARCA.olivaMedio);
    marcaMeta(p, xRiel + (anchoRiel * META_PARTICIPACION) / 100, arriba - 9, 12, MARCA.ambar);
    derecha(p, `${a.participacion}%`, MARGEN + anchoAreas - 12, arriba, 7.5, { negrita: true });
  });
  if (r.areas.length > MAX_AREAS) {
    izquierda(
      p,
      `y ${plural(r.areas.length - MAX_AREAS, "área más", "áreas más")}: todas en la página 2.`,
      MARGEN + 12,
      arribaFila3 + 36 + MAX_AREAS * 16,
      7,
      { color: MARCA.tintaSuave }
    );
  }

  const xMat = MARGEN + anchoAreas + 10;
  const anchoMat = ANCHO_UTIL - anchoAreas - 10;
  caja(p, xMat, arribaFila3, anchoMat, 176, { borde: MARCA.piedraBorde, radio: 10 });
  tituloBloque(p, "Kilos por material", xMat + 12, arribaFila3 + 16);
  derecha(p, `${formatKg(ind.kgEstimados)} estimados`, xMat + anchoMat - 12, arribaFila3 + 16, 7, {
    color: MARCA.tintaSuave,
  });
  if (r.materialesEstimados.length === 0) {
    izquierda(p, "Todavía no hay depósitos validados.", xMat + 12, arribaFila3 + 36, 8, { color: MARCA.tintaSuave });
  } else {
    let x = xMat + 12;
    const anchoBarra = anchoMat - 24;
    r.materialesEstimados.forEach((m) => {
      const ancho = (anchoBarra * m.porcentaje) / 100;
      if (ancho > 0) p.pagina.drawRectangle({ x, y: ALTO - arribaFila3 - 40, width: ancho, height: 12, color: hex(colorMaterial(m.material)) });
      x += ancho;
    });
    r.materialesEstimados.forEach((m, i) => {
      const arriba = arribaFila3 + 60 + i * 17;
      caja(p, xMat + 12, arriba - 7, 8, 8, { relleno: hex(colorMaterial(m.material)), radio: 2 });
      izquierda(p, m.material, xMat + 26, arriba, 8, { color: MARCA.tintaMedia });
      derecha(p, `${m.porcentaje}%`, xMat + anchoMat - 12, arriba, 7, { color: MARCA.tintaSuave });
      derecha(p, formatKg(m.kg), xMat + anchoMat - 40, arriba, 8, { negrita: true });
    });
  }
  const verificados = r.listaRetiros.filter((x) => x.verificado).length;
  izquierda(
    p,
    `${formatKg(r.kgCertificados)} certificados en ${plural(r.retiros, "retiro", "retiros")}`,
    xMat + 12,
    arribaFila3 + 154,
    7,
    { color: MARCA.tintaSuave }
  );
  izquierda(p, `${plural(verificados, "retiro", "retiros")} con peso informado`, xMat + 12, arribaFila3 + 164, 7, {
    color: MARCA.tintaSuave,
  });

  // ------------------------------------------------------------ la cadena
  const arribaCadena = 502;
  caja(p, MARGEN, arribaCadena, ANCHO_UTIL, 76, { relleno: MARCA.vino, radio: 10 });
  tituloBloque(p, "La cadena de verificación", MARGEN + 14, arribaCadena + 17, MARCA.vinoTexto);
  derecha(
    p,
    r.dentroDe48h === null
      ? "Sin depósitos certificados este mes"
      : `${r.dentroDe48h}% se certificó en menos de ${META_HORAS_CADENA} h`,
    DERECHA - 14,
    arribaCadena + 17,
    7,
    { color: MARCA.vinoNav }
  );
  const cumpleCadena = r.horasCadena !== null && r.horasCadena < META_HORAS_CADENA;
  const pasos: { valor: string; texto: string; tamano: number; color: Color }[] = [
    { valor: "Depósito", texto: "la persona escanea el QR", tamano: 13, color: MARCA.vinoTexto },
    { valor: horas(r.horasHastaValidacion), texto: "hasta la ronda", tamano: 17, color: MARCA.ambarVivo },
    { valor: "Validación", texto: "el validador revisa el lote", tamano: 13, color: MARCA.vinoTexto },
    { valor: horas(r.horasHastaRetiro), texto: "hasta el retiro", tamano: 17, color: MARCA.ambarVivo },
    {
      valor: horas(r.horasCadena),
      texto: `total · meta menos de ${META_HORAS_CADENA} h`,
      tamano: 19,
      color: cumpleCadena ? MARCA.olivaHoja : MARCA.ambarVivo,
    },
  ];
  const anchoPaso = (ANCHO_UTIL - 28) / pasos.length;
  pasos.forEach((paso, i) => {
    const centro = MARGEN + 14 + anchoPaso * (i + 0.5);
    centradoEn(p, paso.valor, centro, arribaCadena + 50, paso.tamano, { serif: true, color: paso.color });
    centradoEn(p, paso.texto, centro, arribaCadena + 63, 6.5, { color: MARCA.vinoNav });
    if (i > 0) {
      p.pagina.drawLine({
        start: { x: centro - anchoPaso / 2, y: ALTO - arribaCadena - 34 },
        end: { x: centro - anchoPaso / 2, y: ALTO - arribaCadena - 66 },
        thickness: 0.6,
        color: MARCA.vinoSuave,
      });
    }
  });

  // ------------------------------------------------------------ retiros y separación
  const arribaPie = 590;
  const anchoPie = (ANCHO_UTIL - 2 * separacion) / 3;
  const kgRetiros = r.listaRetiros.reduce((t, x) => t + x.kg, 0);
  const porRetirar = r.contaminaciones.filter((i) => !i.atendida).length;
  const resumenes: { titulo: string; valor: string; detalle: string; color: Color }[] = [
    {
      titulo: "Retiros del mes",
      valor: `${r.listaRetiros.length}`,
      detalle: `${formatKg(kgRetiros)} · ${verificados} con peso informado`,
      color: MARCA.tinta,
    },
    {
      titulo: "Contenedores contaminados",
      valor: `${r.contaminaciones.length}`,
      detalle: r.contaminaciones.length === 0 ? "La planta está separando bien" : `${porRetirar} por retirar`,
      color: r.contaminaciones.length > 0 ? MARCA.ambarOscuro : MARCA.oliva,
    },
    {
      titulo: "Depósitos rechazados",
      valor: `${r.depositos.rechazados}`,
      detalle: `de ${r.depositos.total} registrados en el mes`,
      color: r.depositos.rechazados > 0 ? MARCA.rojizo : MARCA.tinta,
    },
  ];
  resumenes.forEach((res, i) => {
    const x = MARGEN + i * (anchoPie + separacion);
    caja(p, x, arribaPie, anchoPie, 56, { relleno: MARCA.piedra, radio: 8 });
    izquierda(p, res.titulo, x + 10, arribaPie + 15, 7.5, { negrita: true, color: MARCA.tintaMedia });
    izquierda(p, res.valor, x + 10, arribaPie + 37, 20, { serif: true, color: res.color });
    izquierda(p, res.detalle, x + 10, arribaPie + 48, 6.5, { color: MARCA.tintaSuave });
  });
  izquierda(
    p,
    "El detalle de todas las áreas, los retiros y los contenedores contaminados sigue en la página 2.",
    MARGEN,
    arribaPie + 74,
    7.5,
    { color: MARCA.tintaSuave }
  );

  // ================================================================ página 2: detalle
  let hoja = nuevaPagina();
  let arriba = 0;
  const cabecera = () => {
    hoja.pagina.drawRectangle({ x: 0, y: ALTO - 40, width: ANCHO, height: 40, color: MARCA.vino });
    logo(hoja, MARGEN, 8, 24);
    izquierda(hoja, "Detalle del mes", MARGEN + 30, 25, 13, { serif: true, color: MARCA.vinoTexto });
    derecha(hoja, `${r.planta.nombre} · ${titulo}`, DERECHA, 25, 8, { color: MARCA.vinoSuave });
    arriba = 70;
  };
  cabecera();
  /** Pasa a una página nueva si lo que viene no cabe. */
  const espacio = (alto: number) => {
    if (arriba + alto <= LIMITE_INFERIOR) return;
    hoja = nuevaPagina();
    cabecera();
  };
  const encabezadoTabla = (columnas: [string, number][], ultima: string) => {
    columnas.forEach(([t, x]) => izquierda(hoja, t, x, arriba, 7, { negrita: true, color: MARCA.tintaSuave }));
    derecha(hoja, ultima, DERECHA, arriba, 7, { negrita: true, color: MARCA.tintaSuave });
    hoja.pagina.drawLine({
      start: { x: MARGEN, y: ALTO - arriba - 6 },
      end: { x: DERECHA, y: ALTO - arriba - 6 },
      thickness: 1.2,
      color: MARCA.vino,
    });
    arriba += ALTO_FILA + 4;
  };
  const fondoFila = (i: number) => {
    if (i % 2 === 0) {
      hoja.pagina.drawRectangle({
        x: MARGEN - 4,
        y: ALTO - arriba - 5,
        width: ANCHO_UTIL + 8,
        height: ALTO_FILA,
        color: MARCA.piedra,
      });
    }
  };

  // ------------------------------------------------------------ áreas
  tituloSeccion(hoja, "Participación por área", arriba);
  izquierda(
    hoja,
    "Personas del área que reciclaron en el mes, sobre su dotación. Solo totales por área, sin nombres.",
    MARGEN,
    arriba + 13,
    8,
    { color: MARCA.tintaSuave }
  );
  arriba += 32;
  const columnasAreas: [string, number][] = [
    ["#", MARGEN],
    ["ÁREA", 70],
    ["PARTICIPACIÓN", 250],
    ["PERSONAS", 340],
  ];
  if (r.areas.length === 0) {
    izquierda(hoja, "La planta todavía no tiene áreas.", MARGEN, arriba, 9, { color: MARCA.tintaSuave });
    arriba += ALTO_FILA;
  } else {
    encabezadoTabla(columnasAreas, "KILOS");
    r.areas.forEach((fila, i) => {
      if (arriba + ALTO_FILA > LIMITE_INFERIOR) {
        espacio(ALTO_FILA * 2);
        encabezadoTabla(columnasAreas, "KILOS");
      }
      fondoFila(i);
      izquierda(hoja, `${i + 1}`, MARGEN, arriba, 8.5, { color: MARCA.tintaSuave });
      izquierda(hoja, fila.area, 70, arriba, 8.5);
      izquierda(hoja, `${fila.participacion}%`, 250, arriba, 8.5, {
        negrita: true,
        color: fila.participacion >= META_PARTICIPACION ? MARCA.oliva : MARCA.tinta,
      });
      izquierda(hoja, `${fila.participantes} de ${fila.dotacion}`, 340, arriba, 8.5, { color: MARCA.tintaSuave });
      derecha(hoja, formatKg(fila.kg), DERECHA, arriba, 8.5);
      arriba += ALTO_FILA;
    });
  }
  arriba += 22;

  // ------------------------------------------------------------ retiros
  espacio(60);
  tituloSeccion(hoja, "Retiros del mes", arriba);
  izquierda(
    hoja,
    "Verificado: con el peso que informó quien retiró. Estimado: kilos según la talla de cada depósito.",
    MARGEN,
    arriba + 13,
    8,
    { color: MARCA.tintaSuave }
  );
  arriba += 32;
  const columnasRetiros: [string, number][] = [
    ["FECHA", MARGEN],
    ["QUIÉN RETIRÓ", 120],
    ["GUÍA", 280],
    ["CONTENEDORES", 350],
    ["TIPO", 430],
  ];
  if (r.listaRetiros.length === 0) {
    izquierda(hoja, "Este mes no hubo retiros.", MARGEN, arriba, 9, { color: MARCA.tintaSuave });
    arriba += ALTO_FILA;
  } else {
    encabezadoTabla(columnasRetiros, "KILOS");
    r.listaRetiros.forEach((retiro, i) => {
      if (arriba + ALTO_FILA > LIMITE_INFERIOR) {
        espacio(ALTO_FILA * 2);
        encabezadoTabla(columnasRetiros, "KILOS");
      }
      fondoFila(i);
      izquierda(hoja, fechaCorta(retiro.fecha), MARGEN, arriba, 8.5, { color: MARCA.tintaSuave });
      izquierda(hoja, retiro.quienRetira.slice(0, 30), 120, arriba, 8.5);
      izquierda(hoja, retiro.guia ?? "-", 280, arriba, 8.5, { color: MARCA.tintaSuave });
      izquierda(hoja, `${retiro.contenedores}`, 350, arriba, 8.5, { color: MARCA.tintaSuave });
      izquierda(hoja, retiro.verificado ? "Verificado" : "Estimado", 430, arriba, 8.5, {
        negrita: retiro.verificado,
        color: retiro.verificado ? MARCA.oliva : MARCA.tintaSuave,
      });
      derecha(hoja, formatKg(retiro.kg), DERECHA, arriba, 8.5, { negrita: true });
      arriba += ALTO_FILA;
    });
  }
  arriba += 22;

  // ------------------------------------------------------------ contaminación
  espacio(60);
  tituloSeccion(hoja, "Contenedores contaminados", arriba);
  arriba += 20;
  if (r.contaminaciones.length === 0) {
    caja(hoja, MARGEN, arriba - 8, ANCHO_UTIL, 26, { relleno: MARCA.olivaClaro, radio: 6 });
    izquierda(hoja, "Ningún contenedor contaminado este mes: la planta está separando bien.", MARGEN + 10, arriba + 8, 9, {
      negrita: true,
      color: MARCA.oliva,
    });
    arriba += 30;
  } else {
    for (const i of r.contaminaciones) {
      espacio(ALTO_FILA * 2);
      izquierda(hoja, fechaCorta(i.reportadoEn), MARGEN, arriba, 8.5, { color: MARCA.tintaSuave });
      izquierda(hoja, `${i.contaminante} en el ${i.contenedorNombre.toLowerCase()}`, 120, arriba, 8.5, {
        negrita: true,
        color: MARCA.ambarOscuro,
      });
      derecha(hoja, i.atendida ? `Retirado${i.retiroId ? ` (${i.retiroId})` : ""}` : "Por retirar", DERECHA, arriba, 8.5, {
        color: MARCA.tintaSuave,
      });
      arriba += ALTO_FILA;
    }
  }

  piesDePagina(
    doc,
    { normal, negrita, serif },
    referencia,
    "Kilos: estimados según la talla declarada; certificados, los que salieron en un retiro. Participación: según la fecha del depósito. Tiempos: sobre los certificados en el mes."
  );

  return doc.save();
}

/** Genera el reporte y lo entrega al usuario (ver entregarPdf). */
export async function descargarReporte(r: ReportePlanta): Promise<ResultadoDescarga> {
  const bytes = await generarReportePdf(r);
  const nombre = `RecyTrack-Reporte-${r.planta.nombre.replace(/\s+/g, "")}-${r.mes}.pdf`;
  return entregarPdf(bytes, nombre, `Reporte RecyTrack ${r.planta.nombre}`);
}
