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
  const { usuario, torres, vincularTorre, cerrarSesion } = useEcoTrack();
  const esAdmin = usuario?.rol === "administrador";

  const [codigo, setCodigo] = useState("");
  const [depto, setDepto] = useState(esAdmin ? "Administración" : "");
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);

  async function handleVincular() {
    if (!codigo.trim()) {
      setError("Ingresa el código de tu torre");
      return;
    }
    if (!esAdmin && depto.trim().length < 2) {
      setError("Ingresa tu departamento (ej: 305)");
      return;
    }

    setCargando(true);
    setError(undefined);
    try {
      const etiquetaDepto = esAdmin ? "Administración" : `Depto ${depto.trim()}`;
      await vincularTorre(codigo, etiquetaDepto);
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

          {!esAdmin ? (
            <Campo
              etiqueta="Tu departamento"
              placeholder="305"
              keyboardType="number-pad"
              value={depto}
              onChangeText={setDepto}
              onFocus={() => setError(undefined)}
            />
          ) : null}

          <Boton
            titulo={cargando ? "Vinculando..." : "Vincular torre"}
            cargando={cargando}
            onPress={handleVincular}
            className="mt-3"
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
