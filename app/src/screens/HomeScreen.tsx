import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Navegacion } from "../../App";
import { Registro, useEcoTrack } from "../state/EcoTrack";
import { formatKg, tiempoRelativo } from "../lib/formato";
import {
  ASPECTO_ESTADO,
  Barra,
  Boton,
  CadenaVerificacion,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Insignia,
  Seccion,
  Tarjeta,
  Vacio,
} from "../components/ui";

export default function HomeScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    misRegistros,
    misKgDelMes,
    misCertificados,
    miPosicionRanking,
    resumenTorre,
    cerrarSesion,
  } = useEcoTrack();

  const nombre = usuario?.nombre ?? "Residente";
  const torre = usuario?.torre ?? "Torre A";
  const resumen = resumenTorre(torre);

  function salir() {
    cerrarSesion();
    nav.ir("login");
  }

  return (
    <Cuerpo>
      <Encabezado>
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-green-100 text-sm">Bienvenido de vuelta</Text>
            <Text className="text-white text-2xl font-bold mt-1" numberOfLines={1}>
              {nombre}
            </Text>
            <Text className="text-green-200 text-sm mt-1">
              {torre} · {usuario?.depto ?? "Depto 305"} · Condominio Piloto
            </Text>
          </View>
          <View className="w-12 h-12 bg-green-600 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
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

      <View className="px-6 mt-6">
        <Boton
          titulo="Escanear código QR"
          icono="📷"
          onPress={() => nav.ir("escanear")}
          className="py-5"
        />
      </View>

      <View className="px-6 mt-4 flex-row">
        <TouchableOpacity
          onPress={() => nav.ir("ranking")}
          accessibilityRole="button"
          className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm mr-2"
        >
          <Text className="text-2xl mb-1">🏆</Text>
          <Text className="text-gray-700 text-xs font-medium">Ranking de torres</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            misCertificados[0] && nav.ir("certificado", { registroId: misCertificados[0].id })
          }
          disabled={misCertificados.length === 0}
          accessibilityRole="button"
          className={`flex-1 bg-white rounded-2xl p-4 items-center shadow-sm ml-2 ${
            misCertificados.length === 0 ? "opacity-40" : ""
          }`}
        >
          <Text className="text-2xl mb-1">📄</Text>
          <Text className="text-gray-700 text-xs font-medium">Último certificado</Text>
        </TouchableOpacity>
      </View>

      <Seccion titulo="Misión de la torre">
        <Tarjeta>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-medium flex-1 pr-2">
              Alcanzar {resumen.metaKg} kg como torre este mes
            </Text>
            <Text className="text-green-700 font-semibold text-sm">{resumen.avanceMeta}%</Text>
          </View>
          <Barra avance={resumen.avanceMeta} />
          <Text className="text-gray-400 text-xs mt-2">
            {formatKg(resumen.kgMes)} de {resumen.metaKg} kg · {resumen.participacion}% de
            departamentos participando
          </Text>
        </Tarjeta>
      </Seccion>

      <Seccion
        titulo="Mi actividad"
        etiqueta={`${misRegistros.length} registro${misRegistros.length === 1 ? "" : "s"}`}
      >
        {misRegistros.length === 0 ? (
          <Vacio
            emoji="♻️"
            texto="Aún no registras reciclaje. Escanea el QR del contenedor para empezar."
          />
        ) : (
          misRegistros.map((r) => (
            <TarjetaActividad
              key={r.id}
              registro={r}
              alAbrir={
                r.estado === "certificado"
                  ? () => nav.ir("certificado", { registroId: r.id })
                  : undefined
              }
            />
          ))
        )}
      </Seccion>

      <View className="px-6 mt-6">
        <Boton titulo="Cerrar sesión" variante="peligro" onPress={salir} />
      </View>
    </Cuerpo>
  );
}

function TarjetaActividad({
  registro,
  alAbrir,
}: {
  registro: Registro;
  alAbrir?: () => void;
}) {
  const aspecto = ASPECTO_ESTADO[registro.estado];

  const contenido = (
    <Tarjeta className="mb-3">
      <View className="flex-row items-center mb-3">
        <View
          className={`w-10 h-10 ${aspecto.fondo} rounded-full items-center justify-center mr-3`}
        >
          <Text>{aspecto.emoji}</Text>
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-gray-800 font-medium">
            {registro.material} · {formatKg(registro.kg)}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            Contenedor {registro.contenedor} · {tiempoRelativo(registro.creadoEn)}
          </Text>
        </View>
        <Insignia estado={registro.estado} />
      </View>

      <CadenaVerificacion estado={registro.estado} />

      {registro.codigo ? (
        <Text className="text-green-700 text-xs font-medium mt-3">
          Código {registro.codigo} · toca para ver el certificado
        </Text>
      ) : null}
    </Tarjeta>
  );

  if (!alAbrir) return contenido;

  return (
    <TouchableOpacity onPress={alAbrir} activeOpacity={0.85} accessibilityRole="button">
      {contenido}
    </TouchableOpacity>
  );
}
