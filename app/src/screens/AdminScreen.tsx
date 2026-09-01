import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Pantalla } from "../../App";

type TorreId = "A" | "B";

interface Pendiente {
  nombre: string;
  depto: string;
  material: string;
  kg: string;
  hace: string;
}

interface DatosTorre {
  residentes: number;
  kgMes: string;
  participacion: string;
  pendientes: Pendiente[];
  metaKg: number;
  kgActual: number;
}

const datosPorTorre: { A: DatosTorre; B: DatosTorre } = {
  A: {
    residentes: 24,
    kgMes: "136 kg",
    participacion: "62%",
    pendientes: [
      { nombre: "Matías Bustamante", depto: "Depto 402", material: "Plástico", kg: "2.1 kg", hace: "hace 12 min" },
      { nombre: "Vicente Torres", depto: "Depto 108", material: "Vidrio", kg: "1.4 kg", hace: "hace 34 min" },
      { nombre: "Álvaro Jaña", depto: "Depto 305", material: "Papel/cartón", kg: "3.0 kg", hace: "hace 1 h" },
    ],
    metaKg: 200,
    kgActual: 136,
  },
  B: {
    residentes: 19,
    kgMes: "94 kg",
    participacion: "48%",
    pendientes: [
      { nombre: "Camila Rojas", depto: "Depto 701", material: "Metal", kg: "0.8 kg", hace: "hace 8 min" },
      { nombre: "Pedro Soto", depto: "Depto 203", material: "Plástico", kg: "1.6 kg", hace: "hace 50 min" },
    ],
    metaKg: 150,
    kgActual: 94,
  },
};

export default function AdminScreen({ ir }: { ir: (p: Pantalla) => void }) {
  const [torre, setTorre] = useState<TorreId>("A");
  const datos = datosPorTorre[torre];
  const porcentaje = Math.round((datos.kgActual / datos.metaKg) * 100);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-gray-900 pt-16 pb-8 px-6 rounded-b-3xl">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-300 text-sm">Panel de administrador</Text>
            <Text className="text-white text-2xl font-bold mt-1">Torre {torre}</Text>
            <Text className="text-gray-400 text-sm mt-1">Condominio Piloto</Text>
          </View>
          <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">C</Text>
          </View>
        </View>

        <View className="flex-row bg-gray-800 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setTorre("A")}
            className={`flex-1 py-2 rounded-lg items-center ${torre === "A" ? "bg-white" : ""}`}
          >
            <Text className={`font-medium ${torre === "A" ? "text-gray-900" : "text-gray-400"}`}>
              Torre A
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTorre("B")}
            className={`flex-1 py-2 rounded-lg items-center ${torre === "B" ? "bg-white" : ""}`}
          >
            <Text className={`font-medium ${torre === "B" ? "text-gray-900" : "text-gray-400"}`}>
              Torre B
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 -mt-6">
        <View className="bg-white rounded-2xl p-5 shadow-sm flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">{datos.residentes}</Text>
            <Text className="text-xs text-gray-500 mt-1">Residentes activos</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">{datos.kgMes}</Text>
            <Text className="text-xs text-gray-500 mt-1">Reciclado este mes</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">{datos.participacion}</Text>
            <Text className="text-xs text-gray-500 mt-1">Participación</Text>
          </View>
        </View>
      </View>

      <View className="px-6 mt-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-800 font-semibold">Validaciones pendientes</Text>
          <View className="bg-yellow-100 rounded-full px-3 py-1">
            <Text className="text-yellow-700 text-xs font-medium">
              {datos.pendientes.length} nuevas
            </Text>
          </View>
        </View>

        {datos.pendientes.map((p, i) => (
          <View key={i} className="bg-white rounded-2xl p-4 shadow-sm mb-3">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-gray-800 font-medium">{p.nombre}</Text>
                <Text className="text-gray-400 text-xs mt-1">
                  {p.depto} · {p.material} · {p.kg}
                </Text>
              </View>
              <Text className="text-gray-400 text-xs">{p.hace}</Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity className="flex-1 bg-green-700 rounded-xl py-2 items-center mr-2">
                <Text className="text-white font-medium text-sm">Validar</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 border border-red-300 rounded-xl py-2 items-center">
                <Text className="text-red-600 font-medium text-sm">Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View className="px-6 mt-6">
        <Text className="text-gray-800 font-semibold mb-3">Misión de la torre</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-medium">
              {datos.metaKg} kg reciclados este mes
            </Text>
            <Text className="text-green-700 font-semibold text-sm">{porcentaje}%</Text>
          </View>
          <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <View
              className="h-2 bg-green-600 rounded-full"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </View>
          <TouchableOpacity className="border border-gray-300 rounded-xl py-2 items-center">
            <Text className="text-gray-700 font-medium text-sm">Editar incentivo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 mt-6 mb-10">
        <TouchableOpacity className="bg-gray-900 rounded-2xl py-4 items-center flex-row justify-center mb-3">
          <Text className="text-xl mr-2">📊</Text>
          <Text className="text-white font-semibold text-base">Exportar reporte mensual (PDF)</Text>
        </TouchableOpacity>

        

        <TouchableOpacity
          onPress={() => ir("login")}
          className="border border-gray-300 rounded-xl py-3 items-center"
        >
          <Text className="text-gray-600 font-medium">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}