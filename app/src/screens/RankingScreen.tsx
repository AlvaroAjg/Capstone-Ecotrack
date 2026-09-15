import React from "react";
import { View, Text } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { formatKg, porcentaje } from "../lib/formato";
import { Barra, Cuerpo, Encabezado, Tarjeta, TituloEncabezado, Vacio } from "../components/ui";

const MEDALLAS = ["🥇", "🥈", "🥉"];

export default function RankingScreen({ nav }: { nav: Navegacion }) {
  const { ranking } = useEcoTrack();
  const maxKg = ranking[0]?.kg ?? 1;

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado
          titulo="Ranking semanal"
          subtitulo="Solo suman los kilos certificados en el mes en curso"
          alVolver={nav.volver}
        />
      </Encabezado>

      <View className="px-6 mt-6">
        {ranking.length === 0 ? (
          <Vacio
            emoji="🏢"
            texto="Todavía no hay torres registradas en el condominio."
          />
        ) : null}
        {ranking.map((t, i) => (
          <Tarjeta
            key={t.torreId}
            className={`mb-3 ${t.esMiTorre ? "border-2 border-green-500" : ""}`}
          >
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center flex-1 pr-2">
                <Text className="text-lg font-bold text-gray-800 w-8">
                  {i < 3 ? MEDALLAS[i] : `${i + 1}°`}
                </Text>
                <View className="flex-1">
                  <Text className="text-gray-800 font-semibold">
                    {t.nombre}
                    {t.esMiTorre ? " · Tu torre" : ""}
                  </Text>
                  <Text className="text-gray-400 text-xs">{t.condominio}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-green-700 font-bold">{formatKg(t.kg)}</Text>
                <Text className="text-gray-400 text-xs">{t.participacion}% participación</Text>
              </View>
            </View>
            <Barra
              avance={porcentaje(t.kg, maxKg)}
              color={t.esMiTorre ? "bg-green-600" : "bg-gray-300"}
            />
          </Tarjeta>
        ))}
      </View>
    </Cuerpo>
  );
}
