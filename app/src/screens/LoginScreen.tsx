import React, { useEffect, useState } from "react";
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
import {
  accesoExternoDisponible,
  errorDeRedireccionExterna,
  mensajeError,
  NOMBRE_PROVEEDOR,
  type ProveedorExterno,
} from "../services/auth";
import { Aviso, Boton, Campo } from "../components/ui";

/** Logo de cada proveedor, dibujado con vistas para no depender de imágenes. */
function LogoProveedor({ proveedor }: { proveedor: ProveedorExterno }) {
  if (proveedor === "google") {
    return (
      <Text className="text-lg font-bold mr-2" style={{ color: "#4285F4" }}>
        G
      </Text>
    );
  }
  const cuadro = (color: string) => (
    <View style={{ width: 8, height: 8, backgroundColor: color }} />
  );
  // Mismo alto que la "G" de Google, para que los dos botones midan lo mismo.
  return (
    <View className="mr-2 justify-center" style={{ height: 28 }}>
      <View style={{ width: 18, height: 18, gap: 2 }}>
        <View className="flex-row" style={{ gap: 2 }}>
          {cuadro("#F25022")}
          {cuadro("#7FBA00")}
        </View>
        <View className="flex-row" style={{ gap: 2 }}>
          {cuadro("#00A4EF")}
          {cuadro("#FFB900")}
        </View>
      </View>
    </View>
  );
}

export default function LoginScreen({ alRegistrarse }: { alRegistrarse: () => void }) {
  const { iniciarSesion, iniciarSesionConProveedor } = useEcoTrack();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [conectando, setConectando] = useState<ProveedorExterno | null>(null);

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

  // Si se volvió de Google o Microsoft por redirección (app instalada) y algo
  // falló, se muestra aquí; si salió bien, App.tsx ya detectó la sesión.
  useEffect(() => {
    let vigente = true;
    errorDeRedireccionExterna().then((error) => {
      if (vigente && error) setErrorGeneral(mensajeError(error));
    });
    return () => {
      vigente = false;
    };
  }, []);

  async function handleProveedor(proveedor: ProveedorExterno) {
    setErrorGeneral(null);
    setConectando(proveedor);
    try {
      await iniciarSesionConProveedor(proveedor);
    } catch (error) {
      setErrorGeneral(mensajeError(error));
    } finally {
      setConectando(null);
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
            <Text className="text-white text-4xl font-bold">RecyTrack</Text>
            <Text className="text-green-100 text-sm mt-1 text-center">
              Reciclaje verificado, desde tu torre hacia arriba
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <Text className="text-gray-800 text-lg font-bold mb-1">Iniciar sesión</Text>
            <Text className="text-gray-500 text-xs mb-5">
              Tu rol queda definido por tu cuenta, no por esta pantalla.
            </Text>

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

            {accesoExternoDisponible ? (
              <>
                <View className="flex-row items-center mb-4">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="text-gray-400 text-xs mx-3">o</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>
                {(["microsoft", "google"] as const).map((proveedor) => {
                  const nombre = NOMBRE_PROVEEDOR[proveedor];
                  const esteConectando = conectando === proveedor;
                  return (
                    <TouchableOpacity
                      key={proveedor}
                      onPress={() => handleProveedor(proveedor)}
                      disabled={conectando !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Continuar con ${nombre}`}
                      className={`flex-row items-center justify-center border border-gray-300 rounded-xl py-3 mb-2 ${
                        conectando !== null ? "opacity-60" : ""
                      }`}
                    >
                      <LogoProveedor proveedor={proveedor} />
                      <Text className="text-gray-700 font-medium">
                        {esteConectando ? `Conectando con ${nombre}...` : `Continuar con ${nombre}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text className="text-gray-400 text-[11px] text-center mb-4">
                  Si es tu primera vez, se crea tu cuenta de residente.
                </Text>
              </>
            ) : null}

            <TouchableOpacity onPress={alRegistrarse} accessibilityRole="button">
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
