import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useEcoTrack, type Campana, type FilaRanking } from "../../state/EcoTrack";
import { diaYMes, formatKg } from "../../lib/formato";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { mesesReportables, reporteDePlanta } from "../../lib/reportePlanta";
import { descargarReporte, reportePdfDisponible } from "../../lib/reportePdf";
import { avanceAreas } from "../../lib/incentivo";
import { avisar, textoDeError } from "../../lib/dialogos";
import {
  indicadoresDelMes,
  kilosPorMaterial,
  rondaDeHoy,
  validadosPorSemana,
  type FilaRonda,
  type KilosMaterial,
  type Semana,
} from "../../lib/resumenPanel";
import {
  Bloque,
  BotonPanel,
  ESTADO_RONDA,
  EncabezadoBloque,
  EncabezadoSeccion,
  Icono,
  Insignia,
  Pildoras,
  Texto,
  Titulo,
  colorMaterial,
} from "./estilo";

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/** "2026-09" → "sep 2026", para el selector de meses. */
function mesCorto(mes: string): string {
  const [nombre, , anio] = etiquetaMes(mes).split(" ");
  return `${nombre.slice(0, 3)} ${anio}`;
}

/**
 * Hasta cuántas personas se dibujan como puntos en las hileras de
 * participación. Un área más grande se muestra como barra: tantos puntos ya no
 * caben en la fila.
 */
const MAXIMO_PUNTOS = 60;

/**
 * Resumen de la planta en el mes elegido: indicadores, participación de cada
 * área, depósitos por semana y por material, la campaña y, si es el mes en
 * curso, la ronda de hoy. Se calcula con lo que el estado ya escucha en vivo
 * (ver lib/resumenPanel.ts y lib/reportePlanta.ts).
 */
export default function ResumenSeccion() {
  const { miPlanta, areas, registros, incidencias, retiros, contenedores, ranking, campana } =
    useEcoTrack();
  const mesActual = mesDe(Date.now());
  const meses = useMemo(
    () => (miPlanta ? mesesReportables(miPlanta.id, registros, incidencias).slice(0, 6) : [mesActual]),
    [miPlanta, registros, incidencias, mesActual]
  );
  const [mes, setMes] = useState(mesActual);
  const [generando, setGenerando] = useState(false);
  const enCurso = mes === mesActual;

  // La participación de cada área sale del reporte del mes: se calcula con los
  // depósitos, así sirve igual para el mes en curso y para los anteriores.
  const reporte = useMemo(
    () => (miPlanta ? reporteDePlanta(miPlanta, areas, mes, registros, incidencias, retiros) : null),
    [miPlanta, areas, mes, registros, incidencias, retiros]
  );
  const ind = useMemo(() => indicadoresDelMes(registros, incidencias, mes), [registros, incidencias, mes]);
  const semanas = useMemo(() => validadosPorSemana(registros, mes), [registros, mes]);
  const materiales = useMemo(() => kilosPorMaterial(registros, mes), [registros, mes]);
  const ronda = useMemo(
    () => rondaDeHoy(registros, incidencias, contenedores),
    [registros, incidencias, contenedores]
  );
  const rankingMes: FilaRanking[] = (reporte?.areas ?? []).map((a) => ({
    areaId: a.area,
    nombre: a.area,
    dotacion: a.dotacion,
    participantes: a.participantes,
    depositos: a.depositos,
    participacion: a.participacion,
    esMiArea: false,
  }));

  async function descargar() {
    if (!reporte) return;
    setGenerando(true);
    try {
      const resultado = await descargarReporte(reporte);
      if (resultado === "descargado") {
        avisar("Reporte descargado", "El PDF quedó guardado en la carpeta de descargas.");
      }
    } catch (e) {
      avisar("No se pudo generar el PDF", textoDeError(e));
    } finally {
      setGenerando(false);
    }
  }

  const nombreMes = etiquetaMes(mes).split(" ")[0];
  const indicadores = [
    {
      etiqueta: "Depósitos validados",
      valor: `${ind.validados}`,
      detalle: !enCurso
        ? "Conformes o con observación en el mes"
        : ind.porValidar > 0
          ? `${ind.porValidar} esperan la ronda`
          : "Ninguno espera la ronda",
      alerta: false,
    },
    {
      etiqueta: "Kilos estimados",
      valor: formatKg(ind.kgEstimados),
      detalle: "Validados, según la talla de bolsa declarada",
      alerta: false,
    },
    {
      etiqueta: "Rondas hechas",
      valor: `${ind.rondas} de ${ind.diasHabiles}`,
      detalle: `Días con ronda, de ${ind.diasHabiles} días hábiles${enCurso ? " hasta hoy" : ""}`,
      alerta: false,
    },
    {
      etiqueta: "Con observación",
      valor: `${ind.conObservacion}`,
      detalle:
        ind.lotesRevisados > 0
          ? `De ${ind.lotesRevisados} lotes revisados · ${ind.sinMaterial} sin material`
          : "Todavía no hay lotes revisados",
      alerta: ind.conObservacion > 0,
    },
  ];

  return (
    <View>
      <EncabezadoSeccion
        titulo={`Resumen de ${nombreMes}`}
        detalle={enCurso ? "Mes en curso, con los datos de hoy." : `Mes cerrado: ${etiquetaMes(mes)}.`}
        acciones={
          reportePdfDisponible && reporte ? (
            <BotonPanel
              titulo={generando ? "Generando..." : "Descargar reporte del mes"}
              icono="descargar"
              cargando={generando}
              onPress={descargar}
            />
          ) : null
        }
      />

      {meses.length > 1 ? (
        <View className="mb-4">
          <Pildoras opciones={meses.map((m) => ({ valor: m, etiqueta: mesCorto(m) }))} valor={mes} alCambiar={setMes} />
        </View>
      ) : null}

      <Bloque className="flex-row items-stretch px-2 mb-6">
        <View className="flex-[1.5] flex-row items-center px-6">
          <Titulo className="text-oliva text-[60px] leading-[62px]">{reporte?.participacion ?? 0}%</Titulo>
          <View className="flex-1 ml-4">
            <Texto className="text-tinta text-[15px] font-bold">Participación de la planta</Texto>
            <Texto className="text-tinta-suave text-[13px] mt-1 leading-[18px]">
              {reporte?.participantes ?? 0} de {reporte?.dotacion ?? 0} personas reciclaron al menos una vez{" "}
              {enCurso ? "este mes" : "ese mes"}
            </Texto>
          </View>
        </View>
        {indicadores.map((k) => (
          <View key={k.etiqueta} className="flex-1 justify-center px-5 border-l border-piedra-borde">
            <Titulo className={`text-[32px] leading-[36px] ${k.alerta ? "text-ambar-oscuro" : "text-tinta"}`}>
              {k.valor}
            </Titulo>
            <Texto className="text-tinta-media text-[13px] font-semibold mt-0.5">{k.etiqueta}</Texto>
            <Texto className="text-tinta-suave text-xs mt-0.5">{k.detalle}</Texto>
          </View>
        ))}
      </Bloque>

      <View className="flex-row items-start mb-6">
        <View className="flex-1 min-w-0 mr-7">
          <HilerasParticipacion ranking={rankingMes} enCurso={enCurso} />
        </View>
        <View className="w-[360px]">
          <GraficoSemanas semanas={semanas} />
          <View className="mt-5">
            <PorMaterial materiales={materiales} />
          </View>
        </View>
      </View>

      <View className="flex-row items-start">
        <View className="flex-1 min-w-0">
          <TarjetaCampana campana={campana} ranking={ranking} />
        </View>
        {enCurso ? (
          <View className="w-[360px] ml-7">
            <RondaDeHoy filas={ronda} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Una hilera por área: un punto por persona de su dotación, lleno si recicló
 * en el mes. Se lee de un vistazo cuánta gente falta en cada área, que es lo
 * que mide la campaña.
 */
function HilerasParticipacion({ ranking, enCurso }: { ranking: FilaRanking[]; enCurso: boolean }) {
  return (
    <Bloque>
      <EncabezadoBloque
        titulo="Participación por área"
        detalle={`Cada punto es una persona del área. Lleno: recicló ${enCurso ? "este" : "ese"} mes.`}
        derecha={
          <View className="flex-row items-center">
            <View className="w-[9px] h-[9px] rounded-full bg-oliva mr-1.5" />
            <Texto className="text-tinta-media text-xs mr-3.5">Recicló</Texto>
            <View className="w-[9px] h-[9px] rounded-full border-[1.5px] border-piedra-punto mr-1.5" />
            <Texto className="text-tinta-media text-xs">Aún no</Texto>
          </View>
        }
      />
      {ranking.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">Todavía no hay áreas en la planta.</Texto>
      ) : (
        ranking.map((a, i) => (
          <View key={a.areaId} className="flex-row items-center min-h-[46px] py-1.5 border-t border-piedra-linea">
            <Titulo className={`w-[26px] text-[18px] ${i < 3 ? "text-oliva" : "text-[#8B8589]"}`}>{i + 1}</Titulo>
            <View className="w-[180px] pr-3">
              <Texto className="text-tinta text-sm font-semibold" numberOfLines={1}>
                {a.nombre}
              </Texto>
              <Texto className="text-tinta-suave text-[11px]">
                {a.participantes} de {a.dotacion} personas
              </Texto>
            </View>
            <View className="flex-1 min-w-0">
              {a.dotacion <= MAXIMO_PUNTOS ? (
                <View className="flex-row flex-wrap items-center">
                  {Array.from({ length: a.dotacion }, (_, k) => (
                    <View
                      key={k}
                      className={`w-[9px] h-[9px] rounded-full m-[1.5px] ${
                        k < a.participantes ? "bg-oliva" : "border-[1.5px] border-piedra-punto"
                      }`}
                    />
                  ))}
                </View>
              ) : (
                <View className="h-2.5 bg-piedra-linea rounded-full overflow-hidden">
                  <View className="h-2.5 bg-oliva rounded-full" style={{ width: `${a.participacion}%` }} />
                </View>
              )}
            </View>
            <Titulo className="w-[60px] text-right text-tinta text-[21px]">{a.participacion}%</Titulo>
          </View>
        ))
      )}
    </Bloque>
  );
}

/** Barras de los depósitos validados en cada semana del mes. */
function GraficoSemanas({ semanas }: { semanas: Semana[] }) {
  const maximo = Math.max(1, ...semanas.map((s) => s.validados));
  return (
    <Bloque>
      <Texto className="text-tinta text-[15px] font-bold mb-3">Depósitos validados por semana</Texto>
      <View className="flex-row items-end h-[120px] border-b border-piedra-borde">
        {semanas.map((s) => (
          <View key={s.etiqueta} className="flex-1 items-center mx-1.5">
            <Titulo className="text-tinta text-base mb-1">{s.futura ? "" : s.validados}</Titulo>
            <View
              className={`w-full rounded-t-lg ${s.enCurso ? "bg-oliva-medio" : "bg-oliva"}`}
              style={{ height: s.futura ? 0 : Math.max(2, Math.round((s.validados / maximo) * 86)) }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row mt-2">
        {semanas.map((s) => (
          <View key={s.etiqueta} className="flex-1 items-center mx-1.5">
            <Texto className={`text-[11px] text-center ${s.futura ? "text-piedra-punto" : "text-tinta-media"}`}>
              {s.etiqueta}
            </Texto>
            {s.enCurso ? <Texto className="text-tinta-suave text-[11px]">en curso</Texto> : null}
          </View>
        ))}
      </View>
    </Bloque>
  );
}

/** Los kilos validados del mes por material, con su parte del total. */
function PorMaterial({ materiales }: { materiales: KilosMaterial[] }) {
  const total = materiales.reduce((t, m) => t + m.kg, 0);
  return (
    <Bloque>
      <View className="flex-row items-baseline justify-between mb-3">
        <Texto className="text-tinta text-[15px] font-bold">Por material</Texto>
        <Texto className="text-tinta-suave text-xs">{formatKg(total)} estimados</Texto>
      </View>
      {materiales.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">Todavía no hay depósitos validados en el mes.</Texto>
      ) : (
        <>
          <View className="flex-row h-[18px] rounded-md overflow-hidden mb-3" aria-hidden>
            {materiales.map((m, i) => (
              <View
                key={m.material}
                style={{
                  width: `${m.porcentaje}%`,
                  backgroundColor: colorMaterial(m.material),
                  marginLeft: i > 0 ? 2 : 0,
                }}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {materiales.map((m) => (
              <View key={m.material} className="w-1/2 flex-row items-center mb-2 pr-2">
                <View className="w-2.5 h-2.5 rounded-[3px] mr-2" style={{ backgroundColor: colorMaterial(m.material) }} />
                <Texto className="text-tinta-media text-[13px] flex-1" numberOfLines={1}>
                  {m.material} <Texto className="text-tinta font-bold">{formatKg(m.kg)}</Texto> · {m.porcentaje}%
                </Texto>
              </View>
            ))}
          </View>
        </>
      )}
      <Texto className="text-tinta-suave text-xs mt-1">Kilos estimados = talla declarada × factor del material.</Texto>
    </Bloque>
  );
}

/** La campaña vigente y cuántas áreas ya llegan a su meta este mes. */
function TarjetaCampana({ campana, ranking }: { campana: Campana | null; ranking: FilaRanking[] }) {
  if (!campana || campana.terminaEn < Date.now()) {
    return (
      <View className="bg-ambar-claro rounded-[20px] px-6 py-5">
        <Texto className="text-ambar-oscuro text-xs font-semibold">Campaña activa</Texto>
        <Texto className="text-ambar-profundo text-sm mt-1">
          No hay una campaña vigente. Créala en Campañas para que los colaboradores la vean.
        </Texto>
      </View>
    );
  }
  const avance = avanceAreas(campana.metaParticipacion, ranking);
  const cumplen = avance.filter((a) => a.cumple).length;
  return (
    <View className="bg-ambar-claro rounded-[20px] px-6 py-5">
      <View className="flex-row items-baseline justify-between">
        <Texto className="text-ambar-oscuro text-xs font-semibold">
          Campaña activa · termina el {diaYMes(campana.terminaEn)}
        </Texto>
        <Titulo className="text-[20px]">
          {cumplen} de {avance.length} áreas
        </Titulo>
      </View>
      <Titulo className="text-[24px] leading-[28px] mt-1">{campana.nombre}</Titulo>
      <View className="h-2 bg-ambar-medio rounded-full overflow-hidden mt-3">
        <View
          className="h-2 bg-ambar rounded-full"
          style={{ width: `${avance.length > 0 ? Math.round((cumplen / avance.length) * 100) : 0}%` }}
        />
      </View>
      <View className="flex-row items-center mt-3">
        <Icono nombre="regalo" tamano={18} color="#A8732F" />
        <Texto className="text-ambar-profundo text-sm ml-2 flex-1">
          {campana.incentivo} · meta {campana.metaParticipacion}% por área
        </Texto>
      </View>
    </View>
  );
}

/** La ronda de hoy, un contenedor por fila. */
function RondaDeHoy({ filas }: { filas: FilaRonda[] }) {
  const porRevisar = filas.filter((f) => f.estado !== "vacio");
  const revisados = porRevisar.filter((f) => f.estado !== "pendiente").length;

  return (
    <Bloque>
      <View className="flex-row items-baseline justify-between mb-2">
        <Titulo className="text-[22px]">Ronda de hoy</Titulo>
        {porRevisar.length > 0 ? (
          <Texto className="text-tinta-suave text-xs">
            {revisados} de {porRevisar.length} revisados
          </Texto>
        ) : null}
      </View>
      {filas.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">La planta todavía no tiene contenedores.</Texto>
      ) : (
        // Los contenedores sin nada que revisar van en una sola línea al final:
        // con muchos contenedores, listarlos todos tapaba lo importante.
        porRevisar.map((f) => {
          const estado = ESTADO_RONDA[f.estado];
          const detalle =
            f.revisadoEn !== null
              ? `${f.revisados} depósito${f.revisados === 1 ? "" : "s"} · ${hora(f.revisadoEn)}`
              : f.pendientes > 0
                ? `${f.pendientes} por validar`
                : "Nada que revisar";
          return (
            <View key={f.codigo} className="flex-row items-center justify-between py-2.5 border-t border-piedra-linea">
              <View className="flex-1 min-w-0 pr-2">
                <Texto className="text-tinta text-sm font-semibold" numberOfLines={1}>
                  {f.punto || "Sin punto"} · {f.nombre}
                </Texto>
                <Texto className="text-tinta-suave text-xs mt-0.5">{detalle}</Texto>
              </View>
              <Insignia texto={estado.texto} tono={estado.tono} />
            </View>
          );
        })
      )}
      {filas.length > porRevisar.length ? (
        <Texto className="text-tinta-suave text-xs pt-3 border-t border-piedra-linea">
          {filas.length - porRevisar.length} contenedor{filas.length - porRevisar.length === 1 ? "" : "es"} sin
          depósitos que revisar hoy.
        </Texto>
      ) : null}
    </Bloque>
  );
}
