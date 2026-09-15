import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEcoTrack } from "../state/EcoTrack";
import { slotDemo } from "../lib/firebase";
import { CORREOS_DEMO, CUENTAS_DEMO, PASSWORD_DEMO } from "../lib/demo";
import { mensajeError } from "../services/auth";
import { Aviso, Boton, Campo } from "../components/ui";

export default function LoginScreen({ alRegistrarse }: { alRegistrarse: () => void }) {
  const { iniciarSesion, prepararDemo } = useEcoTrack();
  // En la pared de demostración cada panel llega con su correo prellenado.
  const [email, setEmail] = useState(slotDemo ? CORREOS_DEMO[slotDemo] ?? "" : "");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [sembrando, setSembrando] = useState(false);
  const [avisoSemilla, setAvisoSemilla] = useState<string | null>(null);

  async function handleLogin() {
    const nuevosErrores: typeof errores = {};
    if (!email.includes("@")) nuevosErrores.email = "Ingresa un correo válido";
    if (password.length < 6) nuevosErrores.password = "Mínimo 6 caracteres";

    setErrores(nuevosErrores);
    setErrorGeneral(null);
    if (Object.keys(nuevosErrores).length > 0) return;

    setCargando(true);
    try {
      await iniciarSesion(email, password);
      // La navegación la resuelve App.tsx al detectar la sesión activa.
    } catch (error) {
      setErrorGeneral(mensajeError(error));
    } finally {
      setCargando(false);
    }
  }

  // Utilidad de desarrollo: deja el proyecto listo para demostrar en un toque.
  // Crea las torres y las tres cuentas. Solo hace falta una vez por proyecto.
  async function handlePrepararDemo() {
    setSembrando(true);
    setAvisoSemilla(null);
    try {
      const r = await prepararDemo(setAvisoSemilla);
      const partes = [`${r.torres} torres`];
      if (r.cuentasCreadas > 0) partes.push(`${r.cuentasCreadas} cuentas nuevas`);
      if (r.cuentasExistentes > 0) partes.push(`${r.cuentasExistentes} ya existían`);
      setAvisoSemilla(`Listo: ${partes.join(", ")}. Contraseña: ${PASSWORD_DEMO}`);
      setEmail(CORREOS_DEMO.residente ?? "");
      setPassword(PASSWORD_DEMO);
    } catch (error) {
      setAvisoSemilla(mensajeError(error));
    } finally {
      setSembrando(false);
    }
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
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
            <Text className="text-gray-800 text-lg font-bold mb-1">Iniciar sesión</Text>
            <Text className="text-gray-500 text-xs mb-5">
              Tu rol queda definido por tu cuenta, no por esta pantalla.
            </Text>

            {slotDemo ? (
              <View className="bg-gray-100 rounded-lg px-3 py-2 mb-4">
                <Text className="text-gray-500 text-[11px]">
                  Panel de demostración: {slotDemo}
                </Text>
              </View>
            ) : null}

            {errorGeneral ? (
              <View className="mb-4">
                <Aviso texto={errorGeneral} />
              </View>
            ) : null}

            <Campo
              etiqueta="Correo electrónico"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setErrores((e) => ({ ...e, email: undefined }))}
              error={errores.email}
              autoCapitalize="none"
              autoCorrect={false}
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

            <Boton
              titulo={cargando ? "Ingresando..." : "Iniciar sesión"}
              cargando={cargando}
              onPress={handleLogin}
              className="mt-3 mb-4"
            />

            <TouchableOpacity onPress={alRegistrarse} accessibilityRole="button">
              <Text className="text-center text-green-700 font-medium">
                ¿No tienes cuenta? Regístrate
              </Text>
            </TouchableOpacity>
          </View>

          {__DEV__ ? (
            <View className="mt-6 bg-white/10 border border-white/20 rounded-2xl p-4">
              <Text className="text-green-100 text-xs mb-2">
                Configuración inicial (solo desarrollo)
              </Text>
              <TouchableOpacity
                onPress={handlePrepararDemo}
                disabled={sembrando}
                accessibilityRole="button"
                className={`bg-white/20 rounded-xl py-3 items-center ${
                  sembrando ? "opacity-60" : ""
                }`}
              >
                <Text className="text-white text-xs font-medium">
                  {sembrando ? "Preparando..." : "Preparar todo para la demostración"}
                </Text>
              </TouchableOpacity>

              <Text className="text-green-200 text-[10px] mt-2 leading-4">
                Crea las 2 torres y las 3 cuentas ({CUENTAS_DEMO.map((c) => c.rol).join(", ")}),
                ya vinculadas a su torre. Solo hace falta una vez.
              </Text>

              {avisoSemilla ? (
                <Text className="text-white text-[11px] mt-2 text-center font-medium">
                  {avisoSemilla}
                </Text>
              ) : null}
            </View>
          ) : null}

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
