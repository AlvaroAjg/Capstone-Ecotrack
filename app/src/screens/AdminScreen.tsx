import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Navegacion } from "../../App";
import {
  kgEfectivo,
  useEcoTrack,
  type Area,
  type Incidencia,
  type Planta,
  type Registro,
} from "../state/EcoTrack";
import { etiquetaMes } from "../lib/certificadoMensual";
import { avisar, confirmar, textoDeError } from "../lib/dialogos";
import { esDelMesActual, formatKg, porcentaje, sumaKg, tiempoRelativo } from "../lib/formato";
import { descargarReporte, reportePdfDisponible } from "../lib/reportePdf";
import { mesesReportables, reporteDePlanta } from "../lib/reportePlanta";
import ContenedoresTorre from "../components/ContenedoresTorre";
import ValidacionContenedores from "../components/ValidacionContenedores";
import {
  AvatarPerfil,
  CampanaAvisos,
  Aviso,
  Boton,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Segmentado,
  Tarjeta,
  Vacio,
} from "../components/ui";

/**
 * Vista del validador y, mientras no exista el panel web, también del
 * administrador. Los registros que llegan ya son solo los de la planta (ver
 * consultasPara en services/registros.ts).
 */
export default function AdminScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    miPlanta,
    areas,
    errorDatos,
    validarRegistros,
    rechazarRegistros,
    avisosNuevos,
    incidencias,
    registros,
    ranking,
    reportarYValidar,
  } = useEcoTrack();

  const esAdministrador = usuario?.rol === "administrador";
  const pendientes = useMemo(() => registros.filter((r) => r.estado === "pendiente"), [registros]);
  const kgMes = sumaKg(
    registros
      .filter((r) => r.estado === "certificado" && esDelMesActual(r.certificadoEn))
      .map(kgEfectivo)
  );
  // Participación de la planta: la suma de las áreas del ranking del mes.
  const participacion = porcentaje(
    ranking.reduce((t, f) => t + f.participantes, 0),
    ranking.reduce((t, f) => t + f.dotacion, 0)
  );
  // Calidad de separación: contenedores que se encontraron contaminados este mes.
  const contaminacionesMes = incidencias.filter((i) => esDelMesActual(i.reportadoEn));
  const contaminadosMes = contaminacionesMes.length;
  // Las incidencias llegan de la más reciente a la más antigua.
  const ultimaContaminacion = contaminacionesMes[0];
  const [validandoTanda, setValidandoTanda] = useState(false);

  /**
   * El conserje pasa una vez al día y revisa los contenedores, no depósito por
   * depósito. Esta acción valida todos los contenedores de una vez, con los
   * kilos estimados por la talla que se declaró en cada depósito. Es un solo
   * lote atómico: si falla, no queda nada validado a medias.
   */
  async function validarTanda() {
    if (pendientes.length === 0) return;

    const acepta = await confirmar(
      "Validar la tanda del día",
      `Se validarán ${pendientes.length} depósito${
        pendientes.length === 1 ? "" : "s"
      } de todos los contenedores, con la talla declarada en cada uno. Si un contenedor no cuadra con lo que se declaró, márcalo antes con "No cuadra".`,
      "Validar todo"
    );
    if (!acepta) return;

    setValidandoTanda(true);
    try {
      await validarRegistros(pendientes);
    } catch (e) {
      avisar("No se validó la tanda", `${textoDeError(e)} No se validó ningún depósito; intenta de nuevo.`);
    } finally {
      setValidandoTanda(false);
    }
  }

  return (
    <Cuerpo>
      <Encabezado tono="oscuro">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-gray-300 text-sm">Panel de administrador</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {miPlanta?.nombre ?? "Sin planta"}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              {usuario?.nombre ?? "Administrador"} · {miPlanta?.empresa ?? ""}
            </Text>
          </View>
          <CampanaAvisos nuevos={avisosNuevos} alPresionar={() => nav.ir("avisos")} />
          <AvatarPerfil
            nombre={usuario?.nombre ?? "Administrador"}
            alPresionar={() => nav.ir("perfil")}
            color="bg-gray-700"
          />
        </View>
      </Encabezado>

      <FilaMetricas
        metricas={[
          { valor: `${pendientes.length}`, etiqueta: "Por validar" },
          { valor: formatKg(kgMes), etiqueta: "Certificado este mes" },
          { valor: `${participacion}%`, etiqueta: "Participación" },
        ]}
      />

      {errorDatos ? (
        <View className="px-6 mt-6">
          <Aviso texto={errorDatos} />
        </View>
      ) : null}

      <Seccion
        titulo="Validaciones pendientes"
        etiqueta={`${pendientes.length} en cola`}
      >
        {/* Calidad de separación del mes: en rojo si hubo contenedores contaminados. */}
        {contaminadosMes > 0 ? (
          <View className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-3 flex-row items-center">
            <Text className="text-red-700 text-4xl font-bold mr-4">{contaminadosMes}</Text>
            <View className="flex-1 min-w-0">
              <Text className="text-red-800 font-semibold">
                {contaminadosMes === 1
                  ? "Contenedor contaminado este mes"
                  : "Contenedores contaminados este mes"}
              </Text>
              {ultimaContaminacion ? (
                <Text className="text-red-700 text-xs mt-1">
                  Último: {ultimaContaminacion.contaminante.toLowerCase()} en el{" "}
                  {ultimaContaminacion.contenedorNombre.toLowerCase()} ·{" "}
                  {tiempoRelativo(ultimaContaminacion.reportadoEn)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-3 flex-row items-center">
            <Text className="text-green-700 text-4xl font-bold mr-4">0</Text>
            <Text className="text-gray-600 text-sm flex-1">
              Contenedores contaminados este mes. La planta está separando bien.
            </Text>
          </View>
        )}
        {pendientes.length === 0 ? (
          <Vacio emoji="✅" texto="No hay depósitos pendientes en tu planta." />
        ) : (
          <>
            <View className="mb-3">
              <Boton
                titulo={
                  validandoTanda
                    ? "Validando..."
                    : `Validar la tanda del día (${pendientes.length})`
                }
                cargando={validandoTanda}
                onPress={validarTanda}
                className="py-3"
              />
            </View>
            {usuario?.plantaId ? (
              <ValidacionContenedores
                plantaId={usuario.plantaId}
                pendientes={pendientes}
                alValidar={validarRegistros}
                alRechazar={rechazarRegistros}
                alReportar={reportarYValidar}
              />
            ) : null}
          </>
        )}
      </Seccion>

      {/* Mientras no exista el panel web, el administrador define aquí los contenedores. */}
      {esAdministrador && usuario?.plantaId ? <ContenedoresTorre plantaId={usuario.plantaId} /> : null}

      {esAdministrador && miPlanta ? (
        <Seccion titulo="Reporte mensual">
          <ReporteMensual
            planta={miPlanta}
            areas={areas}
            registros={registros}
            incidencias={incidencias}
          />
        </Seccion>
      ) : null}
    </Cuerpo>
  );
}

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
function ReporteMensual({
  planta,
  areas,
  registros,
  incidencias,
}: {
  planta: Planta;
  areas: Area[];
  registros: Registro[];
  incidencias: Incidencia[];
}) {
  const meses = useMemo(
    () => mesesReportables(planta.id, registros, incidencias).slice(0, 4),
    [planta.id, registros, incidencias]
  );
  const [mes, setMes] = useState(meses[0]);
  const [generando, setGenerando] = useState(false);
  const reporte = useMemo(
    () => reporteDePlanta(planta, areas, mes, registros, incidencias),
    [planta, areas, mes, registros, incidencias]
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
        Incluye los indicadores del piloto, los kilos por material, los tiempos de la cadena, las
        áreas que más reciclaron (sin nombres de personas) y los contenedores contaminados.
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
