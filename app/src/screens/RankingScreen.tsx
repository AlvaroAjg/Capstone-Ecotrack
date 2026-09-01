import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Pantalla } from "../../App";

interface TorreRanking {
  nombre: string;
  condominio: string;
  kg: number;
  participacion: string;
}

const torres: TorreRanking[] = [
  { nombre: "Torre C", condominio: "Condominio Los Aromos", kg: 214, participacion: "81%" },
  { nombre: "Torre A", condominio: "Condominio Piloto", kg: 136, participacion: "62%" },
  { nombre: "Torre D", condominio: "Condominio Los Aromos", kg: 121, participacion: "58%" },
  { nombre: "Torre B", condominio: "Condominio Piloto", kg: 94, participacion: "48%" },
  { nombre: "Torre E", condominio: "Villa Sur", kg: 67, participacion: "40%" },
];

const medallas = ["🥇", "🥈", "🥉"];

export default function RankingScreen({ ir }: { ir: (p: Pantalla) => void }) {
  const maxKg = torres[0].kg;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-green-700 pt-16 pb-8 px-6 rounded-b-3xl">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={() => ir("home")} className="mr-3">
            <Text className="text-white text-2xl">←</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Ranking semanal</Text>
        </View>
        <Text className="text-green-100 text-sm">Kilos reciclados esta semana · todas las torres</Text>
      </View>

      <View className="px-6 mt-6 mb-10">
        {torres.map((t, i) => {
          const esTuTorre = t.nombre === "Torre A";
          const ancho = Math.round((t.kg / maxKg) * 100);
          return (
            <View
              key={t.nombre}
              className={`bg-white rounded-2xl p-4 shadow-sm mb-3 ${
                esTuTorre ? "border-2 border-green-500" : ""
              }`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                  <Text className="text-lg font-bold text-gray-800 w-8">
                    {i < 3 ? medallas[i] : `${i + 1}°`}
                  </Text>
                  <View>
                    <Text className="text-gray-800 font-semibold">
                      {t.nombre} {esTuTorre ? "· Tu torre" : ""}
                    </Text>
                    <Text className="text-gray-400 text-xs">{t.condominio}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-green-700 font-bold">{t.kg} kg</Text>
                  <Text className="text-gray-400 text-xs">{t.participacion} participación</Text>
                </View>
              </View>
              <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className={`h-2 rounded-full ${esTuTorre ? "bg-green-600" : "bg-gray-300"}`}
                  style={{ width: `${ancho}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}