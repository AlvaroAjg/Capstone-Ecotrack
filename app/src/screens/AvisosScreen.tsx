import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { tiempoRelativo } from "../lib/formato";
import { esNuevo, type Aviso } from "../lib/avisos";
import { Cuerpo, Encabezado, Tarjeta, TituloEncabezado, Vacio } from "../components/ui";

const SUBTITULO = {
  residente: "El avance de tus depósitos en la cadena de verificación",
  administrador: "Depósitos de tu torre que esperan validación",
  gestor: "Contenedores listos para retiro",
} as const;

const VACIO = {
  residente: "Aún no hay avances. Cuando el administrador valide o el gestor certifique un depósito, lo verás aquí.",
  administrador: "No hay depósitos por validar. ¡Todo al día!",
  gestor: "No hay contenedores esperando retiro.",
} as const;

/**
 * Avisos del avance de la cadena, según el rol. Al abrirla se marcan todos
 * como vistos, pero los que eran nuevos siguen destacados mientras se lee.
 */
export default function AvisosScreen({ nav }: { nav: Navegacion }) {
  const { usuario, avisos, marcarAvisosVistos } = useEcoTrack();

  // Se fija al entrar: marcar como vistos cambia el perfil en vivo, y sin esto
  // los avisos nuevos dejarían de destacarse apenas se abre la pantalla.
  const [vistosAlEntrar] = useState(usuario?.avisosVistosHasta ?? 0);

  useEffect(() => {
    marcarAvisosVistos().catch(() => undefined);
  }, [marcarAvisosVistos]);

  if (!usuario) return null;
  const tono = usuario.rol === "residente" ? "verde" : "oscuro";

  return (
    <Cuerpo>
      <Encabezado tono={tono}>
        <TituloEncabezado
          titulo="Avisos"
          subtitulo={SUBTITULO[usuario.rol]}
          alVolver={nav.volver}
          tono={tono}
        />
      </Encabezado>

      <View className="px-6 mt-6">
        {avisos.length === 0 ? (
          <Vacio emoji="🔔" texto={VACIO[usuario.rol]} />
        ) : (
          avisos.map((a) => (
            <FilaAviso
              key={a.id}
              aviso={a}
              nuevo={esNuevo(a, vistosAlEntrar)}
              alAbrir={
                a.registroId
                  ? () => nav.ir("deposito", { registroId: a.registroId })
                  : undefined
              }
            />
          ))
        )}
      </View>
    </Cuerpo>
  );
}

function FilaAviso({
  aviso,
  nuevo,
  alAbrir,
}: {
  aviso: Aviso;
  nuevo: boolean;
  alAbrir?: () => void;
}) {
  // Contaminación y precaución van en rojo: tienen que notarse entre los demás.
  const alerta = aviso.tono === "alerta";

  const cuerpo = (
    <View className="flex-row items-start">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          alerta ? "bg-red-600" : "bg-gray-100"
        }`}
      >
        <Text className={alerta ? "text-white font-bold text-lg" : ""}>{aviso.emoji}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center">
          <Text
            className={`font-medium flex-1 pr-2 ${alerta ? "text-red-800" : "text-gray-800"}`}
          >
            {aviso.titulo}
          </Text>
          {nuevo ? (
            <View className="bg-green-100 rounded-full px-2 py-0.5">
              <Text className="text-green-700 text-[10px] font-semibold">Nuevo</Text>
            </View>
          ) : null}
        </View>
        <Text className={`text-xs mt-1 ${alerta ? "text-red-700" : "text-gray-500"}`}>
          {aviso.detalle}
        </Text>
        <Text className="text-gray-400 text-[11px] mt-1">{tiempoRelativo(aviso.fecha)}</Text>
      </View>
    </View>
  );

  const contenido = alerta ? (
    <View className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-3">{cuerpo}</View>
  ) : (
    <Tarjeta className={`mb-3 ${nuevo ? "border-2 border-green-500" : ""}`}>{cuerpo}</Tarjeta>
  );

  const etiqueta = `${nuevo ? "Nuevo. " : ""}${aviso.titulo}. ${aviso.detalle}. ${tiempoRelativo(aviso.fecha)}.`;

  if (!alAbrir) {
    return (
      <View accessible accessibilityLabel={etiqueta}>
        {contenido}
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={alAbrir}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      {contenido}
    </TouchableOpacity>
  );
}
