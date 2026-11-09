import React, { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import type { Area, Incidencia, Planta, Registro, Retiro } from "../../lib/tipos";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { avisar, textoDeError } from "../../lib/dialogos";
import { formatKg, porcentaje } from "../../lib/formato";
import { descargarReporte, reportePdfDisponible } from "../../lib/reportePdf";
import { mesesReportables, reporteDePlanta } from "../../lib/reportePlanta";
import { indicadoresDelMes } from "../../lib/resumenPanel";
import { BotonPanel, Icono, Logo, Texto, Titulo, mesLargo } from "./estilo";

/** Cuántos meses anteriores se ofrecen para descargar. */
const MESES_ANTERIORES = 3;

/**
 * El reporte del mes de la planta: un adelanto con el aspecto de la portada
 * del PDF, la descarga y los reportes de los meses anteriores. Como el
 * certificado, se genera en el dispositivo; hay que llamar a la descarga
 * directo desde el toque, porque iOS rechaza compartir si pasó demasiado
 * tiempo desde el gesto.
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
  const mes = mesDe(Date.now());
  const anteriores = useMemo(
    () => mesesReportables(planta.id, registros, incidencias).filter((m) => m < mes).slice(0, MESES_ANTERIORES),
    [planta.id, registros, incidencias, mes]
  );
  const reporte = useMemo(
    () => reporteDePlanta(planta, areas, mes, registros, incidencias, retiros),
    [planta, areas, mes, registros, incidencias, retiros]
  );
  // Los mismos indicadores del Resumen, para que el adelanto diga lo mismo.
  const ind = useMemo(() => indicadoresDelMes(registros, incidencias, mes), [registros, incidencias, mes]);
  const [generando, setGenerando] = useState<string | null>(null);

  async function descargar(mesReporte: string) {
    setGenerando(mesReporte);
    try {
      const resultado = await descargarReporte(
        reporteDePlanta(planta, areas, mesReporte, registros, incidencias, retiros)
      );
      if (resultado === "descargado") {
        avisar("Reporte descargado", "El PDF quedó guardado en la carpeta de descargas de tu dispositivo.");
      }
    } catch (e) {
      avisar("No se pudo generar el PDF", textoDeError(e));
    } finally {
      setGenerando(null);
    }
  }

  const cifras = [
    { valor: `${reporte.participacion}%`, etiqueta: "Participación" },
    { valor: `${ind.validados}`, etiqueta: "Depósitos validados" },
    { valor: formatKg(ind.kgEstimados), etiqueta: "Masa estimada" },
    { valor: `${porcentaje(ind.rondas, ind.diasHabiles)}%`, etiqueta: "Rondas completadas" },
  ];
  const nombreMes = etiquetaMes(mes).split(" ")[0];

  return (
    <View className="bg-piedra-oscura rounded-[20px] p-5">
      <Titulo className="text-[24px]">Reporte de {nombreMes}</Titulo>
      <Texto className="text-tinta-media text-[13px] mt-1">Se genera en el navegador, sin costo.</Texto>

      {/* Un adelanto con el aspecto de la portada del PDF. */}
      <View
        className="bg-white rounded-md overflow-hidden mt-3.5"
        style={{ shadowColor: "#2B1424", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }}
      >
        <View className="bg-vino flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <Logo tamano={16} />
            <Titulo className="text-vino-texto text-[14px] ml-1.5">RecyTrack</Titulo>
          </View>
          <Texto className="text-vino-suave text-[11px]">
            {mesLargo(mes)}
            {reporte.enCurso ? " · en curso" : ""}
          </Texto>
        </View>
        <View className="px-4 py-3">
          <Texto className="text-tinta text-[13px] font-bold">Reporte mensual de reciclaje, {planta.nombre}</Texto>
          <View className="flex-row flex-wrap mt-2">
            {cifras.map((c) => (
              <View key={c.etiqueta} className="w-1/2 py-1.5">
                <Titulo className="text-tinta text-[20px]">{c.valor}</Titulo>
                <Texto className="text-tinta-suave text-[11px]">{c.etiqueta}</Texto>
              </View>
            ))}
          </View>

          <Texto className="text-tinta-media text-[11px] font-semibold mt-2 mb-1">Participación por área</Texto>
          {reporte.areas.length === 0 ? (
            <Texto className="text-tinta-suave text-[11px]">Todavía no hay áreas.</Texto>
          ) : (
            reporte.areas.map((a) => (
              <View key={a.area} className="flex-row items-center mt-1">
                <Texto className="w-24 text-tinta-media text-[11px] pr-1" numberOfLines={1}>
                  {a.area}
                </Texto>
                <View className="flex-1 h-1.5 bg-piedra-linea rounded-full overflow-hidden">
                  <View className="h-1.5 bg-oliva rounded-full" style={{ width: `${a.participacion}%` }} />
                </View>
                <Texto className="w-9 text-right text-tinta text-[11px]">{a.participacion}%</Texto>
              </View>
            ))
          )}

          <Texto className="text-tinta-suave text-[10px] mt-3 leading-[14px] border-t border-piedra-linea pt-2">
            Método: validación visual diaria por contenedor. La masa se estima con la talla que declara cada
            persona; un retiro con peso informado queda como verificado.
          </Texto>
        </View>
      </View>

      {reportePdfDisponible ? (
        <BotonPanel
          titulo={generando === mes ? "Generando..." : "Descargar PDF"}
          icono="descargar"
          variante="vino"
          cargando={generando === mes}
          onPress={() => descargar(mes)}
          className="mt-3.5 h-12"
        />
      ) : (
        <Texto className="text-tinta-suave text-xs mt-3">
          El PDF se descarga desde la versión web instalada de RecyTrack.
        </Texto>
      )}

      {reportePdfDisponible && anteriores.length > 0 ? (
        <View className="mt-4">
          <Texto className="text-tinta-media text-[13px] font-semibold mb-1">Reportes anteriores</Texto>
          {anteriores.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => descargar(m)}
              disabled={generando !== null}
              accessibilityRole="button"
              accessibilityLabel={`Descargar reporte de ${mesLargo(m).toLowerCase()}`}
              className={`flex-row items-center justify-between py-2.5 border-t border-piedra-control ${
                generando !== null ? "opacity-50" : ""
              }`}
            >
              <Texto className="text-tinta text-sm">{mesLargo(m)}</Texto>
              <View className="flex-row items-center">
                <Texto className="text-oliva text-[13px] font-semibold mr-1.5">
                  {generando === m ? "Generando..." : "PDF"}
                </Texto>
                <Icono nombre="descargar" tamano={16} color="#3F6B2E" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
