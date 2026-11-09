import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hayVersionNueva, versionDeHtml } from "../lib/version";

const CADA_CUANTO_MS = 10 * 60 * 1000;

function useVersionNueva(): boolean {
  const [nueva, setNueva] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const actual = versionDeHtml(Array.from(document.scripts, (s) => s.src).join(" "));
    if (!actual) return;
    let cancelado = false;

    const revisar = async () => {
      try {
        const respuesta = await fetch("/", { cache: "no-store" });
        const publicada = versionDeHtml(await respuesta.text());
        if (!cancelado && hayVersionNueva(actual, publicada)) setNueva(true);
      } catch {
        return;
      }
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") revisar();
    };

    revisar();
    const intervalo = setInterval(revisar, CADA_CUANTO_MS);
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, []);

  return nueva;
}

export default function AvisoNuevaVersion() {
  const nueva = useVersionNueva();
  const [despues, setDespues] = useState(false);
  const { bottom } = useSafeAreaInsets();
  if (!nueva || despues) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 88, alignItems: "center", paddingHorizontal: 16 }}
    >
      <View
        accessibilityRole="alert"
        className="w-full max-w-[440px] flex-row items-center bg-gray-900 rounded-2xl pl-4 pr-3 py-3"
        style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.3)" } as object}
      >
        <Text className="text-2xl mr-3">✨</Text>
        <View className="flex-1 pr-2">
          <Text className="text-white font-semibold text-sm">Hay una versión nueva de RecyTrack</Text>
          <TouchableOpacity onPress={() => setDespues(true)} accessibilityRole="button" hitSlop={8}>
            <Text className="text-gray-400 text-xs mt-0.5">Más tarde</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => window.location.reload()}
          accessibilityRole="button"
          accessibilityLabel="Actualizar a la versión nueva"
          className="bg-green-500 rounded-xl px-4 py-2.5"
        >
          <Text className="text-white font-bold text-sm">Actualizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
