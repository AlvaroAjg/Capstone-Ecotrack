import React, { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { Boton, Campo } from "../components/ui";

interface Errores {
  nombre?: string;
  email?: string;
  password?: string;
}

export default function RegisterScreen({ nav }: { nav: Navegacion }) {
  const { registrarCuenta } = useEcoTrack();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Errores>({});

  function handleRegistrar() {
    const nuevosErrores: Errores = {};
    if (nombre.trim().length < 3) nuevosErrores.nombre = "Ingresa tu nombre completo";
    if (!email.includes("@")) nuevosErrores.email = "Ingresa un correo válido";
    if (password.length < 6) nuevosErrores.password = "Mínimo 6 caracteres";

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    registrarCuenta(nombre.trim());
    nav.ir("joinTorre");
  }

  const limpiar = (campo: keyof Errores) => () =>
    setErrores((e) => ({ ...e, [campo]: undefined }));

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

          <Text className="text-3xl font-bold text-green-700 mb-1">Crear cuenta</Text>
          <Text className="text-base text-gray-500 mb-8">
            Paso 1 de 2 · datos personales
          </Text>

          <Campo
            etiqueta="Nombre completo"
            placeholder="Nombre y apellido"
            value={nombre}
            onChangeText={setNombre}
            onFocus={limpiar("nombre")}
            error={errores.nombre}
          />
          <Campo
            etiqueta="Correo electrónico"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            onFocus={limpiar("email")}
            error={errores.email}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Campo
            etiqueta="Contraseña"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={limpiar("password")}
            error={errores.password}
          />

          <Boton titulo="Continuar" onPress={handleRegistrar} className="mt-3 mb-4" />

          <TouchableOpacity onPress={() => nav.ir("login")} accessibilityRole="button">
            <Text className="text-center text-green-700">¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
