import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Pantalla } from "../../App";

export default function HomeScreen({
  ir,
  nombre,
  torre,
}: {
  ir: (p: Pantalla) => void;
  nombre: string;
  torre: string;
}) {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-green-700 pt-16 pb-8 px-6 rounded-b-3xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-green-100 text-sm">Bienvenido de vuelta</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {nombre || "Residente"}
            </Text>
            <Text className="text-green-200 text-sm mt-1">
              {torre || "Torre A"} · Condominio Piloto
            </Text>
          </View>
          <View className="w-12 h-12 bg-green-600 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {(nombre || "R").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 -mt-6">
        <View className="bg-white rounded-2xl p-5 shadow-sm flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-700">18.4 kg</Text>
            <Text className="text-xs text-gray-500 mt-1">Reciclado este mes</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-700">4°</Text>
            <Text className="text-xs text-gray-500 mt-1">Ranking semanal</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-700">3</Text>
            <Text className="text-xs text-gray-500 mt-1">Certificados</Text>
          </View>
        </View>
      </View>

      <View className="px-6 mt-6">
        <TouchableOpacity
  onPress={() => ir("escanear")}
  className="bg-green-700 rounded-2xl py-5 items-center flex-row justify-center"
>
          <Text className="text-2xl mr-2">📷</Text>
          <Text className="text-white font-semibold text-base">
            Escanear código QR
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-6">
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-semibold">Misión de la torre</Text>
            <Text className="text-green-700 font-semibold text-sm">68%</Text>
          </View>
          <Text className="text-gray-500 text-sm mb-3">
            Alcanzar 200 kg reciclados como torre este mes
          </Text>
          <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <View className="h-2 bg-green-600 rounded-full" style={{ width: "68%" }} />
          </View>
          <Text className="text-gray-400 text-xs mt-2">136 kg / 200 kg · 62% de departamentos participando</Text>
        </View>
      </View>

      

      <View className="px-6 mt-6">
        <Text className="text-gray-800 font-semibold mb-3">Actividad reciente</Text>

        <View className="bg-white rounded-2xl p-4 shadow-sm mb-3 flex-row items-center">
          <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
            <Text>📄</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-800 font-medium">Certificado generado</Text>
            <Text className="text-gray-400 text-xs mt-1">Plástico · 2.1 kg · hace 2 días</Text>
          </View>
          <View className="bg-green-100 rounded-full px-3 py-1">
            <Text className="text-green-700 text-xs font-medium">Completo</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm mb-3 flex-row items-center">
          <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
            <Text>⏳</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-800 font-medium">Esperando al gestor</Text>
            <Text className="text-gray-400 text-xs mt-1">Vidrio · 1.4 kg · hace 5 horas</Text>
          </View>
          <View className="bg-yellow-100 rounded-full px-3 py-1">
            <Text className="text-yellow-700 text-xs font-medium">En proceso</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm mb-3 flex-row items-center">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Text>✅</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-800 font-medium">Validado por administrador</Text>
            <Text className="text-gray-400 text-xs mt-1">Papel/cartón · 3.0 kg · ayer</Text>
          </View>
          <View className="bg-blue-100 rounded-full px-3 py-1">
            <Text className="text-blue-700 text-xs font-medium">Validado</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
      onPress={() => ir("ranking")}
      className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm ml-2"
    >
      <Text className="text-2xl mb-1">🏆</Text>
      <Text className="text-gray-700 text-xs font-medium">Ranking</Text>
    </TouchableOpacity>

      <View className="px-6 mt-4 mb-10">
        <TouchableOpacity
          onPress={() => ir("login")}
          className="border border-red-300 rounded-xl py-3 items-center"
        >
          <Text className="text-red-600 font-medium">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}