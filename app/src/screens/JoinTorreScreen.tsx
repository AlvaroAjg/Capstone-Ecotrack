import React, { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Navegacion } from "../../App";
import { CODIGOS_TORRE, useEcoTrack } from "../state/EcoTrack";
import { Boton, Campo } from "../components/ui";

export default function JoinTorreScreen({ nav }: { nav: Navegacion }) {
  const { vincularTorre } = useEcoTrack();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleVincular() {
    if (!codigo.trim()) {
      setError("Ingresa el código de tu torre");
      return;
    }

    const torre = vincularTorre(codigo);
    if (!torre) {
      setError("Código no válido. Verifícalo con tu administrador.");
      return;
    }

    nav.ir("home");
  }

  const codigosDisponibles = Object.keys(CODIGOS_TORRE);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={nav.volver}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="absolute top-4 left-0"
          >
            <Text className="text-green-700 text-2xl">←</Text>
          </TouchableOpacity>

          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-green-100 items-center justify-center mb-4">
              <Text className="text-3xl">🏢</Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-green-700 mb-1">Vincula tu torre</Text>
          <Text className="text-base text-gray-500 mb-8">
            Paso 2 de 2 · ingresa el código que te entregó tu administrador. Solo puedes
            pertenecer a una torre a la vez.
          </Text>

          <Campo
            etiqueta="Código de invitación"
            placeholder="ECO-TORRE-A"
            autoCapitalize="characters"
            autoCorrect={false}
            value={codigo}
            onChangeText={setCodigo}
            onFocus={() => setError(undefined)}
            error={error}
            className="text-center text-lg tracking-widest"
          />

          <Boton titulo="Vincular torre" onPress={handleVincular} className="mt-3" />

          <View className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <Text className="text-gray-500 text-xs mb-2">
              Códigos activos en el condominio piloto:
            </Text>
            <View className="flex-row flex-wrap">
              {codigosDisponibles.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    setCodigo(c);
                    setError(undefined);
                  }}
                  accessibilityRole="button"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-1 mr-2 mb-1"
                >
                  <Text className="text-gray-700 text-xs font-medium">{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
