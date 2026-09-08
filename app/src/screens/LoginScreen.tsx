import React, { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Navegacion } from "../../App";
import { Rol, useEcoTrack } from "../state/EcoTrack";
import { Boton, Campo, Segmentado } from "../components/ui";

const DESTINO_POR_ROL: Record<Rol, "home" | "admin" | "gestor"> = {
  residente: "home",
  administrador: "admin",
  gestor: "gestor",
};

const TEXTO_BOTON: Record<Rol, string> = {
  residente: "Iniciar sesión",
  administrador: "Ingresar como administrador",
  gestor: "Ingresar como gestor",
};

const CORREO_DEMO: Record<Rol, string> = {
  residente: "alvaro.jana@ecotrack.cl",
  administrador: "carla.mendez@ecotrack.cl",
  gestor: "contacto@reciclasur.cl",
};

export default function LoginScreen({ nav }: { nav: Navegacion }) {
  const { iniciarSesion } = useEcoTrack();
  const [rol, setRol] = useState<Rol>("residente");
  const [email, setEmail] = useState(CORREO_DEMO.residente);
  const [password, setPassword] = useState("ecotrack2026");
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});

  function cambiarRol(nuevo: Rol) {
    setRol(nuevo);
    setEmail(CORREO_DEMO[nuevo]);
    setErrores({});
  }

  function handleLogin() {
    const nuevosErrores: typeof errores = {};
    if (!email.includes("@")) nuevosErrores.email = "Ingresa un correo válido";
    if (password.length < 6) nuevosErrores.password = "Mínimo 6 caracteres";

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    iniciarSesion(rol);
    nav.ir(DESTINO_POR_ROL[rol]);
  }

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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
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
            <Text className="text-gray-500 text-xs mb-2 ml-1">Ingresar como</Text>
            <View className="mb-5">
              <Segmentado
                valor={rol}
                alCambiar={cambiarRol}
                opciones={[
                  { valor: "residente", etiqueta: "🏠 Residente" },
                  { valor: "administrador", etiqueta: "🛡️ Admin." },
                  { valor: "gestor", etiqueta: "🚛 Gestor" },
                ]}
              />
            </View>

            <Campo
              etiqueta="Correo electrónico"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setErrores((e) => ({ ...e, email: undefined }))}
              error={errores.email}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Campo
              etiqueta="Contraseña"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setErrores((e) => ({ ...e, password: undefined }))}
              error={errores.password}
            />

            <Boton titulo={TEXTO_BOTON[rol]} onPress={handleLogin} className="mt-3 mb-4" />

            <TouchableOpacity onPress={() => nav.ir("register")} accessibilityRole="button">
              <Text className="text-center text-green-700 font-medium">
                ¿No tienes cuenta? Regístrate
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center items-center mt-8">
            <Text className="text-green-100 text-xs">📄 Papel</Text>
            <Text className="text-green-100 text-xs mx-3">🥤 Plástico</Text>
            <Text className="text-green-100 text-xs mx-3">🍾 Vidrio</Text>
            <Text className="text-green-100 text-xs">🥫 Metal</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
