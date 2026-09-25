import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEcoTrack } from "../state/EcoTrack";
import type { Aviso } from "../lib/avisos";

/** Cuánto rato queda visible el banner antes de esconderse solo. */
const DURACION_MS = 5000;
/**
 * Margen hacia atrás desde que se abrió la app: un evento de hace un minuto
 * también se muestra, así el reloj algo distinto entre teléfonos no se lo come.
 * Todo lo anterior es historial y queda solo en la lista de avisos.
 */
const MARGEN_MS = 60 * 1000;

/**
 * Aviso emergente: cuando llega un aviso nuevo con la app abierta, baja un
 * banner desde arriba, como una notificación del teléfono. No usa push ni
 * permisos: sale del mismo cálculo en vivo que la lista de avisos, así que
 * funciona igual en el navegador, la app instalada y la pared de demostración.
 */
export default function BannerAvisos({
  alAbrir,
}: {
  alAbrir: (aviso: Aviso) => void;
}) {
  const { avisos } = useEcoTrack();
  const { top } = useSafeAreaInsets();

  const montadoEn = useRef(Date.now());
  const yaMostrados = useRef(new Set<string>());
  const [actual, setActual] = useState<{ aviso: Aviso; masCantidad: number } | null>(null);
  const desplazamiento = useRef(new Animated.Value(-160)).current;
  // El que está en pantalla ahora, para que al terminar de esconder uno no se
  // borre otro que llegó justo durante la animación.
  const visible = useRef<Aviso | null>(null);

  useEffect(() => {
    const llegados = avisos.filter(
      (a) => !yaMostrados.current.has(a.id) && a.fecha > montadoEn.current - MARGEN_MS
    );
    for (const a of avisos) yaMostrados.current.add(a.id);
    if (llegados.length === 0) return;

    // Si llegan varios juntos (el gestor retira un lote completo), se muestra
    // el más reciente y cuántos más hay, en vez de encadenar banners.
    setActual({ aviso: llegados[0], masCantidad: llegados.length - 1 });
  }, [avisos]);

  useEffect(() => {
    if (!actual) return;
    visible.current = actual.aviso;
    Animated.spring(desplazamiento, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
    const id = setTimeout(esconder, DURACION_MS);
    return () => clearTimeout(id);
  }, [actual]);

  function esconder() {
    const escondiendo = visible.current;
    Animated.timing(desplazamiento, {
      toValue: -160,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      if (visible.current === escondiendo) setActual(null);
    });
  }

  if (!actual) return null;
  const { aviso, masCantidad } = actual;
  const alerta = aviso.tono === "alerta";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: top + 8,
        left: 12,
        right: 12,
        zIndex: 50,
        transform: [{ translateY: desplazamiento }],
      }}
    >
      {/* El cuerpo y la ✕ son botones hermanos, no anidados: en la web un
          botón dentro de otro no es HTML válido. */}
      <View
        className={`rounded-2xl pl-4 pr-2 py-3 flex-row items-center border ${
          alerta ? "bg-red-50 border-red-300" : "bg-white border-gray-200"
        }`}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            esconder();
            alAbrir(aviso);
          }}
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Aviso nuevo: ${aviso.titulo}. ${aviso.detalle}`}
          className="flex-1 flex-row items-center min-w-0"
        >
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              alerta ? "bg-red-600" : "bg-green-100"
            }`}
          >
            <Text className={`text-lg ${alerta ? "text-white font-bold" : ""}`}>{aviso.emoji}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-gray-400 text-[10px] font-semibold">ECOTRACK · AHORA</Text>
            <Text
              className={`font-semibold text-sm ${alerta ? "text-red-800" : "text-gray-800"}`}
              numberOfLines={1}
            >
              {aviso.titulo}
            </Text>
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {masCantidad > 0 ? `${aviso.detalle} · y ${masCantidad} más` : aviso.detalle}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={esconder}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          className="px-2 py-1"
        >
          <Text className="text-gray-400 text-base">✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
