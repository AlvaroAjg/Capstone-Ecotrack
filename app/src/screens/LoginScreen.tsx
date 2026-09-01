import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pantalla } from "../../App";

type Rol = "residente" | "conserje" | "gestor";

export default function LoginScreen({ ir }: { ir: (p: Pantalla) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("residente");

  function handleLogin() {
    if (rol === "conserje") return ir("admin");
    if (rol === "gestor") return ir("gestor");
    return ir("home");
  }

  const textoBoton =
    rol === "conserje"
      ? "Ingresar como conserje"
      : rol === "gestor"
      ? "Ingresar como gestor"
      : "Iniciar sesión";

  return (
    <LinearGradient
      colors={["#0F3D24", "#1E6B3C", "#2F9E5B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View className="absolute w-40 h-40 rounded-full bg-white/10 -top-10 -right-10" />
      <View className="absolute w-24 h-24 rounded-full bg-white/10 top-24 -left-8" />
      <View className="absolute w-16 h-16 rounded-full bg-white/10 bottom-20 right-10" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-white/15 items-center justify-center mb-4 border border-white/30">
            <Text className="text-4xl">♻️</Text>
          </View>
          <Text className="text-white text-4xl font-bold">EcoTrack</Text>
          <Text className="text-green-100 text-sm mt-1 text-center">
            Reciclaje verificado, desde tu torre hacia arriba
          </Text>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-lg">
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-5">
            <TouchableOpacity
              onPress={() => setRol("residente")}
              className={`flex-1 py-2 rounded-lg items-center ${
                rol === "residente" ? "bg-green-700" : ""
              }`}
            >
              <Text
                className={`font-medium text-xs ${
                  rol === "residente" ? "text-white" : "text-gray-500"
                }`}
              >
                🏠 Residente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRol("conserje")}
              className={`flex-1 py-2 rounded-lg items-center ${
                rol === "conserje" ? "bg-green-700" : ""
              }`}
            >
              <Text
                className={`font-medium text-xs ${
                  rol === "conserje" ? "text-white" : "text-gray-500"
                }`}
              >
                🛡️ Conserje
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRol("gestor")}
              className={`flex-1 py-2 rounded-lg items-center ${
                rol === "gestor" ? "bg-green-700" : ""
              }`}
            >
              <Text
                className={`font-medium text-xs ${
                  rol === "gestor" ? "text-white" : "text-gray-500"
                }`}
              >
                🚛 Gestor
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-400 text-xs mb-1 ml-1">Correo electrónico</Text>
          <TextInput
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor="#B0B0B0"
            value={email}
            onChangeText={setEmail}
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 mb-3"
          />

          <Text className="text-gray-400 text-xs mb-1 ml-1">Contraseña</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor="#B0B0B0"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 mb-6"
          />

          <TouchableOpacity
            onPress={handleLogin}
            className="bg-green-700 rounded-xl py-4 items-center mb-4"
            style={{
              shadowColor: "#1E6B3C",
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text className="text-white font-semibold text-base">{textoBoton}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => ir("register")}>
            <Text className="text-center text-green-700 font-medium">
              ¿No tienes cuenta? Regístrate
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center items-center mt-8">
          <Text className="text-green-100 text-xs">🌱 Papel</Text>
          <Text className="text-green-100 text-xs mx-3">🥤 Plástico</Text>
          <Text className="text-green-100 text-xs mx-3">🍾 Vidrio</Text>
          <Text className="text-green-100 text-xs">🥫 Metal</Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}