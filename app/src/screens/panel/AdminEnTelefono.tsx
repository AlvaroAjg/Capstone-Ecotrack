import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEcoTrack } from "../../state/EcoTrack";
import { Boton } from "../../components/ui";

/**
 * Lo que ve el administrador en una pantalla angosta o en la app nativa. El
 * panel tiene tablas y formularios que no caben en un teléfono, así que en vez
 * de una versión a medias se le pide abrirlo en el computador.
 */
export default function AdminEnTelefono() {
  const { usuario, miPlanta, cerrarSesion } = useEcoTrack();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-gray-900 items-center justify-center mb-4">
            <Text className="text-3xl">💻</Text>
          </View>
          <Text className="text-gray-500 text-sm">
            {usuario?.nombre ?? "Administrador"} · {miPlanta?.nombre ?? "Sin planta"}
          </Text>
        </View>

        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Abre el panel en el computador
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8 leading-6">
          El panel del administrador está hecho para una pantalla grande. Entra a RecyTrack
          desde el navegador del computador con esta misma cuenta.
        </Text>

        <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => cerrarSesion()} />
      </View>
    </SafeAreaView>
  );
}
