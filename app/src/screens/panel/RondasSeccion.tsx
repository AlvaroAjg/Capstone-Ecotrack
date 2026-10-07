import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { observacionesDelMes, rondasDelMes, type DiaRonda, type EstadoDia } from "../../lib/rondas";
import { rondaDeHoy } from "../../lib/resumenPanel";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { fechaCorta } from "../../lib/formato";
import { Tarjeta } from "../../components/ui";
import { RondaDeHoy } from "./ResumenSeccion";

const ASPECTO_DIA: Record<EstadoDia, { fondo: string; texto: string; etiqueta: string }> = {
  completada: { fondo: "bg-green-700", texto: "text-white", etiqueta: "Ronda hecha" },
  noRealizada: { fondo: "bg-red-100", texto: "text-red-800", etiqueta: "No se hizo" },
  sinDepositos: { fondo: "bg-gray-100", texto: "text-gray-500", etiqueta: "Sin depósitos" },
  enCurso: { fondo: "bg-amber-100", texto: "text-amber-800", etiqueta: "Pendiente hoy" },
  futuro: { fondo: "bg-white", texto: "text-gray-300", etiqueta: "" },
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Las rondas del validador: un calendario del mes con si pasó cada día, la
 * ronda de hoy por contenedor y lo que encontró en el mes. Sirve para ver si
 * la validación diaria se está haciendo (ver lib/rondas.ts).
 */
export default function RondasSeccion() {
  const { registros, incidencias, contenedores } = useEcoTrack();
  const dias = useMemo(() => rondasDelMes(registros, incidencias), [registros, incidencias]);
  const hoy = useMemo(
    () => rondaDeHoy(registros, incidencias, contenedores),
    [registros, incidencias, contenedores]
  );
  const observaciones = useMemo(
    () => observacionesDelMes(registros, incidencias, contenedores),
    [registros, incidencias, contenedores]
  );

  const hechas = dias.filter((d) => d.estado === "completada").length;
  const faltaron = dias.filter((d) => d.estado === "noRealizada").length;
  // El calendario parte el lunes: se rellenan los días antes del 1.
  const relleno = (new Date(dias[0].dia).getDay() + 6) % 7;
  const celdas: (DiaRonda | null)[] = [...Array<null>(relleno).fill(null), ...dias];

  return (
    <View>
      <View className="flex-row items-start">
        <View className="flex-1 min-w-0 mr-5">
          <Tarjeta>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-800 text-base font-semibold">
                Rondas de {etiquetaMes(mesDe(Date.now()))}
              </Text>
              <View className="bg-gray-200 rounded-full px-3 py-1">
                <Text className="text-gray-600 text-xs font-medium">
                  {hechas} hechas · {faltaron} sin hacer con depósitos esperando
                </Text>
              </View>
            </View>

            <View className="flex-row mb-2">
              {DIAS_SEMANA.map((d) => (
                <Text key={d} className="flex-1 text-center text-gray-500 text-xs font-semibold">
                  {d}
                </Text>
              ))}
            </View>
            <View className="flex-row flex-wrap">
              {celdas.map((d, i) => {
                if (!d) return <View key={`r${i}`} style={{ width: `${100 / 7}%` }} className="p-1" />;
                const aspecto = ASPECTO_DIA[d.estado];
                return (
                  <View key={d.dia} style={{ width: `${100 / 7}%` }} className="p-1">
                    <View className={`h-16 rounded-xl p-2 border border-gray-100 ${aspecto.fondo}`}>
                      <Text className={`text-sm font-bold ${aspecto.texto}`}>
                        {new Date(d.dia).getDate()}
                      </Text>
                      <Text className={`text-[10px] mt-1 ${aspecto.texto}`} numberOfLines={1}>
                        {aspecto.etiqueta}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="flex-row flex-wrap mt-3">
              {(["completada", "noRealizada", "enCurso", "sinDepositos"] as EstadoDia[]).map((e) => (
                <View key={e} className="flex-row items-center mr-4 mt-1">
                  <View className={`w-3 h-3 rounded mr-1.5 border border-gray-200 ${ASPECTO_DIA[e].fondo}`} />
                  <Text className="text-gray-500 text-xs">{ASPECTO_DIA[e].etiqueta}</Text>
                </View>
              ))}
            </View>
          </Tarjeta>
        </View>

        <View className="w-[380px]">
          <RondaDeHoy filas={hoy} />
        </View>
      </View>

      <Tarjeta className="mt-5">
        <Text className="text-gray-800 text-base font-semibold mb-3">Observaciones del mes</Text>
        {observaciones.length === 0 ? (
          <Text className="text-gray-500 text-sm">
            Este mes el validador no ha encontrado contaminación ni contenedores sin material.
          </Text>
        ) : (
          observaciones.map((o) => (
            <View
              key={`${o.tipo}-${o.codigo}-${o.fecha}`}
              className="flex-row items-center py-3 border-t border-gray-100"
            >
              <Text className="w-28 text-gray-500 text-sm">{fechaCorta(o.fecha)}</Text>
              <Text className="flex-1 text-gray-800 text-sm font-medium" numberOfLines={1}>
                {o.punto ? `${o.punto} · ` : ""}
                {o.contenedor}
              </Text>
              <Text className="w-56 text-gray-600 text-sm">{o.detalle}</Text>
              <View
                className={`rounded-full px-2.5 py-1 ${o.tipo === "observacion" ? "bg-amber-100" : "bg-red-100"}`}
              >
                <Text
                  className={`text-xs font-semibold ${o.tipo === "observacion" ? "text-amber-800" : "text-red-800"}`}
                >
                  {o.tipo === "observacion" ? "Con observación" : "Sin material"}
                </Text>
              </View>
            </View>
          ))
        )}
      </Tarjeta>
    </View>
  );
}
