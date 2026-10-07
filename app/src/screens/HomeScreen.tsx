import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type FilaRanking } from "../state/EcoTrack";
import { diaYMes, formatKg, porcentaje } from "../lib/formato";
import type { AvanceIncentivo } from "../lib/derivados";
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
    miPlanta,
    errorDatos,
    misKgDelMes,
    misCertificados,
    misRegistros,
    ranking,
    miPosicionRanking,
    miIncentivo,
    misionSemanal,
    puntosMes,
    avisosNuevos,
  } = useEcoTrack();
  const miArea = ranking.find((a) => a.esMiArea);

  const { descargar, generando } = useDescargaCertificado();
  // El más reciente con depósitos certificados: al empezar un mes, el
  // certificado del anterior sigue a mano hasta que haya uno nuevo.
  const ultimoMes = mesesConCertificado(misRegistros)[0];

  const nombre = usuario?.nombre ?? "Colaborador";

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
              {usuario?.areaNombre ?? "Sin área"} · {miPlanta?.nombre ?? ""}
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
          { valor: `${miPosicionRanking}°`, etiqueta: "Ranking de tu área" },
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

      {miArea ? (
        <TarjetaMiArea
          fila={miArea}
          posicion={miPosicionRanking}
          total={ranking.length}
          alAbrir={() => nav.ir("ranking")}
        />
      ) : null}

      {miIncentivo ? <TarjetaIncentivo avance={miIncentivo} /> : null}

      <TipReciclaje />

      <Seccion titulo="Tu misión de la semana" etiqueta={`${puntosMes} puntos este mes`}>
        <Tarjeta>
          <FilaMision mision={misionSemanal} />
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
      accessibilityLabel={`Misión de la semana: ${mision.titulo}. ${estado}. ${mision.puntos} puntos.`}
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

/**
 * Cómo va mi área en el ranking del mes. Tocarla abre el ranking completo, que
 * ya está en la barra inferior: aquí solo va el resumen.
 */
function TarjetaMiArea({
  fila,
  posicion,
  total,
  alAbrir,
}: {
  fila: FilaRanking;
  posicion: number;
  total: number;
  alAbrir: () => void;
}) {
  return (
    <View className="px-6 mt-4">
      <TouchableOpacity
        onPress={alAbrir}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Tu área, ${fila.nombre}: lugar ${posicion} de ${total}, ${fila.participacion}% de participación. Ver el ranking.`}
      >
        <Tarjeta>
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-1 min-w-0 pr-2">
              <Text className="text-gray-400 text-xs">Tu área</Text>
              <Text className="text-gray-800 font-semibold" numberOfLines={1}>
                {fila.nombre} · {posicion}° de {total}
              </Text>
            </View>
            <Text className="text-green-700 font-bold text-lg">{fila.participacion}%</Text>
          </View>
          <Barra avance={fila.participacion} />
          <Text className="text-gray-400 text-xs mt-2">
            {fila.participantes} de {fila.dotacion} personas reciclaron este mes
          </Text>
        </Tarjeta>
      </TouchableOpacity>
    </View>
  );
}

/** El incentivo de la planta y cuánto le falta a mi área para ganarlo. */
function TarjetaIncentivo({ avance }: { avance: AvanceIncentivo }) {
  return (
    <View className="px-6 mt-4">
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-amber-900 font-semibold flex-1 pr-2">🏆 {avance.nombre}</Text>
          <Text className="text-amber-700 text-xs">Termina el {diaYMes(avance.terminaEn)}</Text>
        </View>
        <Text className="text-amber-800 text-sm mb-3">
          Si tu área llega al {avance.meta}% de participación: {avance.incentivo}
        </Text>
        {/* La barra es el avance hacia la meta, no hacia el 100 %. */}
        <Barra avance={porcentaje(avance.participacion, avance.meta)} color="bg-amber-500" />
        <Text className="text-amber-800 text-xs mt-2">
          {avance.cumplida
            ? `¡Meta cumplida! Tu área lleva ${avance.participacion}%.`
            : `Tu área lleva ${avance.participacion}%: falta un ${avance.faltan}% más para la meta.`}
        </Text>
      </View>
    </View>
  );
}

/**
 * Tip plegable sobre las misiones: una línea en verde suave que se abre solo
 * si interesa, para no competir con las misiones. Empuja a
 * juntar los reciclables y registrarlos de una vez (una botella suelta igual
 * se puede registrar como talla S) y a vaciar la bolsa en vez de botarla.
 */
function TipReciclaje() {
  const [abierto, setAbierto] = useState(false);
  return (
    <View className="px-6 mt-4">
      <TouchableOpacity
        onPress={() => setAbierto((v) => !v)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3"
      >
        <View className="flex-row items-center">
          <Text className="text-green-900 text-sm font-medium flex-1 pr-2">
            Tip: junta tus reciclables y regístralos juntos
          </Text>
          <Text className="text-green-700 text-xs font-semibold">
            {abierto ? "Ocultar" : "Ver"}
          </Text>
        </View>
        {abierto ? (
          <Text className="text-green-800 text-xs mt-2 leading-5">
            No hace falta ir al punto limpio por cada botella o lata. Junta en una bolsa lo
            que reciclas durante la jornada, en tu puesto o en el casino, y llévalo de una
            vez, por ejemplo al terminar el turno: es un solo escaneo, la talla estima mejor
            los kilos y suma igual a tu certificado y a la participación de tu área. En el
            contenedor, vacía la bolsa y guárdala: no la botes adentro, porque contamina el
            reciclaje. Si igual quieres botar una sola botella, regístrala como talla S.
          </Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
