import React from "react";
import { Text, View } from "react-native";

/**
 * Versión para el teléfono nativo (Expo Go): el escáner por cámara existe solo
 * en la web instalada (ver EscanerQR.web.tsx). Aquí se cae al ingreso manual
 * del código del contenedor.
 */
export default function EscanerQR(_props: { alLeer: (texto: string) => void }) {
  return (
    <View className="w-64 h-64 rounded-3xl bg-gray-800 items-center justify-center px-6">
      <Text className="text-gray-300 text-xs text-center">
        El escáner con cámara está disponible en la versión web instalada. Aquí escribe el
        código del contenedor.
      </Text>
    </View>
  );
}
