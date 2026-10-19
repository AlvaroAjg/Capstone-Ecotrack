import React, { useMemo } from "react";
import { View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { observacionesDelMes, rondasDelMes, type DiaRonda, type EstadoDia } from "../../lib/rondas";
import { rondaDeHoy, type FilaRonda } from "../../lib/resumenPanel";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { fechaCorta } from "../../lib/formato";
import { Bloque, ESTADO_RONDA, EncabezadoBloque, EncabezadoSeccion, Insignia, Texto, Titulo } from "./estilo";

const ASPECTO_DIA: Record<EstadoDia, { caja: string; texto: string; etiqueta: string }> = {
  completada: { caja: "bg-oliva border-oliva", texto: "text-white", etiqueta: "Ronda hecha" },
  noRealizada: { caja: "bg-rojizo-claro border-rojizo-claro", texto: "text-rojizo-oscuro", etiqueta: "No se hizo" },
  sinDepositos: { caja: "bg-piedra-linea border-piedra-linea", texto: "text-tinta-suave", etiqueta: "Sin depósitos" },
  enCurso: { caja: "bg-ambar-claro border-ambar", texto: "text-ambar-oscuro", etiqueta: "Pendiente hoy" },
  futuro: { caja: "bg-white border-piedra-linea", texto: "text-piedra-punto", etiqueta: "" },
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

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
  const conObservacion = observaciones.filter((o) => o.tipo === "observacion").length;
  const sinMaterial = observaciones.filter((o) => o.tipo === "sinMaterial").length;
  // El calendario parte el lunes: se rellenan los días antes del 1.
  const relleno = (new Date(dias[0].dia).getDay() + 6) % 7;
  const celdas: (DiaRonda | null)[] = [...Array<null>(relleno).fill(null), ...dias];

  const indicadores = [
    { valor: hechas, etiqueta: "Rondas hechas", detalle: "Días en que el validador pasó", tono: "text-oliva" },
    {
      valor: faltaron,
      etiqueta: "Sin hacer",
      detalle: "Días sin ronda con depósitos esperando",
      tono: faltaron > 0 ? "text-rojizo-oscuro" : "text-tinta",
    },
    {
      valor: conObservacion,
      etiqueta: "Con observación",
      detalle: "Contenedores con algo que no correspondía",
      tono: conObservacion > 0 ? "text-ambar-oscuro" : "text-tinta",
    },
    { valor: sinMaterial, etiqueta: "Sin material", detalle: "Tandas rechazadas por el validador", tono: "text-tinta" },
  ];

  return (
    <View>
      <EncabezadoSeccion
        titulo="Rondas de validación"
        detalle={`${etiquetaMes(mesDe(Date.now()))}. Una ronda al día: el validador deja cada contenedor Conforme, Con observación o Sin material.`}
      />

      <Bloque className="flex-row px-2 mb-6">
        {indicadores.map((k, i) => (
          <View key={k.etiqueta} className={`flex-1 px-5 ${i > 0 ? "border-l border-piedra-borde" : ""}`}>
            <Titulo className={`text-[32px] leading-[36px] ${k.tono}`}>{k.valor}</Titulo>
            <Texto className="text-tinta-media text-[13px] font-semibold mt-0.5">{k.etiqueta}</Texto>
            <Texto className="text-tinta-suave text-xs mt-0.5">{k.detalle}</Texto>
          </View>
        ))}
      </Bloque>

      <View className="flex-row items-start mb-6">
        <View className="w-[460px] mr-7">
          <Bloque>
            <Titulo className="text-[24px] mb-4">Calendario del mes</Titulo>
            <View className="flex-row mb-2">
              {DIAS_SEMANA.map((d) => (
                <Texto key={d} className="flex-1 text-center text-tinta-suave text-xs font-semibold">
                  {d}
                </Texto>
              ))}
            </View>
            <View className="flex-row flex-wrap">
              {celdas.map((d, i) => {
                if (!d) return <View key={`r${i}`} style={{ width: `${100 / 7}%` }} className="p-1" />;
                const aspecto = ASPECTO_DIA[d.estado];
                return (
                  <View key={d.dia} style={{ width: `${100 / 7}%` }} className="p-1">
                    <View
                      accessibilityLabel={`${new Date(d.dia).getDate()}: ${aspecto.etiqueta || "por venir"}`}
                      className={`h-12 rounded-[10px] border items-center justify-center ${aspecto.caja}`}
                    >
                      <Texto className={`text-sm font-bold ${aspecto.texto}`}>{new Date(d.dia).getDate()}</Texto>
                    </View>
                  </View>
                );
              })}
            </View>
            <View className="flex-row flex-wrap mt-3">
              {(["completada", "noRealizada", "enCurso", "sinDepositos"] as EstadoDia[]).map((e) => (
                <View key={e} className="flex-row items-center mr-4 mt-1">
                  <View className={`w-3 h-3 rounded-[4px] border mr-1.5 ${ASPECTO_DIA[e].caja}`} />
                  <Texto className="text-tinta-media text-xs">{ASPECTO_DIA[e].etiqueta}</Texto>
                </View>
              ))}
            </View>
          </Bloque>
        </View>

        <View className="flex-1 min-w-0">
          <TablaRondaDeHoy filas={hoy} />
        </View>
      </View>

      <Bloque>
        <EncabezadoBloque
          titulo="Observaciones del mes"
          derecha={
            observaciones.length > 0 ? (
              <Texto className="text-tinta-suave text-xs">
                {observaciones.length} contenedor{observaciones.length === 1 ? "" : "es"}
              </Texto>
            ) : null
          }
        />
        {observaciones.length === 0 ? (
          <Texto className="text-tinta-suave text-sm">
            Este mes el validador no ha encontrado contaminación ni contenedores sin material.
          </Texto>
        ) : (
          observaciones.map((o) => (
            <View
              key={`${o.tipo}-${o.codigo}-${o.fecha}`}
              className="flex-row items-center py-3 border-t border-piedra-linea"
            >
              <Texto className="w-28 text-tinta-media text-[13px]">{fechaCorta(o.fecha)}</Texto>
              <Texto className="flex-1 text-tinta text-sm font-semibold pr-2" numberOfLines={1}>
                {o.punto ? `${o.punto} · ` : ""}
                {o.contenedor}
              </Texto>
              <Texto className="w-64 text-tinta-media text-[13px] pr-2">{o.detalle}</Texto>
              <View className="w-36 items-end">
                <Insignia
                  texto={o.tipo === "observacion" ? "Con observación" : "Sin material"}
                  tono={o.tipo === "observacion" ? "ambar" : "rojo"}
                  icono="alerta"
                />
              </View>
            </View>
          ))
        )}
      </Bloque>
    </View>
  );
}

/** La ronda de hoy como tabla: qué resultado tuvo cada contenedor y a qué hora. */
function TablaRondaDeHoy({ filas }: { filas: FilaRonda[] }) {
  const porRevisar = filas.filter((f) => f.estado !== "vacio");
  const revisados = porRevisar.filter((f) => f.estado !== "pendiente").length;
  const enCurso = porRevisar.length > 0 && revisados < porRevisar.length;

  return (
    <Bloque>
      <EncabezadoBloque
        titulo="Ronda de hoy"
        detalle={
          porRevisar.length === 0
            ? "Hoy ningún contenedor tiene depósitos que revisar."
            : `${revisados} de ${porRevisar.length} contenedor${porRevisar.length === 1 ? "" : "es"} revisados.`
        }
        derecha={
          porRevisar.length > 0 ? (
            <Insignia texto={enCurso ? "En curso" : "Completa"} tono={enCurso ? "ambar" : "oliva"} />
          ) : null
        }
      />
      {filas.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">La planta todavía no tiene contenedores.</Texto>
      ) : porRevisar.length > 0 ? (
        <>
          <View className="flex-row border-b-[1.5px] border-vino pb-2">
            <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Contenedor</Texto>
            <Texto className="w-40 text-tinta-media text-[13px] font-semibold">Resultado</Texto>
            <Texto className="w-16 text-tinta-media text-[13px] font-semibold">Hora</Texto>
            <Texto className="w-24 text-tinta-media text-[13px] font-semibold text-right">Depósitos</Texto>
          </View>
          {porRevisar.map((f) => {
            const estado = ESTADO_RONDA[f.estado];
            return (
              <View key={f.codigo} className="flex-row items-center py-2.5 border-b border-piedra-linea">
                <Texto className="flex-1 text-tinta text-sm font-semibold pr-2" numberOfLines={1}>
                  {f.punto || "Sin punto"} · {f.nombre}
                </Texto>
                <View className="w-40 items-start">
                  <Insignia texto={estado.texto} tono={estado.tono} icono={estado.icono} />
                </View>
                <Texto className="w-16 text-tinta-media text-[13px]">
                  {f.revisadoEn !== null ? hora(f.revisadoEn) : "—"}
                </Texto>
                <Texto className="w-24 text-tinta-media text-[13px] text-right">
                  {f.revisadoEn !== null ? `${f.revisados} revisados` : `${f.pendientes} por validar`}
                </Texto>
              </View>
            );
          })}
        </>
      ) : null}
      {filas.length > porRevisar.length ? (
        <Texto className="text-tinta-suave text-xs pt-3">
          {filas.length - porRevisar.length} contenedor{filas.length - porRevisar.length === 1 ? "" : "es"} sin
          depósitos que revisar hoy.
        </Texto>
      ) : null}
    </Bloque>
  );
}
