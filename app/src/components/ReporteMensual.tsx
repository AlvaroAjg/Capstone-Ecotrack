import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { Area, Incidencia, Planta, Registro, Retiro } from "../lib/tipos";
import { etiquetaMes } from "../lib/certificadoMensual";
import { avisar, textoDeError } from "../lib/dialogos";
import { formatKg } from "../lib/formato";
import { descargarReporte, reportePdfDisponible } from "../lib/reportePdf";
import { mesesReportables, reporteDePlanta } from "../lib/reportePlanta";
import { Boton, Segmentado, Tarjeta } from "./ui";

/** "2026-09" → "sep 2026", para el selector de meses. */
function mesCorto(mes: string): string {
  const [nombre, , anio] = etiquetaMes(mes).split(" ");
  return `${nombre.slice(0, 3)} ${anio}`;
}

/**
 * Reporte del mes de la planta, en PDF: se elige el mes (los cuatro más
 * recientes con actividad), se ve un adelanto de los números y se descarga.
 * Como el certificado, se genera en el dispositivo; hay que llamar a la
 * descarga directo desde el toque, porque iOS rechaza compartir si pasó
 * demasiado tiempo desde el gesto.
 */
export default function ReporteMensual({
  planta,
  areas,
  registros,
  incidencias,
  retiros,
}: {
  planta: Planta;
  areas: Area[];
  registros: Registro[];
  incidencias: Incidencia[];
  retiros: Retiro[];
}) {
  const meses = useMemo(
    () => mesesReportables(planta.id, registros, incidencias).slice(0, 4),
    [planta.id, registros, incidencias]
  );
  const [mes, setMes] = useState(meses[0]);
  const [generando, setGenerando] = useState(false);
  const reporte = useMemo(
    () => reporteDePlanta(planta, areas, mes, registros, incidencias, retiros),
    [planta, areas, mes, registros, incidencias, retiros]
  );

  async function descargar() {
    setGenerando(true);
    try {
      const resultado = await descargarReporte(reporte);
      if (resultado === "descargado") {
        avisar("Reporte descargado", "El PDF quedó guardado en la carpeta de descargas de tu dispositivo.");
      }
    } catch (e) {
      avisar("No se pudo generar el PDF", textoDeError(e));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Tarjeta>
      {meses.length > 1 ? (
        <View className="mb-4">
          <Segmentado
            opciones={meses.map((m) => ({ valor: m, etiqueta: mesCorto(m) }))}
            valor={mes}
            alCambiar={setMes}
          />
        </View>
      ) : null}
      <Text className="text-gray-800 font-semibold">
        {reporte.etiqueta.charAt(0).toUpperCase() + reporte.etiqueta.slice(1)}
        {reporte.enCurso ? " · en curso" : ""}
      </Text>
      <Text className="text-gray-500 text-xs mt-1 mb-3">
        {formatKg(reporte.kgCertificados)} certificados · {reporte.participacion}% de
        participación · {reporte.depositos.total} depósitos · {reporte.contaminaciones.length}{" "}
        {reporte.contaminaciones.length === 1 ? "contenedor contaminado" : "contenedores contaminados"}
      </Text>
      <Text className="text-gray-400 text-[11px] mb-4">
        Incluye los indicadores del piloto, los kilos por material, los tiempos de la cadena, la
        participación de cada área (sin nombres de personas), los retiros y los contenedores contaminados.
      </Text>
      {reportePdfDisponible ? (
        <Boton
          titulo={generando ? "Generando..." : "Descargar reporte (PDF)"}
          icono="📊"
          variante="oscuro"
          cargando={generando}
          onPress={descargar}
        />
      ) : (
        <Text className="text-gray-500 text-xs">
          El PDF se descarga desde la versión web instalada de RecyTrack.
        </Text>
      )}
    </Tarjeta>
  );
}
