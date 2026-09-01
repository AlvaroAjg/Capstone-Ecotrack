import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Pantalla } from "../../App";

type Paso = "escaneando" | "material" | "listo";
type Material = "Papel/cartón" | "Plástico" | "Vidrio" | "Metal";

const materiales: { nombre: Material; emoji: string }[] = [
  { nombre: "Papel/cartón", emoji: "📄" },
  { nombre: "Plástico", emoji: "🥤" },
  { nombre: "Vidrio", emoji: "🍾" },
  { nombre: "Metal", emoji: "🥫" },
];

export default function ScanQRScreen({ ir }: { ir: (p: Pantalla) => void }) {
  const [paso, setPaso] = useState<Paso>("escaneando");
  const [material, setMaterial] = useState<Material | null>(null);

  function confirmarMaterial(m: Material) {
    setMaterial(m);
    setPaso("listo");
  }

  return (
    <View className="flex-1 bg-gray-900">
      <View className="pt-16 px-6 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => ir("home")}>
          <Text className="text-white text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-base">Registrar reciclaje</Text>
        <View style={{ width: 24 }} />
      </View>

      {paso === "escaneando" && (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-64 h-64 border-2 border-green-500 rounded-3xl items-center justify-center mb-8">
            <View className="w-56 h-56 border border-green-400/40 rounded-2xl items-center justify-center">
              <Text className="text-6xl mb-4">📷</Text>
              <ActivityIndicator color="#22C55E" />
            </View>
          </View>
          <Text className="text-white text-base font-medium mb-1">Buscando código QR...</Text>
          <Text className="text-gray-400 text-sm text-center mb-8">
            Apunta la cámara al código del contenedor
          </Text>
          <TouchableOpacity
            onPress={() => setPaso("material")}
            className="bg-green-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Simular detección de código</Text>
          </TouchableOpacity>
        </View>
      )}

      {paso === "material" && (
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
          <View className="items-center mb-6">
            <View className="bg-green-100 rounded-full px-4 py-1 mb-3">
              <Text className="text-green-700 text-xs font-medium">
                ✓ Código detectado · Contenedor T-A-03
              </Text>
            </View>
            <Text className="text-gray-800 text-xl font-bold">¿Qué material depositaste?</Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {materiales.map((m) => (
              <TouchableOpacity
                key={m.nombre}
                onPress={() => confirmarMaterial(m.nombre)}
                className="w-[48%] bg-gray-50 border border-gray-200 rounded-2xl py-6 items-center mb-4"
              >
                <Text className="text-4xl mb-2">{m.emoji}</Text>
                <Text className="text-gray-700 font-medium text-sm">{m.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {paso === "listo" && (
        <View className="flex-1 bg-white rounded-t-3xl px-6 items-center justify-center">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-5">
            <Text className="text-4xl">✅</Text>
          </View>
          <Text className="text-gray-800 text-xl font-bold mb-1">¡Registro enviado!</Text>
          <Text className="text-gray-500 text-sm text-center mb-1">
            {material} · Contenedor T-A-03
          </Text>
          <Text className="text-gray-400 text-xs text-center mb-8">
            Menos de 30 segundos. Ahora tu administrador validará el depósito.
          </Text>
          <TouchableOpacity onPress={() => ir("home")} className="bg-green-700 rounded-xl px-8 py-3">
            <Text className="text-white font-semibold">Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}