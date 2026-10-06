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
import { useEcoTrack, type Area } from "../state/EcoTrack";
import { mensajeError } from "../services/auth";
import { Aviso, Boton, Campo } from "../components/ui";

export default function UnirseAreaScreen() {
  const { plantas, buscarArea, unirseAArea, promoverAAdministrador, cerrarSesion } = useEcoTrack();

  // Por defecto se une a un área como colaborador. El toggle revela el código
  // que la regla de Firestore exige para promoverse a administrador de una
  // planta: sin el código correcto, la escritura simplemente falla.
  const [comoAdmin, setComoAdmin] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoAdmin, setCodigoAdmin] = useState("");
  const [plantaElegida, setPlantaElegida] = useState<string | null>(null);
  // El área del código ingresado. Se muestra su nombre antes de unirse, para
  // que un código mal tipeado no deje a la persona en el área de otro: el
  // cambio de área después solo lo hace el administrador.
  const [areaEncontrada, setAreaEncontrada] = useState<Area | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);

  // En el piloto hay una sola planta: se elige sola.
  const plantaId = plantaElegida ?? (plantas.length === 1 ? plantas[0].id : null);

  async function handleVincular() {
    if (comoAdmin) {
      if (!plantaId) {
        setError("Elige tu planta");
        return;
      }
      if (!codigoAdmin.trim()) {
        setError("Ingresa el código de administrador");
        return;
      }
    } else if (!codigo.trim()) {
      setError("Ingresa el código de tu área");
      return;
    }

    setCargando(true);
    setError(undefined);
    try {
      if (comoAdmin) {
        await promoverAAdministrador(plantaId!, codigoAdmin.trim());
      } else if (areaEncontrada) {
        await unirseAArea(areaEncontrada);
      } else {
        const area = await buscarArea(codigo);
        if (!area) throw new Error("Código no válido. Pídeselo al administrador.");
        setAreaEncontrada(area);
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
              <Text className="text-3xl">🏭</Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-green-700 mb-1">Únete a tu área</Text>
          <Text className="text-base text-gray-500 mb-6">
            Paso 2 de 2 · ingresa el código de tu área que te entregó el administrador.
            Si después cambias de área, el cambio lo hace el administrador.
          </Text>

          {error ? (
            <View className="mb-4">
              <Aviso texto={error} />
            </View>
          ) : null}

          {!comoAdmin && areaEncontrada ? (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 items-center">
              <Text className="text-xs text-gray-500">El código {areaEncontrada.codigo} es del área</Text>
              <Text className="text-xl font-bold text-green-800 mt-1">{areaEncontrada.nombre}</Text>
              <TouchableOpacity
                onPress={() => {
                  setAreaEncontrada(null);
                  setError(undefined);
                }}
                accessibilityRole="button"
                className="mt-3"
              >
                <Text className="text-green-700 text-xs font-medium">No es mi área, cambiar el código</Text>
              </TouchableOpacity>
            </View>
          ) : !comoAdmin ? (
            <Campo
              etiqueta="Código del área"
              placeholder="EMB-4821"
              autoCapitalize="characters"
              autoCorrect={false}
              value={codigo}
              onChangeText={setCodigo}
              onFocus={() => setError(undefined)}
              className="text-center text-lg tracking-widest"
            />
          ) : (
            <>
              {plantas.length > 1 ? (
                <View className="flex-row flex-wrap mb-3">
                  {plantas.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        setPlantaElegida(p.id);
                        setError(undefined);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: p.id === plantaId }}
                      className={`border rounded-lg px-3 py-2 mr-2 mb-1 ${
                        p.id === plantaId ? "bg-green-700 border-green-700" : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${p.id === plantaId ? "text-white" : "text-gray-700"}`}
                      >
                        {p.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <Campo
                etiqueta="Código de administrador"
                placeholder="Te lo entrega el equipo de RecyTrack"
                autoCapitalize="characters"
                autoCorrect={false}
                value={codigoAdmin}
                onChangeText={setCodigoAdmin}
                onFocus={() => setError(undefined)}
                className="text-center tracking-widest"
              />
            </>
          )}

          <TouchableOpacity
            onPress={() => {
              setComoAdmin((v) => !v);
              setAreaEncontrada(null);
              setError(undefined);
            }}
            accessibilityRole="button"
            className="mb-3"
          >
            <Text className="text-center text-gray-500 text-xs">
              {comoAdmin
                ? "No soy administrador, soy colaborador"
                : "¿Eres administrador de la planta? Toca aquí"}
            </Text>
          </TouchableOpacity>

          <Boton
            titulo={
              comoAdmin
                ? cargando ? "Entrando..." : "Entrar como administrador"
                : areaEncontrada
                  ? cargando ? "Uniendo..." : `Unirme a ${areaEncontrada.nombre}`
                  : cargando ? "Buscando..." : "Buscar mi área"
            }
            cargando={cargando}
            onPress={handleVincular}
            className="mt-1"
          />

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
