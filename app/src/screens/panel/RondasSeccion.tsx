import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useEcoTrack, type Usuario } from "../../state/EcoTrack";
import { observacionesDelMes, rondasDelMes, type DiaRonda, type EstadoDia, type Observacion } from "../../lib/rondas";
import {
  duracionPromedioRonda,
  indicadoresDelMes,
  inicioDeRonda,
  rondaDeHoy,
  rondaPorPunto,
  type PuntoRonda,
} from "../../lib/resumenPanel";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { META_RONDAS, ULTIMO_MES, mesesDelResumen, mesesReportables } from "../../lib/reportePlanta";
import { formatDuracion, porcentaje } from "../../lib/formato";
import { escucharPersonas } from "../../services/personas";
import ValidacionContenedores from "../../components/ValidacionContenedores";
import {
  Bloque,
  BotonPanel,
  ESTADO_RONDA,
  EncabezadoBloque,
  EncabezadoSeccion,
  Insignia,
  SelectorMes,
  Texto,
  Titulo,
} from "./estilo";

/** Cómo se pinta cada día del calendario. */
const ASPECTO_DIA: Record<EstadoDia, { caja: string; texto: string; etiqueta: string }> = {
  completada: { caja: "bg-oliva border-oliva", texto: "text-white", etiqueta: "Ronda hecha" },
  noRealizada: { caja: "bg-rojizo-claro border-[#A3392B]", texto: "text-rojizo-oscuro", etiqueta: "No se hizo" },
  enCurso: { caja: "bg-white border-ambar", texto: "text-ambar-oscuro", etiqueta: "Hoy, pendiente" },
  sinDepositos: { caja: "bg-piedra-linea border-piedra-linea", texto: "text-tinta-suave", etiqueta: "Sin depósitos" },
  finDeSemana: { caja: "bg-piedra-linea border-piedra-linea", texto: "text-tinta-suave", etiqueta: "Fin de semana" },
  futuro: { caja: "bg-white border-piedra-control", texto: "text-tinta-suave", etiqueta: "Próxima" },
};

/** Lo que pasó después de cada observación (ver lib/avisos.ts). */
const EFECTO: Record<Observacion["tipo"], string> = {
  observacion: "Validado y se avisó a la planta",
  sinMaterial: "Rechazado y se avisó a quienes registraron",
};

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "24 sep", para la lista de observaciones. */
function diaCorto(t: number): string {
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

/**
 * Las rondas del validador: indicadores del mes, un calendario con si pasó
 * cada día, la ronda de hoy por punto limpio y lo que encontró en el mes.
 * Sirve para ver si la validación diaria se está haciendo (ver lib/rondas.ts).
 * Si a un punto le falta la ronda, el administrador puede completarla desde
 * aquí: las reglas lo dejan validar los depósitos de su planta.
 */
export default function RondasSeccion() {
  const { usuario, miPlanta, registros, incidencias, contenedores } = useEcoTrack();
  const mesActual = mesDe(Date.now());
  const meses = useMemo(
    () => mesesDelResumen(miPlanta ? mesesReportables(miPlanta.id, registros, incidencias) : [mesActual]).slice(0, 6),
    [miPlanta, registros, incidencias, mesActual]
  );
  const [mes, setMes] = useState(mesActual <= ULTIMO_MES ? mesActual : ULTIMO_MES);
  const enCurso = mes === mesActual;

  const dias = useMemo(() => rondasDelMes(registros, incidencias, Date.now(), mes), [registros, incidencias, mes]);
  const ind = useMemo(() => indicadoresDelMes(registros, incidencias, mes), [registros, incidencias, mes]);
  const duracion = useMemo(() => duracionPromedioRonda(registros, incidencias, mes), [registros, incidencias, mes]);
  const observaciones = useMemo(
    () => observacionesDelMes(registros, incidencias, contenedores, Date.now(), mes),
    [registros, incidencias, contenedores, mes]
  );

  const pctRondas = porcentaje(ind.rondas, ind.diasHabiles);
  const indicadores = [
    {
      valor: `${ind.rondas} de ${ind.diasHabiles}`,
      etiqueta: "Rondas completadas",
      detalle: `${pctRondas}% de los días hábiles, meta ${META_RONDAS}%`,
      tono: ind.diasHabiles > 0 && pctRondas < META_RONDAS ? "text-ambar-oscuro" : "text-oliva",
    },
    {
      valor: duracion === null ? "—" : formatDuracion(duracion),
      etiqueta: "Duración promedio",
      detalle: "De la primera a la última revisión del día",
      tono: "text-tinta",
    },
    {
      valor: `${ind.conObservacion}`,
      etiqueta: "Lotes con observación",
      detalle:
        ind.lotesRevisados > 0
          ? `${porcentaje(ind.conObservacion, ind.lotesRevisados)}% de ${ind.lotesRevisados} lotes revisados`
          : "Todavía no hay lotes revisados",
      tono: ind.conObservacion > 0 ? "text-ambar-oscuro" : "text-tinta",
    },
    {
      valor: `${ind.sinMaterial}`,
      etiqueta: "Lotes sin material",
      detalle: `${ind.rechazados} depósito${ind.rechazados === 1 ? "" : "s"} rechazado${ind.rechazados === 1 ? "" : "s"}`,
      tono: ind.sinMaterial > 0 ? "text-rojizo-oscuro" : "text-tinta",
    },
  ];

  if (!usuario?.plantaId) return null;

  return (
    <View>
      {/* z-10: la lista de meses se despliega sobre los indicadores. */}
      <View className="z-10">
        <EncabezadoSeccion
          titulo="Rondas de validación"
          detalle="Una ronda al día. En cada punto limpio se marca Conforme, Con observación o Sin material."
          acciones={<SelectorMes meses={meses} valor={mes} alCambiar={setMes} />}
        />
      </View>

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
        <View className="w-[440px] mr-7">
          <Calendario dias={dias} mes={mes} />
        </View>
        {/* En un mes que ya pasó no hay ronda de hoy: las observaciones ocupan su lugar. */}
        <View className="flex-1 min-w-0">
          {enCurso ? (
            <RondaDeHoy plantaId={usuario.plantaId} />
          ) : (
            <Observaciones observaciones={observaciones} compacta />
          )}
        </View>
      </View>

      {enCurso ? <Observaciones observaciones={observaciones} /> : null}
    </View>
  );
}

/** El mes en un calendario de lunes a domingo, con el estado de la ronda de cada día. */
function Calendario({ dias, mes }: { dias: DiaRonda[]; mes: string }) {
  // El calendario parte el lunes: se rellenan los días antes del 1.
  const relleno = (new Date(dias[0].dia).getDay() + 6) % 7;
  const celdas: (DiaRonda | null)[] = [...Array<null>(relleno).fill(null), ...dias];
  const hoy = new Date().toDateString();

  return (
    <Bloque>
      <Titulo className="text-[24px] mb-4">Calendario de {etiquetaMes(mes).split(" ")[0]}</Titulo>
      <View className="flex-row mb-2">
        {DIAS_SEMANA.map((d, i) => (
          <Texto key={i} className="flex-1 text-center text-tinta-suave text-xs font-semibold">
            {d}
          </Texto>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {celdas.map((d, i) => {
          if (!d) return <View key={`r${i}`} style={{ width: `${100 / 7}%` }} className="p-1" />;
          const esHoy = new Date(d.dia).toDateString() === hoy;
          const aspecto = ASPECTO_DIA[d.estado];
          return (
            <View key={d.dia} style={{ width: `${100 / 7}%` }} className="p-1">
              <View
                accessibilityLabel={`${new Date(d.dia).getDate()}: ${esHoy ? "hoy, " : ""}${aspecto.etiqueta}`}
                className={`h-11 rounded-[10px] border items-center justify-center ${aspecto.caja}`}
                // Hoy lleva siempre el anillo ámbar, aunque la ronda ya esté hecha. Va en
                // style y no en className: dos colores de borde en className chocan.
                style={esHoy ? { borderColor: "#A8732F", borderWidth: 2.5 } : undefined}
              >
                <Texto className={`text-sm font-bold ${aspecto.texto}`}>{new Date(d.dia).getDate()}</Texto>
              </View>
            </View>
          );
        })}
      </View>
      <View className="flex-row flex-wrap mt-3">
        {[
          { caja: ASPECTO_DIA.completada.caja, texto: "Completada" },
          { caja: ASPECTO_DIA.noRealizada.caja, texto: "No realizada" },
          { caja: "bg-white border-ambar border-2", texto: "Hoy" },
          { caja: ASPECTO_DIA.finDeSemana.caja, texto: "Sin ronda: fin de semana o sin depósitos" },
        ].map((l) => (
          <View key={l.texto} className="flex-row items-center mr-4 mt-1">
            <View className={`w-3 h-3 rounded-[4px] border mr-1.5 ${l.caja}`} />
            <Texto className="text-tinta-media text-xs">{l.texto}</Texto>
          </View>
        ))}
      </View>
    </Bloque>
  );
}

/**
 * La ronda de hoy por punto limpio: quién la hace, desde qué hora y cómo quedó
 * cada punto. Si quedan puntos pendientes, el administrador puede
 * completarlos desde aquí con la misma vista del validador.
 */
function RondaDeHoy({ plantaId }: { plantaId: string }) {
  const { registros, incidencias, contenedores, validarRegistros, rechazarRegistros, reportarYValidar } = useEcoTrack();
  const [personas, setPersonas] = useState<Usuario[]>([]);
  const [completando, setCompletando] = useState(false);
  const puntos = useMemo(
    () => rondaPorPunto(rondaDeHoy(registros, incidencias, contenedores)),
    [registros, incidencias, contenedores]
  );
  const inicio = useMemo(() => inicioDeRonda(registros, incidencias), [registros, incidencias]);
  const pendientes = useMemo(() => registros.filter((r) => r.estado === "pendiente"), [registros]);

  // Para decir quién hace la ronda: el administrador ve los nombres de su planta.
  useEffect(() => escucharPersonas(plantaId, setPersonas), [plantaId]);

  const revisados = puntos.filter((p) => p.estado !== "pendiente").length;
  const validador = inicio ? personas.find((p) => p.id === inicio.validadorId)?.nombre ?? "El validador" : null;
  const hoy = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric" });

  let detalle: string;
  let insignia: { texto: string; tono: "oliva" | "ambar" | "gris" } | null = null;
  if (puntos.length === 0) {
    detalle = "Hoy ningún punto limpio tiene depósitos que revisar.";
  } else if (!inicio) {
    detalle = `Todavía no empieza: quedan ${puntos.length} punto${puntos.length === 1 ? "" : "s"} por revisar.`;
    insignia = { texto: "Sin empezar", tono: "gris" };
  } else {
    detalle = `${validador} empezó a las ${hora(inicio.desde)} y lleva ${revisados} de ${puntos.length} punto${
      puntos.length === 1 ? "" : "s"
    }.`;
    insignia = revisados < puntos.length ? { texto: "En curso", tono: "ambar" } : { texto: "Completa", tono: "oliva" };
  }

  return (
    <Bloque>
      <EncabezadoBloque
        titulo={`Ronda de hoy, ${hoy}`}
        detalle={detalle}
        derecha={insignia ? <Insignia texto={insignia.texto} tono={insignia.tono} /> : null}
      />
      {puntos.length > 0 ? (
        <>
          <View className="flex-row border-b-[1.5px] border-vino pb-2">
            <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Punto limpio</Texto>
            <Texto className="w-40 text-tinta-media text-[13px] font-semibold">Resultado</Texto>
            <Texto className="w-14 text-tinta-media text-[13px] font-semibold">Hora</Texto>
            <Texto className="w-20 text-right text-tinta-media text-[13px] font-semibold pr-4">Depósitos</Texto>
            <Texto className="flex-[1.2] text-tinta-media text-[13px] font-semibold">Nota del validador</Texto>
          </View>
          {puntos.map((p) => (
            <FilaPunto key={p.punto} punto={p} />
          ))}
        </>
      ) : null}

      {pendientes.length > 0 ? (
        <View className="flex-row items-center justify-between mt-4">
          <Texto className="text-tinta-suave text-xs flex-1 pr-4 leading-[17px]">
            {pendientes.length} depósito{pendientes.length === 1 ? "" : "s"} esperan la ronda. Si el validador no
            puede pasar, puedes revisarlos tú: quedan firmados a tu nombre.
          </Texto>
          <BotonPanel
            titulo={completando ? "Ocultar" : "Completar yo los pendientes"}
            variante="suave"
            compacto
            onPress={() => setCompletando((v) => !v)}
          />
        </View>
      ) : null}

      {completando && pendientes.length > 0 ? (
        <View className="bg-piedra rounded-2xl p-4 mt-4">
          <ValidacionContenedores
            plantaId={plantaId}
            pendientes={pendientes}
            alValidar={validarRegistros}
            alRechazar={rechazarRegistros}
            alReportar={reportarYValidar}
          />
        </View>
      ) : null}
    </Bloque>
  );
}

function FilaPunto({ punto }: { punto: PuntoRonda }) {
  const estado = ESTADO_RONDA[punto.estado];
  const nota =
    punto.contaminantes.length > 0
      ? `Se encontró ${punto.contaminantes.map((c) => c.toLowerCase()).join(" y ")}`
      : "—";
  return (
    <View className="flex-row items-center py-2.5 border-b border-piedra-linea">
      <Texto className="flex-1 text-tinta text-sm font-semibold pr-2" numberOfLines={1}>
        {punto.punto}
      </Texto>
      <View className="w-40 items-start">
        <Insignia texto={estado.texto} tono={estado.tono} icono={estado.icono} />
      </View>
      <Texto className="w-14 text-tinta-media text-[13px]">
        {punto.revisadoEn !== null ? hora(punto.revisadoEn) : "—"}
      </Texto>
      <Texto className="w-20 text-right text-tinta text-[13px] pr-4">
        {punto.estado === "pendiente" ? punto.pendientes : punto.revisados}
      </Texto>
      <Texto className="flex-[1.2] text-tinta-media text-[13px]">{nota}</Texto>
    </View>
  );
}

/**
 * Lo que el validador encontró en el mes y qué pasó después. Compacta, en dos
 * líneas por observación, para cuando va en la columna del lado del calendario.
 */
function Observaciones({ observaciones, compacta = false }: { observaciones: Observacion[]; compacta?: boolean }) {
  return (
    <Bloque>
      <EncabezadoBloque
        titulo="Observaciones del mes"
        derecha={
          observaciones.length > 0 ? (
            <Texto className="text-tinta-suave text-xs">
              {observaciones.length} lote{observaciones.length === 1 ? "" : "s"}
            </Texto>
          ) : null
        }
      />
      {observaciones.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">
          Este mes el validador no ha encontrado contaminación ni contenedores sin material.
        </Texto>
      ) : compacta ? (
        observaciones.map((o) => (
          <View key={`${o.tipo}-${o.codigo}-${o.fecha}`} className="py-3 border-t border-piedra-linea">
            <View className="flex-row items-center justify-between">
              <Texto className="flex-1 text-tinta text-sm font-semibold pr-2" numberOfLines={1}>
                {o.punto || "Sin punto"} · {o.contenedor}
              </Texto>
              <Insignia
                texto={o.tipo === "observacion" ? "Con observación" : "Sin material"}
                tono={o.tipo === "observacion" ? "ambar" : "rojo"}
                icono={o.tipo === "observacion" ? "alerta" : "cerrar"}
              />
            </View>
            <Texto className="text-tinta-suave text-[13px] mt-1">
              {diaCorto(o.fecha)} · {o.detalle} · {EFECTO[o.tipo]}
            </Texto>
          </View>
        ))
      ) : (
        observaciones.map((o) => (
          <View key={`${o.tipo}-${o.codigo}-${o.fecha}`} className="flex-row items-center py-3 border-t border-piedra-linea">
            <Texto className="w-16 text-tinta-media text-[13px]">{diaCorto(o.fecha)}</Texto>
            <Texto className="flex-1 text-tinta text-sm font-semibold pr-2" numberOfLines={1}>
              {o.punto || "Sin punto"} · {o.contenedor}
            </Texto>
            <View className="w-40 items-start">
              <Insignia
                texto={o.tipo === "observacion" ? "Con observación" : "Sin material"}
                tono={o.tipo === "observacion" ? "ambar" : "rojo"}
                icono={o.tipo === "observacion" ? "alerta" : "cerrar"}
              />
            </View>
            <Texto className="flex-1 text-tinta-media text-[13px] pr-2">{o.detalle}</Texto>
            <Texto className="w-64 text-tinta-suave text-[13px]">{EFECTO[o.tipo]}</Texto>
          </View>
        ))
      )}
    </Bloque>
  );
}
