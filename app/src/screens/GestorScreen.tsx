import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Pantalla } from "../../App";

interface Retiro {
  id: string;
  nombre: string;
  torre: string;
  depto: string;
  material: string;
  kg: string;
  validadoHace: string;
}

const retirosIniciales: Retiro[] = [
  { id: "1", nombre: "Matías Bustamante", torre: "Torre A", depto: "Depto 402", material: "Plástico", kg: "2.1 kg", validadoHace: "hace 30 min" },
  { id: "2", nombre: "Vicente Torres", torre: "Torre A", depto: "Depto 108", material: "Vidrio", kg: "1.4 kg", validadoHace: "hace 1 h" },
  { id: "3", nombre: "Camila Rojas", torre: "Torre B", depto: "Depto 701", material: "Metal", kg: "0.8 kg", validadoHace: "hace 2 h" },
];

export default function GestorScreen({ ir }: { ir: (p: Pantalla) => void }) {
  const [retiros, setRetiros] = useState(retirosIniciales);
  const [procesados, setProcesados] = useState(0);

  function confirmarRetiro(id: string) {
    setRetiros((prev) => prev.filter((r) => r.id !== id));
    setProcesados((p) => p + 1);
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-gray-900 pt-16 pb-8 px-6 rounded-b-3xl">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={() => ir("admin")} className="mr-3">
            <Text className="text-white text-2xl">←</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-gray-300 text-sm">Panel de gestor</Text>
            <Text className="text-white text-xl font-bold">Retiros pendientes</Text>
          </View>
        </View>
        <Text className="text-gray-400 text-sm mt-1">Condominio Piloto · Torres A y B</Text>
      </View>

      <View className="px-6 -mt-6">
        <View className="bg-white rounded-2xl p-5 shadow-sm flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">{retiros.length}</Text>
            <Text className="text-xs text-gray-500 mt-1">Por retirar</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">{procesados}</Text>
            <Text className="text-xs text-gray-500 mt-1">Procesados hoy</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">2</Text>
            <Text className="text-xs text-gray-500 mt-1">Torres a cargo</Text>
          </View>
        </View>
      </View>

      <View className="px-6 mt-6 mb-10">
        {retiros.length === 0 && (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Text className="text-4xl mb-3">🎉</Text>
            <Text className="text-gray-700 font-medium">No quedan retiros pendientes</Text>
          </View>
        )}

        {retiros.map((r) => (
          <View key={r.id} className="bg-white rounded-2xl p-4 shadow-sm mb-3">
            <View className="mb-3">
              <Text className="text-gray-800 font-medium">{r.nombre}</Text>
              <Text className="text-gray-400 text-xs mt-1">
                {r.torre} · {r.depto} · {r.material} · {r.kg}
              </Text>
              <Text className="text-blue-600 text-xs mt-1">
                Validado por administrador · {r.validadoHace}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmarRetiro(r.id)}
              className="bg-green-700 rounded-xl py-2 items-center"
            >
              <Text className="text-white font-medium text-sm">
                Confirmar retiro y procesamiento
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => ir("login")}
          className="border border-gray-300 rounded-xl py-3 items-center mt-4"
        >
          <Text className="text-gray-600 font-medium">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}