import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Pantalla } from "../../App";

export default function RegisterScreen({
  ir,
  setNombre,
}: {
  ir: (p: Pantalla) => void;
  setNombre: (n: string) => void;
}) {
  const [nombreLocal, setNombreLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleRegistrar() {
    setNombre(nombreLocal);
    ir("joinTorre");
  }

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-green-700 mb-1">Crear cuenta</Text>
      <Text className="text-base text-gray-500 mb-8">Únete a EcoTrack</Text>

      <TextInput
        placeholder="Nombre completo"
        value={nombreLocal}
        onChangeText={setNombreLocal}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-5"
      />

      <TouchableOpacity
        onPress={handleRegistrar}
        className="bg-green-700 rounded-xl py-4 items-center mb-4"
      >
        <Text className="text-white font-semibold text-base">Registrarme</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => ir("login")}>
        <Text className="text-center text-green-700">¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}