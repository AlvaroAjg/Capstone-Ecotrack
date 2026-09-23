import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { formatKg } from "../lib/formato";
import {
  AvatarPerfil,
  Aviso,
  Barra,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Tarjeta,
} from "../components/ui";

export default function HomeScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    miTorre,
    errorDatos,
    misKgDelMes,
    misCertificados,
    miPosicionRanking,
    resumenTorre,
    mision,
    misionesDiarias,
    puntosSemana,
  } = useEcoTrack();

  const nombre = usuario?.nombre ?? "Residente";
  const resumen = resumenTorre(usuario?.torreId ?? null);
  const diariasHechas = misionesDiarias.filter((m) => m.completada).length;
  const siguienteDiaria = misionesDiarias.find((m) => !m.completada);

  return (
    <Cuerpo>
      <Encabezado>
        {/* Tocar el nombre o el avatar abre "Mi cuenta". */}
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => nav.ir("perfil")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Abrir mi cuenta"
            className="flex-1 pr-3"
          >
            <Text className="text-green-100 text-sm">Bienvenido de vuelta</Text>
            <Text className="text-white text-2xl font-bold mt-1" numberOfLines={1}>
              {nombre}
            </Text>
            <Text className="text-green-200 text-sm mt-1">
              {miTorre?.nombre ?? "Sin torre"} · {usuario?.depto ?? ""} ·{" "}
              {miTorre?.condominio ?? ""}
            </Text>
          </TouchableOpacity>
          <AvatarPerfil nombre={nombre} alPresionar={() => nav.ir("perfil")} />
        </View>
      </Encabezado>

      <FilaMetricas
        color="text-green-700"
        metricas={[
          { valor: formatKg(misKgDelMes), etiqueta: "Certificado este mes" },
          { valor: `${miPosicionRanking}°`, etiqueta: "Ranking de tu torre" },
          { valor: `${misCertificados.length}`, etiqueta: "Certificados" },
        ]}
      />

      {errorDatos ? (
        <View className="px-6 mt-6">
          <Aviso texto={errorDatos} />
        </View>
      ) : null}

      <View className="px-6 mt-6">
        <TouchableOpacity
          onPress={() => nav.ir("escanear")}
          accessibilityRole="button"
          className="bg-green-700 rounded-2xl py-5 items-center flex-row justify-center"
        >
          <Text className="text-lg mr-2">📷</Text>
          <Text className="text-white font-semibold text-base">Escanear código QR</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() =>
            misCertificados[0] && nav.ir("certificado", { registroId: misCertificados[0].id })
          }
          disabled={misCertificados.length === 0}
          accessibilityRole="button"
          className={`bg-white rounded-2xl p-4 items-center shadow-sm ${
            misCertificados.length === 0 ? "opacity-40" : ""
          }`}
        >
          <Text className="text-2xl mb-1">📄</Text>
          <Text className="text-gray-700 text-xs font-medium">Último certificado</Text>
        </TouchableOpacity>
      </View>

      <Seccion titulo="Misiones de hoy" etiqueta={`${puntosSemana} EcoPuntos`}>
        <TouchableOpacity
          onPress={() => nav.ir("misiones")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Misiones diarias: ${diariasHechas} de ${misionesDiarias.length} completadas. Ver todas las misiones`}
        >
          <Tarjeta>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-800 font-medium flex-1 pr-2">
                {siguienteDiaria
                  ? `${siguienteDiaria.emoji} ${siguienteDiaria.titulo}`
                  : "🎉 ¡Completaste todas las misiones de hoy!"}
              </Text>
              <Text className="text-green-700 font-semibold text-sm">
                {diariasHechas}/{misionesDiarias.length}
              </Text>
            </View>
            <Barra
              avance={
                misionesDiarias.length ? (diariasHechas / misionesDiarias.length) * 100 : 0
              }
            />
            <Text className="text-green-700 text-xs font-semibold mt-2">
              Ver misiones diarias y semanales →
            </Text>
          </Tarjeta>
        </TouchableOpacity>
      </Seccion>

      <Seccion titulo="Misión de la torre">
        <Tarjeta>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-medium flex-1 pr-2">
              Alcanzar {resumen.metaKg} kg como torre este mes
            </Text>
            <Text className="text-green-700 font-semibold text-sm">
              {resumen.avanceMeta}%
            </Text>
          </View>
          <Barra avance={resumen.avanceMeta} />
          <Text className="text-gray-400 text-xs mt-2">
            {formatKg(resumen.kgMes)} de {resumen.metaKg} kg ·{" "}
            {resumen.deptosActivos} de {resumen.deptosTotales} departamentos participando
          </Text>
          {mision?.incentivo ? (
            <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3">
              <Text className="text-amber-800 text-xs">🎁 {mision.incentivo}</Text>
            </View>
          ) : null}
        </Tarjeta>
      </Seccion>
    </Cuerpo>
  );
}
