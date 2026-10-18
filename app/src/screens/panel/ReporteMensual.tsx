import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type { Area, Incidencia, Planta, Registro, Retiro } from "../../lib/tipos";
import { etiquetaMes } from "../../lib/certificadoMensual";
import { avisar, textoDeError } from "../../lib/dialogos";
import { formatKg } from "../../lib/formato";
import { descargarReporte, reportePdfDisponible } from "../../lib/reportePdf";
import { mesesReportables, reporteDePlanta } from "../../lib/reportePlanta";
import { Bloque, BotonPanel, Logo, Pildoras, Texto, Titulo } from "./estilo";

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
  const etiqueta = reporte.etiqueta.charAt(0).toUpperCase() + reporte.etiqueta.slice(1);

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

  const cifras = [
    { valor: formatKg(reporte.kgCertificados), etiqueta: "certificados" },
    { valor: `${reporte.participacion}%`, etiqueta: "participación" },
    { valor: `${reporte.depositos.total}`, etiqueta: "depósitos" },
    {
      valor: `${reporte.contaminaciones.length}`,
      etiqueta: reporte.contaminaciones.length === 1 ? "contaminado" : "contaminados",
    },
  ];

  return (
    <Bloque>
      <Titulo className="text-[24px]">Reporte mensual</Titulo>
      <Texto className="text-tinta-suave text-xs mt-1 mb-3">Se genera en el navegador, sin costo.</Texto>

      {meses.length > 1 ? (
        <Pildoras opciones={meses.map((m) => ({ valor: m, etiqueta: mesCorto(m) }))} valor={mes} alCambiar={setMes} />
      ) : null}

      {/* Un adelanto con el aspecto de la portada del PDF. */}
      <View className="bg-piedra rounded-2xl p-4 mt-1">
        <View className="bg-white rounded-xl overflow-hidden border border-piedra-borde">
          <View className="bg-vino flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center">
              <Logo tamano={18} />
              <Titulo className="text-vino-texto text-[15px] ml-1.5">RecyTrack</Titulo>
            </View>
            <Texto className="text-vino-suave text-[11px]">
              {etiqueta}
              {reporte.enCurso ? " · en curso" : ""}
            </Texto>
          </View>
          <View className="px-4 py-3">
            <Texto className="text-tinta text-[13px] font-semibold">Reporte mensual de reciclaje</Texto>
            <View className="flex-row flex-wrap mt-2">
              {cifras.map((c) => (
                <View key={c.etiqueta} className="w-1/2 py-1.5">
                  <Titulo className="text-tinta text-[20px]">{c.valor}</Titulo>
                  <Texto className="text-tinta-suave text-[11px]">{c.etiqueta}</Texto>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <Texto className="text-tinta-suave text-[11px] mt-3 leading-[16px]">
        Incluye los indicadores del piloto, los kilos por material, los tiempos de la cadena, la
        participación de cada área (sin nombres de personas), los retiros y los contenedores contaminados.
      </Texto>
      {reportePdfDisponible ? (
        <BotonPanel
          titulo={generando ? "Generando..." : "Descargar PDF"}
          icono="descargar"
          cargando={generando}
          onPress={descargar}
          className="mt-4"
        />
      ) : (
        <Texto className="text-tinta-suave text-xs mt-3">
          El PDF se descarga desde la versión web instalada de RecyTrack.
        </Texto>
      )}
    </Bloque>
  );
}
