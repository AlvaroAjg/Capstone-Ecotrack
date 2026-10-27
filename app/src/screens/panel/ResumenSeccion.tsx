import React, { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useEcoTrack, type FilaRanking } from "../../state/EcoTrack";
import { formatKg, porcentaje } from "../../lib/formato";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { META_RONDAS, ULTIMO_MES, mesesDelResumen, mesesReportables, reporteDePlanta } from "../../lib/reportePlanta";
import { descargarReporte, reportePdfDisponible } from "../../lib/reportePdf";
import { avisar, textoDeError } from "../../lib/dialogos";
import {
  indicadoresDelMes,
  kilosPorMaterial,
  ultimaActividad,
  validadosPorSemana,
  type KilosMaterial,
  type Semana,
} from "../../lib/resumenPanel";
import { Bloque, BotonPanel, EncabezadoBloque, EncabezadoSeccion, Icono, Texto, Titulo, colorMaterial } from "./estilo";

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "2026-10" → "Octubre 2026", para el selector de meses. */
function mesLargo(mes: string): string {
  const [nombre, , anio] = etiquetaMes(mes).split(" ");
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** "Datos actualizados hoy a las 08:30", o el día si lo último no fue hoy. */
function textoActualizacion(ultima: number | null): string {
  if (ultima === null) return "Todavía no hay actividad en la planta.";
  const hoy = new Date().toDateString() === new Date(ultima).toDateString();
  const dia = hoy ? "hoy" : `el ${new Date(ultima).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}`;
  return `Datos actualizados ${dia} a las ${hora(ultima)}`;
}

/**
 * Hasta cuántas personas se dibujan como puntos en las hileras de
 * participación. Un área más grande se muestra como barra: tantos puntos ya no
 * caben en la fila.
 */
const MAXIMO_PUNTOS = 60;

/**
 * Resumen de la planta en el mes elegido: indicadores, participación de cada
 * área y depósitos por semana y por material. La ronda de hoy y la campaña
 * están en la franja de arriba, que se ve en todas las secciones. Se calcula
 * con lo que el estado ya escucha en vivo (ver lib/resumenPanel.ts y
 * lib/reportePlanta.ts).
 */
export default function ResumenSeccion() {
  const { miPlanta, areas, registros, incidencias, retiros } = useEcoTrack();
  const mesActual = mesDe(Date.now());
  const meses = useMemo(
    () => mesesDelResumen(miPlanta ? mesesReportables(miPlanta.id, registros, incidencias) : [mesActual]).slice(0, 6),
    [miPlanta, registros, incidencias, mesActual]
  );
  // Pasado el último mes del proyecto, el Resumen abre en ese mes.
  const [mes, setMes] = useState(mesActual <= ULTIMO_MES ? mesActual : ULTIMO_MES);
  const [generando, setGenerando] = useState(false);
  const enCurso = mes === mesActual;
  // Un mes que todavía no llega se puede elegir de antemano: todo sale en cero.
  const futuro = mes > mesActual;

  // La participación de cada área sale del reporte del mes: se calcula con los
  // depósitos, así sirve igual para el mes en curso y para los anteriores.
  const reporte = useMemo(
    () => (miPlanta ? reporteDePlanta(miPlanta, areas, mes, registros, incidencias, retiros) : null),
    [miPlanta, areas, mes, registros, incidencias, retiros]
  );
  const ind = useMemo(() => indicadoresDelMes(registros, incidencias, mes), [registros, incidencias, mes]);
  const semanas = useMemo(() => validadosPorSemana(registros, mes), [registros, mes]);
  const materiales = useMemo(() => kilosPorMaterial(registros, mes), [registros, mes]);
  const ultima = useMemo(() => ultimaActividad(registros, incidencias), [registros, incidencias]);
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

  const pctRondas = porcentaje(ind.rondas, ind.diasHabiles);
  const indicadores = [
    {
      etiqueta: "Depósitos validados",
      valor: `${ind.validados}`,
      detalle: "Con QR y confirmados en ronda",
      alerta: false,
    },
    {
      etiqueta: "Masa estimada",
      valor: formatKg(ind.kgEstimados),
      detalle: "Según el tamaño declarado",
      alerta: false,
    },
    {
      etiqueta: "Rondas completadas",
      valor: `${ind.rondas} de ${ind.diasHabiles}`,
      detalle: `${pctRondas}% de los días hábiles, meta ${META_RONDAS}%`,
      alerta: ind.diasHabiles > 0 && pctRondas < META_RONDAS,
    },
    {
      etiqueta: "Lotes con observación",
      valor: `${porcentaje(ind.conObservacion, ind.lotesRevisados)}%`,
      detalle:
        ind.lotesRevisados > 0
          ? `${ind.conObservacion} de ${ind.lotesRevisados} y ${ind.sinMaterial} sin material`
          : "Todavía no hay lotes revisados",
      alerta: ind.conObservacion > 0,
    },
  ];

  return (
    <View>
      {/* z-10: la lista de meses se despliega sobre los indicadores. */}
      <View className="z-10">
        <EncabezadoSeccion
          titulo={`Resumen de ${etiquetaMes(mes).split(" ")[0]}`}
          detalle={
            enCurso
              ? textoActualizacion(ultima)
              : futuro
                ? `Todavía no empieza: sus datos aparecen desde el 1 de ${etiquetaMes(mes)}.`
                : `Mes cerrado: ${etiquetaMes(mes)}.`
          }
          acciones={
            <>
              <SelectorMes meses={meses} valor={mes} alCambiar={setMes} />
              {reportePdfDisponible && reporte && !futuro ? (
                <BotonPanel
                  titulo={generando ? "Generando..." : "Descargar reporte del mes"}
                  icono="descargar"
                  cargando={generando}
                  onPress={descargar}
                  className="ml-2.5"
                />
              ) : null}
            </>
          }
        />
      </View>

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

      <View className="flex-row items-stretch">
        <View className="flex-1 min-w-0 mr-7">
          <HilerasParticipacion ranking={rankingMes} enCurso={enCurso} />
        </View>
        <View className="w-[360px]">
          <View className="flex-1">
            <GraficoSemanas semanas={semanas} />
          </View>
          <View className="flex-1 mt-5">
            <PorMaterial materiales={materiales} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Botón con el mes elegido que despliega los meses con actividad. */
function SelectorMes({
  meses,
  valor,
  alCambiar,
}: {
  meses: string[];
  valor: string;
  alCambiar: (mes: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const varios = meses.length > 1;

  return (
    <View className="relative">
      <TouchableOpacity
        onPress={() => setAbierto((v) => !v)}
        disabled={!varios}
        accessibilityRole="button"
        accessibilityLabel={`Mes: ${mesLargo(valor)}`}
        accessibilityState={{ expanded: abierto, disabled: !varios }}
        className="h-11 flex-row items-center px-4 bg-white border border-piedra-control rounded-[10px]"
      >
        <Icono nombre="calendario" tamano={18} color="#221C20" />
        <Texto className="text-tinta text-sm font-medium mx-2">{mesLargo(valor)}</Texto>
        {varios ? <Icono nombre="abajo" tamano={16} color="#221C20" /> : null}
      </TouchableOpacity>

      {abierto ? (
        <View
          className="absolute right-0 top-[52px] w-[200px] bg-white rounded-2xl border border-piedra-borde py-1.5"
          style={{ shadowColor: "#2B1424", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }}
        >
          {meses.map((m) => {
            const elegido = m === valor;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  alCambiar(m);
                  setAbierto(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: elegido }}
                className={`px-4 py-2.5 ${elegido ? "bg-oliva-claro" : ""}`}
              >
                <Texto className={`text-sm ${elegido ? "text-oliva-oscuro font-bold" : "text-tinta"}`}>
                  {mesLargo(m)}
                </Texto>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
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
    <Bloque className="flex-1">
      <EncabezadoBloque
        titulo="Hileras de participación"
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
    <Bloque className="flex-1">
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
            {s.enCurso ? <Texto className="text-tinta-suave text-[11px]">En curso</Texto> : null}
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
    <Bloque className="flex-1">
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
                  {m.material} <Texto className="text-tinta font-bold">{formatKg(m.kg)}</Texto>
                </Texto>
              </View>
            ))}
          </View>
        </>
      )}
      <Texto className="text-tinta-suave text-xs mt-auto pt-1">
        La masa se estima con el tamaño que declara cada persona.
      </Texto>
    </Bloque>
  );
}
