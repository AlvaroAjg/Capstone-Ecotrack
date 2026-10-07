import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useEcoTrack, type Campana, type FilaRanking } from "../../state/EcoTrack";
import { diaYMes, formatKg } from "../../lib/formato";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { mesesReportables, reporteDePlanta } from "../../lib/reportePlanta";
import { descargarReporte, reportePdfDisponible } from "../../lib/reportePdf";
import { avanceAreas } from "../../lib/incentivo";
import { avisar, textoDeError } from "../../lib/dialogos";
import type { Material } from "../../lib/tipos";
import {
  indicadoresDelMes,
  kilosPorMaterial,
  rondaDeHoy,
  validadosPorSemana,
  type EstadoRonda,
  type FilaRonda,
  type KilosMaterial,
  type Semana,
} from "../../lib/resumenPanel";
import { Boton, Chip } from "../../components/ui";

/** Los mismos nombres que usa el validador (ver ValidacionContenedores). */
const ASPECTO_RONDA: Record<EstadoRonda, { texto: string; fondo: string; color: string }> = {
  conforme: { texto: "Conforme", fondo: "bg-green-100", color: "text-green-800" },
  observacion: { texto: "Con observación", fondo: "bg-amber-100", color: "text-amber-800" },
  sinMaterial: { texto: "Sin material", fondo: "bg-red-100", color: "text-red-800" },
  pendiente: { texto: "Pendiente", fondo: "bg-gray-100", color: "text-gray-600" },
  vacio: { texto: "Sin depósitos", fondo: "bg-gray-50", color: "text-gray-400" },
};

/** Un color por material, que se distingan también por claridad y no solo por tono. */
const COLOR_MATERIAL: Record<Material, string> = {
  "Plástico": "#ca8a04",
  "Papel/cartón": "#2563eb",
  "Vidrio": "#15803d",
  "Metal": "#4b5563",
};

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/** "2026-09" → "sep 2026", para el selector de meses. */
function mesCorto(mes: string): string {
  const [nombre, , anio] = etiquetaMes(mes).split(" ");
  return `${nombre.slice(0, 3)} ${anio}`;
}

/**
 * Resumen de la planta en el mes elegido: indicadores, ranking de áreas,
 * depósitos por semana y por material, la campaña y, si es el mes en curso,
 * la ronda de hoy. Se calcula con lo que el estado ya escucha en vivo (ver
 * lib/resumenPanel.ts y lib/reportePlanta.ts).
 */
export default function ResumenSeccion() {
  const { miPlanta, areas, registros, incidencias, retiros, contenedores, ranking, campana } =
    useEcoTrack();
  const mesActual = mesDe(Date.now());
  const meses = useMemo(
    () => (miPlanta ? mesesReportables(miPlanta.id, registros, incidencias).slice(0, 6) : [mesActual]),
    [miPlanta, registros, incidencias, mesActual]
  );
  const [mes, setMes] = useState(mesActual);
  const [generando, setGenerando] = useState(false);
  const enCurso = mes === mesActual;

  // La participación de cada área sale del reporte del mes: se calcula con los
  // depósitos, así sirve igual para el mes en curso y para los anteriores.
  const reporte = useMemo(
    () => (miPlanta ? reporteDePlanta(miPlanta, areas, mes, registros, incidencias, retiros) : null),
    [miPlanta, areas, mes, registros, incidencias, retiros]
  );
  const ind = useMemo(() => indicadoresDelMes(registros, incidencias, mes), [registros, incidencias, mes]);
  const semanas = useMemo(() => validadosPorSemana(registros, mes), [registros, mes]);
  const materiales = useMemo(() => kilosPorMaterial(registros, mes), [registros, mes]);
  const ronda = useMemo(
    () => rondaDeHoy(registros, incidencias, contenedores),
    [registros, incidencias, contenedores]
  );
  const rankingMes: FilaRanking[] = (reporte?.areas ?? []).map((a) => ({
    areaId: a.area,
    nombre: a.area,
    dotacion: a.dotacion,
    participantes: a.participantes,
    depositos: a.depositos,
    participacion: a.participacion,
    esMiArea: false,
  }));

  async function descargar() {
    if (!reporte) return;
    setGenerando(true);
    try {
      const resultado = await descargarReporte(reporte);
      if (resultado === "descargado") {
        avisar("Reporte descargado", "El PDF quedó guardado en la carpeta de descargas.");
      }
    } catch (e) {
      avisar("No se pudo generar el PDF", textoDeError(e));
    } finally {
      setGenerando(false);
    }
  }

  const participantes = `${reporte?.participantes ?? 0} de ${reporte?.dotacion ?? 0} personas`;
  const indicadores = [
    {
      etiqueta: "Participación",
      valor: `${reporte?.participacion ?? 0}%`,
      detalle: `${participantes} reciclaron ${enCurso ? "este mes" : "ese mes"}`,
      color: "text-green-700",
    },
    {
      etiqueta: "Depósitos validados",
      valor: `${ind.validados}`,
      detalle: !enCurso
        ? "Conformes o con observación en el mes"
        : ind.porValidar > 0
          ? `${ind.porValidar} esperan la ronda`
          : "Ninguno espera la ronda",
      color: "text-gray-900",
    },
    {
      etiqueta: "Kilos estimados",
      valor: formatKg(ind.kgEstimados),
      detalle: "Validados, según la talla de bolsa declarada",
      color: "text-gray-900",
    },
    {
      etiqueta: "Rondas hechas",
      valor: `${ind.rondas}/${ind.diasHabiles}`,
      detalle: `Días con ronda, de ${ind.diasHabiles} días hábiles${enCurso ? " hasta hoy" : ""}`,
      color: ind.diasHabiles > 0 && ind.rondas >= ind.diasHabiles ? "text-green-700" : "text-gray-900",
    },
    {
      etiqueta: "Con observación",
      valor: `${ind.conObservacion}`,
      detalle:
        ind.lotesRevisados > 0
          ? `De ${ind.lotesRevisados} lotes revisados · ${ind.sinMaterial} sin material`
          : "Todavía no hay lotes revisados",
      color: ind.conObservacion > 0 ? "text-amber-700" : "text-gray-900",
    },
  ];

  return (
    <View>
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row flex-wrap items-center flex-1 pr-4">
          {meses.map((m) => (
            <Chip key={m} texto={mesCorto(m)} activo={m === mes} alPresionar={() => setMes(m)} />
          ))}
        </View>
        {reportePdfDisponible && reporte ? (
          <Boton
            titulo={generando ? "Generando..." : "Reporte del mes (PDF)"}
            icono="📄"
            cargando={generando}
            onPress={descargar}
            className="py-3 px-5"
          />
        ) : null}
      </View>

      <View className="flex-row -mx-2 mb-5">
        {indicadores.map((k) => (
          <View key={k.etiqueta} className="flex-1 px-2">
            <View className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 h-full">
              <Text className="text-gray-600 text-sm font-medium">{k.etiqueta}</Text>
              <Text className={`text-3xl font-bold mt-1 ${k.color}`}>{k.valor}</Text>
              <Text className="text-gray-500 text-xs mt-1 leading-4">{k.detalle}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* La analítica va a la izquierda y la ronda de hoy a la derecha: la
          ronda crece con los contenedores de la planta, y así no deja un
          hueco bajo el ranking. */}
      <View className="flex-row items-start">
        <View className="flex-1 min-w-0">
          <RankingAreas ranking={rankingMes} />
          <View className="flex-row items-stretch mt-5">
            <View className="flex-1 min-w-0 mr-5">
              <GraficoSemanas semanas={semanas} />
            </View>
            <View className="flex-1 min-w-0">
              <PorMaterial materiales={materiales} />
            </View>
          </View>
          <View className="mt-5">
            <TarjetaCampana campana={campana} ranking={ranking} />
          </View>
        </View>
        {enCurso ? (
          <View className="w-[380px] ml-5">
            <RondaDeHoy filas={ronda} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Barras de los depósitos validados en cada semana del mes. */
function GraficoSemanas({ semanas }: { semanas: Semana[] }) {
  const maximo = Math.max(1, ...semanas.map((s) => s.validados));
  return (
    <Tablero titulo="Depósitos validados por semana">
      <View className="flex-row items-end justify-around h-40 border-b border-gray-200">
        {semanas.map((s) => (
          <View key={s.etiqueta} className="items-center" style={{ width: 52 }}>
            <Text className="text-gray-800 text-xs font-bold mb-1">{s.futura ? "" : s.validados}</Text>
            <View
              className={`w-9 rounded-t-lg ${s.enCurso ? "bg-green-300" : "bg-green-700"}`}
              style={{ height: s.futura ? 0 : Math.max(2, Math.round((s.validados / maximo) * 120)) }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row justify-around mt-2">
        {semanas.map((s) => (
          <View key={s.etiqueta} className="items-center" style={{ width: 52 }}>
            <Text className={`text-[11px] text-center ${s.futura ? "text-gray-300" : "text-gray-600"}`}>
              {s.etiqueta}
            </Text>
            {s.enCurso ? <Text className="text-gray-400 text-[10px]">en curso</Text> : null}
          </View>
        ))}
      </View>
    </Tablero>
  );
}

/** Los kilos validados del mes por material, con su parte del total. */
function PorMaterial({ materiales }: { materiales: KilosMaterial[] }) {
  const total = materiales.reduce((t, m) => t + m.kg, 0);
  return (
    <Tablero titulo="Por material" etiqueta={`${formatKg(total)} · estimado`}>
      {materiales.length === 0 ? (
        <Text className="text-gray-500 text-sm">Todavía no hay depósitos validados en el mes.</Text>
      ) : (
        materiales.map((m) => (
          <View key={m.material} className="mb-3">
            <View className="flex-row justify-between mb-1">
              <View className="flex-row items-center">
                <View
                  className="w-2.5 h-2.5 rounded-sm mr-2"
                  style={{ backgroundColor: COLOR_MATERIAL[m.material] }}
                />
                <Text className="text-gray-800 text-sm font-medium">{m.material}</Text>
              </View>
              <Text className="text-gray-700 text-sm">
                <Text className="font-bold">{formatKg(m.kg)}</Text> · {m.porcentaje}%
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-2 rounded-full"
                style={{ width: `${m.porcentaje}%`, backgroundColor: COLOR_MATERIAL[m.material] }}
              />
            </View>
          </View>
        ))
      )}
      <Text className="text-gray-400 text-xs mt-1">
        Kilos estimados = talla declarada × factor del material.
      </Text>
    </Tablero>
  );
}

/** La campaña vigente y cuántas áreas ya llegan a su meta este mes. */
function TarjetaCampana({ campana, ranking }: { campana: Campana | null; ranking: FilaRanking[] }) {
  if (!campana || campana.terminaEn < Date.now()) {
    return (
      <Tablero titulo="Campaña activa">
        <Text className="text-gray-500 text-sm">
          No hay una campaña vigente. Créala en la sección Incentivo para que los colaboradores la vean.
        </Text>
      </Tablero>
    );
  }
  const avance = avanceAreas(campana.metaParticipacion, ranking);
  const cumplen = avance.filter((a) => a.cumple).length;
  return (
    <Tablero titulo="Campaña activa" etiqueta={`Termina el ${diaYMes(campana.terminaEn)}`}>
      <Text className="text-gray-900 font-semibold mb-2">{campana.nombre}</Text>
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600 text-sm">Meta: {campana.metaParticipacion}% por área</Text>
        <Text className="text-green-700 text-sm font-bold">
          {cumplen} de {avance.length} áreas
        </Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <View
          className="h-2 bg-green-700 rounded-full"
          style={{ width: `${avance.length > 0 ? Math.round((cumplen / avance.length) * 100) : 0}%` }}
        />
      </View>
      <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <Text className="text-amber-900 text-sm">🏆 {campana.incentivo}</Text>
      </View>
    </Tablero>
  );
}

function Tablero({
  titulo,
  etiqueta,
  children,
}: {
  titulo: string;
  etiqueta?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-5">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-gray-800 text-base font-semibold">{titulo}</Text>
        {etiqueta ? (
          <View className="bg-gray-200 rounded-full px-3 py-1">
            <Text className="text-gray-600 text-xs font-medium">{etiqueta}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function RankingAreas({ ranking }: { ranking: FilaRanking[] }) {
  return (
    <Tablero titulo="Ranking de áreas" etiqueta="% de personas del área que reciclaron este mes">
      {ranking.length === 0 ? (
        <Text className="text-gray-500 text-sm">Todavía no hay áreas en la planta.</Text>
      ) : (
        ranking.map((a, i) => (
          <View key={a.areaId} className="flex-row items-center h-9">
            <Text
              className={`w-6 text-right text-sm font-bold mr-3 ${i < 3 ? "text-green-700" : "text-gray-500"}`}
            >
              {i + 1}
            </Text>
            <Text className="w-48 text-gray-800 text-sm font-medium mr-3" numberOfLines={1}>
              {a.nombre}
            </Text>
            <View className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <View className="h-2.5 bg-green-700 rounded-full" style={{ width: `${a.participacion}%` }} />
            </View>
            <Text className="w-12 text-right text-gray-900 text-sm font-bold">{a.participacion}%</Text>
            <Text className="w-28 text-right text-gray-500 text-xs">
              {a.participantes} de {a.dotacion} personas
            </Text>
          </View>
        ))
      )}
    </Tablero>
  );
}

export function RondaDeHoy({ filas }: { filas: FilaRonda[] }) {
  const porRevisar = filas.filter((f) => f.estado !== "vacio");
  const revisados = porRevisar.filter((f) => f.estado !== "pendiente").length;

  return (
    <Tablero
      titulo="Ronda de hoy"
      etiqueta={porRevisar.length > 0 ? `${revisados} de ${porRevisar.length} revisados` : undefined}
    >
      {filas.length === 0 ? (
        <Text className="text-gray-500 text-sm">La planta todavía no tiene contenedores.</Text>
      ) : (
        // Los contenedores sin nada que revisar van en una sola línea al final:
        // con muchos contenedores, listarlos todos tapaba lo importante.
        porRevisar.map((f) => {
          const aspecto = ASPECTO_RONDA[f.estado];
          const detalle =
            f.revisadoEn !== null
              ? `${f.revisados} depósito${f.revisados === 1 ? "" : "s"} · ${hora(f.revisadoEn)}`
              : f.pendientes > 0
                ? `${f.pendientes} por validar`
                : "Nada que revisar";
          return (
            <View key={f.codigo} className="flex-row items-center justify-between py-3 border-t border-gray-100">
              <View className="flex-1 min-w-0 pr-2">
                <Text className="text-gray-800 text-sm font-medium" numberOfLines={1}>
                  {f.punto || "Sin punto"} · {f.nombre}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">{detalle}</Text>
              </View>
              <View className={`rounded-full px-2.5 py-1 ${aspecto.fondo}`}>
                <Text className={`text-xs font-semibold ${aspecto.color}`}>{aspecto.texto}</Text>
              </View>
            </View>
          );
        })
      )}
      {filas.length > porRevisar.length ? (
        <Text className="text-gray-400 text-xs pt-3 border-t border-gray-100">
          {filas.length - porRevisar.length} contenedor{filas.length - porRevisar.length === 1 ? "" : "es"} sin
          depósitos que revisar hoy.
        </Text>
      ) : null}
    </Tablero>
  );
}
