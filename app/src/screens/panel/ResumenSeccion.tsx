import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useEcoTrack, type FilaRanking } from "../../state/EcoTrack";
import { formatKg } from "../../lib/formato";
import {
  indicadoresDelMes,
  rondaDeHoy,
  type EstadoRonda,
  type FilaRonda,
} from "../../lib/resumenPanel";

/** Los mismos nombres que usa el validador (ver ValidacionContenedores). */
const ASPECTO_RONDA: Record<EstadoRonda, { texto: string; fondo: string; color: string }> = {
  conforme: { texto: "Conforme", fondo: "bg-green-100", color: "text-green-800" },
  observacion: { texto: "Con observación", fondo: "bg-amber-100", color: "text-amber-800" },
  sinMaterial: { texto: "Sin material", fondo: "bg-red-100", color: "text-red-800" },
  pendiente: { texto: "Pendiente", fondo: "bg-gray-100", color: "text-gray-600" },
  vacio: { texto: "Sin depósitos", fondo: "bg-gray-50", color: "text-gray-400" },
};

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Resumen del mes de la planta: los indicadores, el ranking de áreas y cómo
 * va la ronda de hoy. Se calcula con lo que el estado ya escucha en vivo (ver
 * lib/resumenPanel.ts).
 */
export default function ResumenSeccion() {
  const { registros, incidencias, contenedores, ranking } = useEcoTrack();

  const ind = useMemo(
    () => indicadoresDelMes(registros, incidencias, ranking),
    [registros, incidencias, ranking]
  );
  const ronda = useMemo(
    () => rondaDeHoy(registros, incidencias, contenedores),
    [registros, incidencias, contenedores]
  );

  const indicadores = [
    {
      etiqueta: "Participación",
      valor: `${ind.participacion}%`,
      detalle: `${ind.participantes} de ${ind.dotacion} personas reciclaron este mes`,
      color: "text-green-700",
    },
    {
      etiqueta: "Depósitos validados",
      valor: `${ind.validados}`,
      detalle: ind.porValidar > 0 ? `${ind.porValidar} esperan la ronda` : "Ninguno espera la ronda",
      color: "text-gray-900",
    },
    {
      etiqueta: "Kilos estimados",
      valor: formatKg(ind.kgEstimados),
      detalle: "Según la talla de bolsa declarada",
      color: "text-gray-900",
    },
    {
      etiqueta: "Rondas del mes",
      valor: `${ind.rondas}`,
      detalle: "Días en que el validador revisó los contenedores",
      color: "text-gray-900",
    },
    {
      etiqueta: "Con observación",
      valor: `${ind.conObservacion}`,
      detalle: "Contenedores con algo que no correspondía",
      color: ind.conObservacion > 0 ? "text-amber-700" : "text-gray-900",
    },
  ];

  return (
    <View>
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

      <View className="flex-row items-start">
        <View className="flex-1 min-w-0 mr-5">
          <RankingAreas ranking={ranking} />
        </View>
        <View className="w-[380px]">
          <RondaDeHoy filas={ronda} />
        </View>
      </View>
    </View>
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

function RondaDeHoy({ filas }: { filas: FilaRonda[] }) {
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
        filas.map((f) => {
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
    </Tablero>
  );
}
