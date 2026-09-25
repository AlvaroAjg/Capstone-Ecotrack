import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Navegacion } from "../../App";
import { kgEfectivo, useEcoTrack, type FilaRanking } from "../state/EcoTrack";
import { esDelMesActual, formatKg, porcentaje, sumaKg } from "../lib/formato";
import { etiquetaMes, mesDe } from "../lib/certificadoMensual";
import {
  Barra,
  Cuerpo,
  Encabezado,
  Seccion,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

const MEDALLAS = ["🥇", "🥈", "🥉"];
/** Alto de cada escalón del podio, del 1° al 3°. */
const ALTO_PODIO = [96, 68, 48];
/** Cuántos departamentos se listan en el ranking de la torre. */
const TOP_DEPTOS = 5;

/**
 * Ranking del mes. Entre torres compite el total de kilos certificados, pero
 * en un piloto de dos torres la competencia real está dentro de la torre, entre
 * vecinos: por eso se muestra también el ranking de departamentos, solo con el
 * número de depto y nunca con nombres. Todo se actualiza con cada retiro,
 * porque solo suman los kilos certificados.
 */
export default function RankingScreen({ nav }: { nav: Navegacion }) {
  const { ranking, registros, usuario, miTorre, misKgDelMes } = useEcoTrack();
  const miIndice = ranking.findIndex((t) => t.esMiTorre);
  const miFila = miIndice >= 0 ? ranking[miIndice] : null;
  const mes = etiquetaMes(mesDe(Date.now()));

  // Kilos certificados este mes por departamento de mi torre.
  const deptos = useMemo(() => {
    const porDepto = new Map<string, number[]>();
    for (const r of registros) {
      if (r.torreId !== usuario?.torreId || r.estado !== "certificado") continue;
      if (!esDelMesActual(r.certificadoEn) || !r.depto) continue;
      porDepto.set(r.depto, [...(porDepto.get(r.depto) ?? []), kgEfectivo(r)]);
    }
    return Array.from(porDepto.entries())
      .map(([depto, kgs]) => ({ depto, kg: sumaKg(kgs) }))
      .sort((a, b) => b.kg - a.kg);
  }, [registros, usuario?.torreId]);

  const miPosicionDepto = deptos.findIndex((d) => d.depto === usuario?.depto);

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado
          titulo="Ranking del mes"
          subtitulo={`Kilos certificados en ${mes} · se actualiza con cada retiro`}
          alVolver={nav.raiz ? undefined : nav.volver}
        />
      </Encabezado>

      {ranking.length === 0 ? (
        <View className="px-6 mt-6">
          <Vacio emoji="🏢" texto="Todavía no hay torres registradas en el condominio." />
        </View>
      ) : (
        <>
          <View className="px-6 -mt-6">
            <Tarjeta>
              <Podio filas={ranking.slice(0, 3)} />
              <Brecha ranking={ranking} miIndice={miIndice} />
            </Tarjeta>
          </View>

          {ranking.length > 3 ? (
            <View className="px-6 mt-3">
              {ranking.slice(3).map((t, i) => (
                <FilaTorre key={t.torreId} fila={t} posicion={i + 4} maxKg={ranking[0].kg} />
              ))}
            </View>
          ) : null}
        </>
      )}

      {miFila ? (
        <Seccion titulo="💪 Tu aporte">
          <Tarjeta>
            {miFila.kg > 0 ? (
              <>
                <Text className="text-gray-800">
                  Aportaste <Text className="font-bold text-green-700">{formatKg(misKgDelMes)}</Text>
                  : el{" "}
                  <Text className="font-bold text-green-700">
                    {porcentaje(misKgDelMes, miFila.kg)} %
                  </Text>{" "}
                  de lo que lleva {miFila.nombre} este mes.
                </Text>
                <View className="mt-3">
                  <Barra avance={porcentaje(misKgDelMes, miFila.kg)} />
                </View>
                {misKgDelMes === 0 ? (
                  <Text className="text-gray-400 text-xs mt-2">
                    Tus depósitos empiezan a sumar cuando el gestor retira el contenedor.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text className="text-gray-500 text-sm">
                {miFila.nombre} todavía no tiene kilos certificados este mes. El primer retiro
                pone el marcador en movimiento.
              </Text>
            )}
          </Tarjeta>
        </Seccion>
      ) : null}

      {miFila ? (
        <Seccion
          titulo={`🏠 Deptos. de ${miFila.nombre}`}
          etiqueta={
            miPosicionDepto >= 0
              ? `Tu depto va ${miPosicionDepto + 1}° de ${miTorre?.deptosTotales || deptos.length}`
              : undefined
          }
        >
          <Tarjeta>
            {deptos.length === 0 ? (
              <Text className="text-gray-500 text-sm">
                Aún no hay departamentos con kilos certificados este mes.
              </Text>
            ) : (
              <>
                {deptos.slice(0, TOP_DEPTOS).map((d, i) => (
                  <FilaDepto
                    key={d.depto}
                    posicion={i + 1}
                    depto={d.depto}
                    kg={d.kg}
                    maxKg={deptos[0].kg}
                    esMio={d.depto === usuario?.depto}
                  />
                ))}
                {miPosicionDepto >= TOP_DEPTOS ? (
                  <>
                    <Text className="text-gray-300 text-center my-1">···</Text>
                    <FilaDepto
                      posicion={miPosicionDepto + 1}
                      depto={deptos[miPosicionDepto].depto}
                      kg={deptos[miPosicionDepto].kg}
                      maxKg={deptos[0].kg}
                      esMio
                    />
                  </>
                ) : null}
                {miPosicionDepto === -1 && usuario?.depto ? (
                  <Text className="text-gray-400 text-xs mt-2">
                    Tu depto aún no suma kilos certificados este mes.
                  </Text>
                ) : null}
              </>
            )}
            <Text className="text-gray-300 text-[10px] mt-3">
              Solo se muestra el número de departamento, nunca nombres.
            </Text>
          </Tarjeta>
        </Seccion>
      ) : null}
    </Cuerpo>
  );
}

/** Podio de hasta tres torres: el 1° al centro y más alto, como en una premiación. */
function Podio({ filas }: { filas: FilaRanking[] }) {
  // Orden visual: 2°, 1°, 3°.
  const orden = [1, 0, 2].filter((i) => i < filas.length);
  return (
    <View className="flex-row items-end justify-center mt-2">
      {orden.map((i) => {
        const t = filas[i];
        return (
          <View key={t.torreId} className="items-center mx-1" style={{ flex: 1, maxWidth: 110 }}>
            <Text className="text-3xl">{MEDALLAS[i]}</Text>
            <Text
              className={`text-center font-bold mt-1 ${t.esMiTorre ? "text-green-700" : "text-gray-800"}`}
              numberOfLines={1}
            >
              {t.nombre}
            </Text>
            {t.esMiTorre ? (
              <Text className="text-green-600 text-[10px] font-semibold">Tu torre</Text>
            ) : null}
            <Text className="text-gray-500 text-xs mb-1">{formatKg(t.kg)}</Text>
            <View
              className={`w-full rounded-t-xl items-center justify-center ${
                t.esMiTorre ? "bg-green-600" : "bg-gray-200"
              }`}
              style={{ height: ALTO_PODIO[i] }}
            >
              <Text className={`font-bold text-lg ${t.esMiTorre ? "text-white" : "text-gray-500"}`}>
                {i + 1}°
              </Text>
            </View>
            <Text className="text-gray-400 text-[10px] mt-1 text-center">
              {t.participacion}% particip. · ⭐ {t.ecoPuntos}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Lo que genera la competencia: cuánto falta para pasar al de arriba, o cuánto margen hay. */
function Brecha({ ranking, miIndice }: { ranking: FilaRanking[]; miIndice: number }) {
  if (miIndice < 0 || ranking.length < 2) return null;
  const mia = ranking[miIndice];

  let texto: string;
  if (ranking.every((t) => t.kg === 0)) {
    texto = "El mes recién parte: el primer retiro define quién va arriba.";
  } else if (miIndice === 0) {
    const segunda = ranking[1];
    const margen = sumaKg([mia.kg, -segunda.kg]);
    texto =
      margen === 0
        ? `¡Van empatados con ${segunda.nombre}! El próximo retiro desempata.`
        : `🔥 Van primeros, pero ${segunda.nombre} está a ${formatKg(margen)} de alcanzarlos.`;
  } else {
    const arriba = ranking[miIndice - 1];
    const falta = sumaKg([arriba.kg, -mia.kg]);
    texto =
      falta === 0
        ? `¡Van empatados con ${arriba.nombre}! El próximo retiro desempata.`
        : `⚔️ Les faltan ${formatKg(falta)} para pasar a ${arriba.nombre}.`;
  }

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
      <Text className="text-amber-900 text-sm font-medium text-center">{texto}</Text>
    </View>
  );
}

function FilaTorre({ fila, posicion, maxKg }: { fila: FilaRanking; posicion: number; maxKg: number }) {
  return (
    <Tarjeta className={`mb-3 ${fila.esMiTorre ? "border-2 border-green-500" : ""}`}>
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-800 font-semibold flex-1 pr-2">
          {posicion}° {fila.nombre}
          {fila.esMiTorre ? " · Tu torre" : ""}
        </Text>
        <Text className="text-green-700 font-bold">{formatKg(fila.kg)}</Text>
      </View>
      <Barra avance={porcentaje(fila.kg, maxKg)} color={fila.esMiTorre ? "bg-green-600" : "bg-gray-300"} />
    </Tarjeta>
  );
}

function FilaDepto({
  posicion,
  depto,
  kg,
  maxKg,
  esMio,
}: {
  posicion: number;
  depto: string;
  kg: number;
  maxKg: number;
  esMio: boolean;
}) {
  return (
    <View
      className={`py-2 px-2 rounded-lg mb-1 ${esMio ? "bg-green-50" : ""}`}
      accessible
      accessibilityLabel={`${posicion}° lugar: ${depto}, ${formatKg(kg)}${esMio ? ", tu departamento" : ""}`}
    >
      <View className="flex-row items-center mb-1">
        <Text className="w-8 text-gray-500 font-semibold">
          {posicion <= 3 ? MEDALLAS[posicion - 1] : `${posicion}°`}
        </Text>
        <Text className={`flex-1 ${esMio ? "text-green-800 font-bold" : "text-gray-800"}`}>
          {depto}
          {esMio ? " · Tú" : ""}
        </Text>
        <Text className="text-gray-600 text-sm font-medium">{formatKg(kg)}</Text>
      </View>
      <Barra avance={porcentaje(kg, maxKg)} color={esMio ? "bg-green-600" : "bg-gray-300"} />
    </View>
  );
}
