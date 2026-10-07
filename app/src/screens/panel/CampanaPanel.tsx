import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { esNuevo } from "../../lib/avisos";
import { tiempoRelativo } from "../../lib/formato";

/**
 * Campana del encabezado del panel. Abre una lista con los avisos del
 * administrador: los contenedores listos para retiro y las advertencias de
 * los que vienen contaminados (ver lib/avisos.ts). Al abrirla se marcan como
 * vistos.
 */
export default function CampanaPanel() {
  const { usuario, avisos, avisosNuevos, marcarAvisosVistos } = useEcoTrack();
  const [abierta, setAbierta] = useState(false);
  // Se fija al abrir: marcar como vistos cambia el perfil en vivo, y sin esto
  // los nuevos dejarían de destacarse apenas se abre la lista.
  const [vistosAlAbrir, setVistosAlAbrir] = useState(0);

  function alternar() {
    if (!abierta) {
      setVistosAlAbrir(usuario?.avisosVistosHasta ?? 0);
      marcarAvisosVistos().catch(() => undefined);
    }
    setAbierta((v) => !v);
  }

  return (
    <View className="relative z-10">
      <TouchableOpacity
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={avisosNuevos > 0 ? `Avisos, ${avisosNuevos} nuevos` : "Avisos"}
        accessibilityState={{ expanded: abierta }}
        className="w-11 h-11 bg-white border border-gray-300 rounded-xl items-center justify-center"
      >
        <Text className="text-lg">🔔</Text>
        {avisosNuevos > 0 ? (
          <View className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-600 rounded-full items-center justify-center">
            <Text className="text-white text-[11px] font-bold">{avisosNuevos > 9 ? "9+" : avisosNuevos}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {abierta ? (
        <View className="absolute right-0 top-14 w-[380px] bg-white border border-gray-200 rounded-2xl shadow-lg py-2">
          <Text className="text-gray-800 font-semibold px-4 py-2">Avisos</Text>
          {avisos.length === 0 ? (
            <Text className="text-gray-500 text-sm px-4 pb-3">No hay contenedores esperando retiro.</Text>
          ) : (
            avisos.map((a) => {
              const nuevo = esNuevo(a, vistosAlAbrir);
              const alerta = a.tono === "alerta";
              return (
                <View
                  key={a.id}
                  className={`px-4 py-3 border-t border-gray-100 ${nuevo ? "bg-green-50" : ""}`}
                >
                  <Text className={`text-sm font-medium ${alerta ? "text-red-700" : "text-gray-800"}`}>
                    {alerta ? "⚠️ " : `${a.emoji} `}
                    {a.titulo}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {a.detalle} · {tiempoRelativo(a.fecha)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}
