import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEcoTrack } from "../state/EcoTrack";
import { mensajeError } from "../services/auth";
import { Aviso, Boton } from "../components/ui";

/**
 * Entre el registro y unirse a un área: quien se registró con correo y
 * contraseña confirma que el correo es suyo abriendo el enlace que le llegó.
 * Sin eso no puede unirse a un área, y las reglas de Firestore lo exigen igual.
 */
export default function VerificarCorreoScreen() {
  const { usuario, comprobarVerificacion, reenviarVerificacion, cerrarSesion } = useEcoTrack();
  const [comprobando, setComprobando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function handleComprobar() {
    setComprobando(true);
    setError(null);
    setMensaje(null);
    try {
      // Si ya se confirmó, App.tsx pasa solo a la pantalla para unirse a un área.
      const verificado = await comprobarVerificacion();
      if (!verificado) {
        setError("Todavía no confirmas tu correo. Abre el enlace que te enviamos y vuelve a intentarlo.");
      }
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setComprobando(false);
    }
  }

  async function handleReenviar() {
    setReenviando(true);
    setError(null);
    setMensaje(null);
    try {
      await reenviarVerificacion();
      setMensaje("Te enviamos un correo nuevo. Revisa también la carpeta de spam.");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-green-100 items-center justify-center mb-4">
            <Text className="text-3xl">✉️</Text>
          </View>
        </View>

        <Text className="text-2xl font-bold text-green-700 mb-1">Confirma tu correo</Text>
        <Text className="text-base text-gray-500 mb-6">
          Te enviamos un enlace a{" "}
          <Text className="font-semibold text-gray-700">{usuario?.email ?? "tu correo"}</Text>.
          Ábrelo para confirmar que el correo es tuyo y después vuelve aquí.
        </Text>

        {error ? (
          <View className="mb-4">
            <Aviso texto={error} />
          </View>
        ) : null}
        {mensaje ? (
          <View className="mb-4">
            <Aviso texto={mensaje} tono="info" />
          </View>
        ) : null}

        <Boton
          titulo={comprobando ? "Comprobando..." : "Ya confirmé mi correo"}
          cargando={comprobando}
          onPress={handleComprobar}
          className="mb-3"
        />
        <Boton
          titulo={reenviando ? "Enviando..." : "Reenviar el correo"}
          variante="secundario"
          cargando={reenviando}
          onPress={handleReenviar}
          className="mb-3"
        />
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => cerrarSesion()} />
      </ScrollView>
    </SafeAreaView>
  );
}
