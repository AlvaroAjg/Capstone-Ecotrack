import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { esNuevo } from "../../lib/avisos";
import { tiempoRelativo } from "../../lib/formato";
import { Icono, Texto } from "./estilo";

/**
 * Campana de la barra del panel. Abre una lista con los avisos del
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
    <View className="relative">
      <TouchableOpacity
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={avisosNuevos > 0 ? `Avisos, ${avisosNuevos} nuevos` : "Avisos"}
        accessibilityState={{ expanded: abierta }}
        className="w-[42px] h-[42px] rounded-full bg-vino-medio items-center justify-center"
      >
        <Icono nombre="campana" tamano={19} color="#F6EFF3" />
        {avisosNuevos > 0 ? (
          <View className="absolute -top-[3px] -right-[3px] min-w-[18px] h-[18px] px-1 rounded-full bg-ambar-vivo items-center justify-center">
            <Texto className="text-vino text-[11px] font-bold">{avisosNuevos > 9 ? "9+" : avisosNuevos}</Texto>
          </View>
        ) : null}
      </TouchableOpacity>

      {abierta ? (
        <View
          className="absolute right-0 top-[52px] w-[380px] bg-white rounded-2xl border border-piedra-borde py-2"
          style={{ shadowColor: "#2B1424", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }}
        >
          <Texto className="text-tinta text-[15px] font-bold px-4 py-2">Avisos</Texto>
          {avisos.length === 0 ? (
            <Texto className="text-tinta-suave text-sm px-4 pb-3">No hay contenedores esperando retiro.</Texto>
          ) : (
            avisos.map((a) => {
              const nuevo = esNuevo(a, vistosAlAbrir);
              const alerta = a.tono === "alerta";
              return (
                <View
                  key={a.id}
                  className={`flex-row px-4 py-3 border-t border-piedra-linea ${nuevo ? "bg-oliva-claro" : ""}`}
                >
                  <View className="mt-0.5 mr-2.5">
                    <Icono nombre={alerta ? "alerta" : "camion"} tamano={16} color={alerta ? "#7A4E17" : "#3F6B2E"} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Texto className={`text-sm font-semibold ${alerta ? "text-ambar-oscuro" : "text-tinta"}`}>
                      {a.titulo}
                    </Texto>
                    <Texto className="text-tinta-suave text-xs mt-0.5">
                      {a.detalle} · {tiempoRelativo(a.fecha)}
                    </Texto>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}
