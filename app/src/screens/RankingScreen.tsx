import React from "react";
import { View, Text } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type FilaRanking } from "../state/EcoTrack";
import { etiquetaMes, mesDe } from "../lib/certificadoMensual";
import { Barra, Cuerpo, Encabezado, Tarjeta, TituloEncabezado, Vacio } from "../components/ui";

const MEDALLAS = ["🥇", "🥈", "🥉"];
/** Alto de cada escalón del podio, del 1° al 3°. */
const ALTO_PODIO = [96, 68, 48];

/**
 * Ranking del mes entre las áreas de la planta, por participación: el % de
 * las personas de cada área que reciclaron. Sale del resumen del mes, así que
 * no muestra ni descarga los depósitos de nadie.
 */
export default function RankingScreen({ nav }: { nav: Navegacion }) {
  const { ranking } = useEcoTrack();
  const miIndice = ranking.findIndex((a) => a.esMiArea);
  const mes = etiquetaMes(mesDe(Date.now()));

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado
          titulo="Ranking del mes"
          subtitulo={`Participación por área en ${mes} · se actualiza con cada depósito`}
          alVolver={nav.raiz ? undefined : nav.volver}
        />
      </Encabezado>

      {ranking.length === 0 ? (
        <View className="px-6 mt-6">
          <Vacio emoji="🏭" texto="Todavía no hay áreas registradas en la planta." />
        </View>
      ) : (
        <>
          <View className="px-6 -mt-6">
            <Tarjeta>
              <Podio filas={ranking.slice(0, 3)} />
              <Brecha ranking={ranking} miIndice={miIndice} />
            </Tarjeta>
          </View>

          {ranking.length > 3 ? (
            <View className="px-6 mt-3">
              {ranking.slice(3).map((a, i) => (
                <FilaArea key={a.areaId} fila={a} posicion={i + 4} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Cuerpo>
  );
}

/** Podio de hasta tres áreas: la 1° al centro y más alta, como en una premiación. */
function Podio({ filas }: { filas: FilaRanking[] }) {
  // Orden visual: 2°, 1°, 3°.
  const orden = [1, 0, 2].filter((i) => i < filas.length);
  return (
    <View className="flex-row items-end justify-center mt-2">
      {orden.map((i) => {
        const a = filas[i];
        return (
          <View key={a.areaId} className="items-center mx-1" style={{ flex: 1, maxWidth: 110 }}>
            <Text className="text-3xl">{MEDALLAS[i]}</Text>
            <Text
              className={`text-center font-bold mt-1 ${a.esMiArea ? "text-green-700" : "text-gray-800"}`}
              numberOfLines={1}
            >
              {a.nombre}
            </Text>
            {a.esMiArea ? (
              <Text className="text-green-600 text-[10px] font-semibold">Tu área</Text>
            ) : null}
            <Text className="text-gray-500 text-xs mb-1">{a.participacion}%</Text>
            <View
              className={`w-full rounded-t-xl items-center justify-center ${
                a.esMiArea ? "bg-green-600" : "bg-gray-200"
              }`}
              style={{ height: ALTO_PODIO[i] }}
            >
              <Text className={`font-bold text-lg ${a.esMiArea ? "text-white" : "text-gray-500"}`}>
                {i + 1}°
              </Text>
            </View>
            <Text className="text-gray-400 text-[10px] mt-1 text-center">
              {a.participantes} de {a.dotacion} personas
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Lo que genera la competencia: cuánto falta para pasar al de arriba, o cuánto margen hay. */
function Brecha({ ranking, miIndice }: { ranking: FilaRanking[]; miIndice: number }) {
  if (miIndice < 0 || ranking.length < 2) return null;
  const mia = ranking[miIndice];

  // La brecha va en puntos de participación: las áreas tienen dotaciones
  // distintas, así que en personas no se pueden comparar.
  let texto: string;
  if (ranking.every((a) => a.participacion === 0)) {
    texto = "El mes recién parte: el primer depósito define quién va arriba.";
  } else if (miIndice === 0) {
    const segunda = ranking[1];
    const margen = mia.participacion - segunda.participacion;
    texto =
      margen === 0
        ? `¡Van empatados con ${segunda.nombre}! El próximo depósito desempata.`
        : `🔥 Van primeros, pero ${segunda.nombre} está a ${margen} puntos de alcanzarlos.`;
  } else {
    const arriba = ranking[miIndice - 1];
    const falta = arriba.participacion - mia.participacion;
    texto =
      falta === 0
        ? `¡Van empatados con ${arriba.nombre}! El próximo depósito desempata.`
        : `⚔️ Les faltan ${falta} puntos de participación para pasar a ${arriba.nombre}.`;
  }

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
      <Text className="text-amber-900 text-sm font-medium text-center">{texto}</Text>
    </View>
  );
}

function FilaArea({ fila, posicion }: { fila: FilaRanking; posicion: number }) {
  return (
    <Tarjeta className={`mb-3 ${fila.esMiArea ? "border-2 border-green-500" : ""}`}>
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-800 font-semibold flex-1 pr-2">
          {posicion}° {fila.nombre}
          {fila.esMiArea ? " · Tu área" : ""}
        </Text>
        <Text className="text-green-700 font-bold">{fila.participacion}%</Text>
      </View>
      <Barra avance={fila.participacion} color={fila.esMiArea ? "bg-green-600" : "bg-gray-300"} />
    </Tarjeta>
  );
}
