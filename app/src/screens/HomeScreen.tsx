import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { formatKg, porcentaje } from "../lib/formato";
import { mesesConCertificado } from "../lib/certificadoMensual";
import { useDescargaCertificado } from "../lib/useDescargaCertificado";
import { textoAvance, type MisionSistema } from "../lib/misionesSistema";
import {
  AvatarPerfil,
  CampanaAvisos,
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
    misRegistros,
    miPosicionRanking,
    resumenTorre,
    mision,
    misionSemanal,
    ecoPuntosMes,
    avisosNuevos,
  } = useEcoTrack();

  const { descargar, generando } = useDescargaCertificado();
  // El más reciente con depósitos certificados: al empezar un mes, el
  // certificado del anterior sigue a mano hasta que haya uno nuevo.
  const ultimoMes = mesesConCertificado(misRegistros)[0];

  const nombre = usuario?.nombre ?? "Residente";
  const resumen = resumenTorre(usuario?.torreId ?? null);

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
          <CampanaAvisos nuevos={avisosNuevos} alPresionar={() => nav.ir("avisos")} />
          <AvatarPerfil nombre={nombre} alPresionar={() => nav.ir("perfil")} />
        </View>
      </Encabezado>

      <FilaMetricas
        color="text-green-700"
        metricas={[
          { valor: formatKg(misKgDelMes), etiqueta: "Certificado este mes" },
          { valor: `${miPosicionRanking}°`, etiqueta: "Ranking de tu torre" },
          { valor: `${misCertificados.length}`, etiqueta: "Depósitos certificados" },
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
          onPress={() => ultimoMes && descargar(ultimoMes)}
          disabled={!ultimoMes || generando !== null}
          accessibilityRole="button"
          className={`bg-white rounded-2xl p-4 items-center shadow-sm ${
            !ultimoMes ? "opacity-40" : ""
          }`}
        >
          <Text className="text-2xl mb-1">📄</Text>
          <Text className="text-gray-700 text-xs font-medium">
            {generando ? "Generando PDF..." : "Descargar certificado del mes"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Una botella suelta también se puede registrar (talla S), pero no hace
          falta bajar por cada una: el tip empuja a juntar y registrar de una vez. */}
      <View className="px-6 mt-4">
        <View
          accessible
          className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
        >
          <Text className="text-amber-900 font-semibold text-sm">
            Tip: junta tus reciclables y regístralos juntos
          </Text>
          <Text className="text-amber-800 text-xs mt-1 leading-5">
            No hace falta bajar por cada botella. Guarda tus reciclables en una bolsa
            durante la semana y regístralos de una vez: es un solo escaneo, la talla
            estima mejor los kilos y todo suma igual a tu certificado del mes. En el
            contenedor, vacía la bolsa y guárdala: no la botes adentro, porque contamina
            el reciclaje. Si igual quieres botar una sola botella, regístrala como talla S.
          </Text>
        </View>
      </View>

      <Seccion titulo="Tu misión de la semana" etiqueta={`${ecoPuntosMes} EcoPuntos este mes`}>
        <Tarjeta>
          <FilaMision mision={misionSemanal} />
        </Tarjeta>
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

/**
 * La misión semanal del sistema dentro de la tarjeta de Inicio. Se cumple sola
 * al reciclar: no hay nada que tocar, así que la fila se lee de una vez.
 */
function FilaMision({ mision }: { mision: MisionSistema }) {
  const estado = mision.completada ? "Completada" : textoAvance(mision);

  return (
    <View
      accessible
      accessibilityLabel={`Misión de la semana: ${mision.titulo}. ${estado}. ${mision.puntos} EcoPuntos.`}
    >
      <View className="flex-row items-center mb-2">
        <Text className="mr-2">{mision.completada ? "✅" : mision.emoji}</Text>
        <Text className="text-gray-800 font-medium flex-1 min-w-0 pr-2">{mision.titulo}</Text>
        <Text className="text-amber-700 text-xs font-semibold">+{mision.puntos}</Text>
      </View>
      <Barra avance={porcentaje(mision.progreso, mision.meta)} />
      <Text className="text-gray-400 text-xs mt-2">{estado}</Text>
    </View>
  );
}
