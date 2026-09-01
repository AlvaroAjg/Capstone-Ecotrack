import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Pantalla } from "../../App";

export default function JoinTorreScreen({
  ir,
  setTorre,
}: {
  ir: (p: Pantalla) => void;
  setTorre: (t: string) => void;
}) {
  const [codigo, setCodigo] = useState("");

  function handleVincular() {
    setTorre(codigo || "Torre A");
    ir("home");
  }

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-green-700 mb-1">Vincula tu torre</Text>
      <Text className="text-base text-gray-500 mb-8">
        Ingresa el código que te entregó tu administrador.
      </Text>

      <TextInput
        placeholder="Código de invitación"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={setCodigo}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-5 text-center text-lg tracking-widest"
      />

      <TouchableOpacity
        onPress={handleVincular}
        className="bg-green-700 rounded-xl py-4 items-center"
      >
        <Text className="text-white font-semibold text-base">Vincular torre</Text>
      </TouchableOpacity>
    </View>
  );
}