import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEcoTrack } from "../state/EcoTrack";
import { mensajeError } from "../services/auth";
import { Aviso, Boton, Campo } from "../components/ui";

export default function JoinTorreScreen() {
  const { torres, vincularTorre, vincularComoAdministrador, cerrarSesion } = useEcoTrack();

  // Por defecto se vincula como residente. El toggle revela el segundo código
  // que la regla de Firestore exige para promoverse a administrador de esa
  // torre: sin el código correcto, la escritura simplemente falla.
  const [comoAdmin, setComoAdmin] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoAdmin, setCodigoAdmin] = useState("");
  const [depto, setDepto] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);

  async function handleVincular() {
    if (!codigo.trim()) {
      setError("Ingresa el código de tu torre");
      return;
    }
    if (comoAdmin) {
      if (!codigoAdmin.trim()) {
        setError("Ingresa el código de administrador");
        return;
      }
    } else if (depto.trim().length < 2) {
      setError("Ingresa tu departamento (ej: 305)");
      return;
    }

    setCargando(true);
    setError(undefined);
    try {
      if (comoAdmin) {
        await vincularComoAdministrador(codigo, codigoAdmin.trim());
      } else {
        await vincularTorre(codigo, `Depto ${depto.trim()}`);
      }
      // App.tsx detecta el perfil actualizado y entra al panel correspondiente.
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-green-100 items-center justify-center mb-4">
              <Text className="text-3xl">🏢</Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-green-700 mb-1">Vincula tu torre</Text>
          <Text className="text-base text-gray-500 mb-6">
            Paso 2 de 2 · ingresa el código que te entregó tu administrador. Solo puedes
            pertenecer a una torre a la vez.
          </Text>

          {error ? (
            <View className="mb-4">
              <Aviso texto={error} />
            </View>
          ) : null}

          <Campo
            etiqueta="Código de invitación"
            placeholder="ECO-TORRE-A"
            autoCapitalize="characters"
            autoCorrect={false}
            value={codigo}
            onChangeText={setCodigo}
            onFocus={() => setError(undefined)}
            className="text-center text-lg tracking-widest"
          />

          {!comoAdmin ? (
            <Campo
              etiqueta="Tu departamento"
              placeholder="305"
              keyboardType="number-pad"
              value={depto}
              onChangeText={setDepto}
              onFocus={() => setError(undefined)}
            />
          ) : (
            <Campo
              etiqueta="Código de administrador"
              placeholder="Te lo entrega el equipo de EcoTrack"
              autoCapitalize="characters"
              autoCorrect={false}
              value={codigoAdmin}
              onChangeText={setCodigoAdmin}
              onFocus={() => setError(undefined)}
              className="text-center tracking-widest"
            />
          )}

          <TouchableOpacity
            onPress={() => {
              setComoAdmin((v) => !v);
              setError(undefined);
            }}
            accessibilityRole="button"
            className="mb-3"
          >
            <Text className="text-center text-gray-500 text-xs">
              {comoAdmin
                ? "No soy administrador, soy residente"
                : "¿Eres administrador de esta torre? Toca aquí"}
            </Text>
          </TouchableOpacity>

          <Boton
            titulo={cargando ? "Vinculando..." : "Vincular torre"}
            cargando={cargando}
            onPress={handleVincular}
            className="mt-1"
          />

          <View className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <Text className="text-gray-500 text-xs mb-2">
              Torres registradas en el condominio:
            </Text>
            {torres.length === 0 ? (
              <Text className="text-gray-400 text-xs">
                Todavía no hay torres creadas en Firestore. Usa el botón de
                configuración inicial en la pantalla de login.
              </Text>
            ) : (
              <View className="flex-row flex-wrap">
                {torres.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      setCodigo(t.codigoInvitacion);
                      setError(undefined);
                    }}
                    accessibilityRole="button"
                    className="bg-white border border-gray-300 rounded-lg px-3 py-1 mr-2 mb-1"
                  >
                    <Text className="text-gray-700 text-xs font-medium">
                      {t.codigoInvitacion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => cerrarSesion()}
            accessibilityRole="button"
            className="mt-6"
          >
            <Text className="text-center text-gray-500 text-sm">
              Cerrar sesión y usar otra cuenta
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
