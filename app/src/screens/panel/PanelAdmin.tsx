import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useEcoTrack, type Usuario } from "../../state/EcoTrack";
import ContenedoresSeccion from "./ContenedoresSeccion";
import PersonasSeccion from "./PersonasSeccion";
import IncentivoSeccion from "./IncentivoSeccion";
import RondasSeccion from "./RondasSeccion";
import RetirosSeccion from "./RetirosSeccion";
import { usePantallaCompleta } from "../../components/ui";
import ResumenSeccion from "./ResumenSeccion";
import CampanaPanel from "./CampanaPanel";
import { inicioDeRonda, rondaDeHoy, rondaPorPunto } from "../../lib/resumenPanel";
import { escucharPersonas } from "../../services/personas";
import { avanceAreas } from "../../lib/incentivo";
import { ESTADO_RONDA, Icono, Insignia, Logo, Texto, Titulo, iniciales } from "./estilo";

export type SeccionPanel =
  | "resumen"
  | "contenedores"
  | "personas"
  | "rondas"
  | "incentivo"
  | "retiros";

const SECCIONES: { id: SeccionPanel; etiqueta: string }[] = [
  { id: "resumen", etiqueta: "Resumen" },
  { id: "contenedores", etiqueta: "Puntos limpios" },
  { id: "personas", etiqueta: "Personas y áreas" },
  { id: "rondas", etiqueta: "Rondas" },
  { id: "incentivo", etiqueta: "Campañas" },
  { id: "retiros", etiqueta: "Retiros y reportes" },
];

/**
 * Bajo este ancho la barra superior se compacta (sin el nombre de la planta
 * junto al logo) para que las secciones quepan en una línea. El panel se
 * muestra desde 1024 px (ver App.tsx).
 */
const ANCHO_AMPLIO = 1280;

/**
 * Panel web del administrador: una barra superior con las secciones, una
 * franja con lo de hoy (la ronda, la campaña y los avisos) y la sección
 * elegida debajo. Solo se muestra en el navegador del computador (ver
 * App.tsx): el administrador trabaja con tablas y formularios que no caben en
 * un teléfono.
 */
export default function PanelAdmin() {
  const { errorDatos } = useEcoTrack();
  const [seccion, setSeccion] = useState<SeccionPanel>("resumen");
  const { width } = useWindowDimensions();
  const amplio = width >= ANCHO_AMPLIO;

  // El panel necesita la pantalla completa del computador, no el ancho de un teléfono.
  usePantallaCompleta();

  return (
    <View className="flex-1 bg-piedra">
      {/* z-20: los menús de la barra (avisos y cuenta) se despliegan sobre la franja y la sección. */}
      <View className="z-20">
        <BarraSuperior seccion={seccion} alCambiar={setSeccion} amplio={amplio} />
      </View>
      <FranjaDeHoy alAbrir={setSeccion} padding={amplio ? 40 : 24} />

      {/* Con key por sección, cada una se abre desde arriba y no donde quedó la anterior. */}
      <ScrollView
        key={seccion}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: amplio ? 40 : 24, paddingTop: 28, paddingBottom: 40 }}
      >
        {errorDatos ? (
          <View className="bg-rojizo-claro rounded-xl px-4 py-3 mb-6">
            <Texto className="text-rojizo-oscuro text-sm">{errorDatos}</Texto>
          </View>
        ) : null}

        <ContenidoSeccion seccion={seccion} />
      </ScrollView>
    </View>
  );
}

function BarraSuperior({
  seccion,
  alCambiar,
  amplio,
}: {
  seccion: SeccionPanel;
  alCambiar: (s: SeccionPanel) => void;
  amplio: boolean;
}) {
  const { miPlanta, registros, incidencias, contenedores } = useEcoTrack();
  // Contenedores que esperan la ronda de hoy: se marcan en la pestaña Rondas.
  const pendientesRonda = useMemo(
    () => rondaDeHoy(registros, incidencias, contenedores).filter((f) => f.estado === "pendiente").length,
    [registros, incidencias, contenedores]
  );

  return (
    <View
      role="navigation"
      accessibilityLabel="Secciones del panel"
      className="h-[76px] bg-vino flex-row items-center"
      style={{ paddingHorizontal: amplio ? 40 : 24 }}
    >
      <TouchableOpacity
        onPress={() => alCambiar("resumen")}
        accessibilityRole="link"
        accessibilityLabel="RecyTrack, ir al resumen"
        className="flex-row items-center mr-6"
      >
        <Logo tamano={36} />
        <View className="ml-3">
          <Titulo className="text-vino-texto text-[22px] leading-[24px]">RecyTrack</Titulo>
          {amplio ? (
            <Texto className="text-vino-suave text-[11px] mt-0.5" numberOfLines={1}>
              {miPlanta?.nombre ?? "Sin planta"}
            </Texto>
          ) : null}
        </View>
      </TouchableOpacity>

      <View className="flex-1 flex-row items-center justify-center">
        {SECCIONES.map((s) => {
          const activa = s.id === seccion;
          const insignia = s.id === "rondas" && !activa && pendientesRonda > 0 ? pendientesRonda : 0;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => alCambiar(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              className={`h-10 flex-row items-center rounded-full mx-0.5 ${activa ? "bg-piedra" : ""}`}
              style={{ paddingHorizontal: amplio ? 14 : 10 }}
            >
              <Texto
                numberOfLines={1}
                className={`text-sm ${activa ? "text-vino font-bold" : "text-vino-nav font-medium"}`}
              >
                {s.etiqueta}
              </Texto>
              {insignia > 0 ? (
                <View className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-ambar-vivo items-center justify-center">
                  <Texto className="text-vino text-[11px] font-bold">{insignia}</Texto>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row items-center ml-6">
        <CampanaPanel />
        <MenuCuenta />
      </View>
    </View>
  );
}

/** El círculo con las iniciales del administrador: abre su nombre y Cerrar sesión. */
function MenuCuenta() {
  const { usuario, miPlanta, cerrarSesion } = useEcoTrack();
  const [abierto, setAbierto] = useState(false);
  const nombre = usuario?.nombre || "Administrador";

  return (
    <View className="relative ml-2.5">
      <TouchableOpacity
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Mi cuenta, ${nombre}`}
        accessibilityState={{ expanded: abierto }}
        className="w-[42px] h-[42px] rounded-full bg-ambar-vivo items-center justify-center"
      >
        <Texto className="text-vino text-sm font-bold">{iniciales(nombre)}</Texto>
      </TouchableOpacity>

      {abierto ? (
        <View
          className="absolute right-0 top-[52px] w-[280px] bg-white rounded-2xl border border-piedra-borde py-2"
          style={{ shadowColor: "#2B1424", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }}
        >
          <View className="px-4 py-2">
            <Texto className="text-tinta text-[15px] font-bold" numberOfLines={1}>
              {nombre}
            </Texto>
            <Texto className="text-tinta-suave text-xs mt-0.5" numberOfLines={1}>
              Administrador · {miPlanta?.nombre ?? "Sin planta"}
            </Texto>
          </View>
          <TouchableOpacity
            onPress={() => cerrarSesion()}
            accessibilityRole="button"
            className="flex-row items-center px-4 py-3 border-t border-piedra-linea mt-1"
          >
            <Icono nombre="salir" tamano={18} color="#4D474B" />
            <Texto className="text-tinta-media text-sm font-semibold ml-2.5">Cerrar sesión</Texto>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function hora(t: number): string {
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "jueves 24", para la franja de hoy. */
function hoyCorto(): string {
  return new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric" });
}

/**
 * Lo de hoy en la planta, en una franja bajo la barra: cómo va la ronda del
 * validador por punto limpio, la campaña y lo que pide atención en los
 * puntos. Tocar la ronda o la campaña abre su sección.
 */
function FranjaDeHoy({ alAbrir, padding }: { alAbrir: (s: SeccionPanel) => void; padding: number }) {
  const { usuario, registros, incidencias, contenedores, campana, ranking, avisos, porRetirar } = useEcoTrack();
  const [personas, setPersonas] = useState<Usuario[]>([]);
  const puntos = useMemo(
    () => rondaPorPunto(rondaDeHoy(registros, incidencias, contenedores)),
    [registros, incidencias, contenedores]
  );
  const inicio = useMemo(() => inicioDeRonda(registros, incidencias), [registros, incidencias]);
  const revisados = puntos.filter((p) => p.estado !== "pendiente").length;
  const vigente = campana !== null && campana.terminaEn >= Date.now();
  const avance = vigente ? avanceAreas(campana.metaParticipacion, ranking) : [];
  const cumplen = avance.filter((a) => a.cumple).length;

  // Para decir quién hace la ronda: el administrador ve los nombres de su planta.
  useEffect(() => {
    if (!usuario?.plantaId) return;
    return escucharPersonas(usuario.plantaId, setPersonas);
  }, [usuario?.plantaId]);
  const validador = inicio ? personas.find((p) => p.id === inicio.validadorId)?.nombre ?? "el validador" : null;

  let ronda: { titulo: string; detalle: string };
  if (puntos.length === 0) {
    ronda = { titulo: "Ronda de hoy:", detalle: "ningún punto limpio tiene depósitos que revisar" };
  } else {
    const cuenta = `${revisados} de ${puntos.length} punto${puntos.length === 1 ? "" : "s"}`;
    if (!inicio) ronda = { titulo: "Ronda de hoy:", detalle: `${cuenta}, todavía no empieza` };
    else
      ronda = {
        titulo: revisados < puntos.length ? "Ronda en curso:" : "Ronda completa:",
        detalle: `${cuenta}, ${validador} desde las ${hora(inicio.desde)}`,
      };
  }

  // Lo que pide atención, de lo más urgente a lo menos: contenedores con algo
  // que no correspondía, los listos para retiro y los que esperan la ronda.
  const atencion = [
    ...avisos.filter((a) => a.tono === "alerta").map((a) => ({ id: a.id, texto: a.titulo, alerta: true })),
    ...porRetirar.map((c) => ({
      id: c.contenedor,
      texto: `${c.punto || "Sin punto"}: ${c.material ? c.material.toLowerCase() : "mixto"} listo para retiro`,
      alerta: false,
    })),
    ...puntos
      .filter((p) => p.estado === "pendiente" && p.pendientes > 0)
      .map((p) => ({
        id: `pendiente-${p.punto}`,
        texto: `${p.punto}: ${p.pendientes} depósito${p.pendientes === 1 ? "" : "s"} por validar`,
        alerta: true,
      })),
  ];

  return (
    <View
      accessibilityLabel="Hoy en la planta"
      className="h-[84px] bg-white border-b border-piedra-borde flex-row items-stretch"
      style={{ paddingHorizontal: padding }}
    >
      <View className="justify-center pr-7">
        <Titulo className="text-[20px] leading-[22px]">Hoy,</Titulo>
        <Titulo className="text-[20px] leading-[22px]">{hoyCorto()}</Titulo>
      </View>

      <TouchableOpacity
        onPress={() => alAbrir("rondas")}
        accessibilityRole="button"
        className="flex-[1.5] justify-center px-7 border-l border-piedra-borde min-w-0"
      >
        <Texto className="text-tinta-media text-[13px]" numberOfLines={1}>
          <Texto className="text-tinta font-bold">{ronda.titulo} </Texto>
          {ronda.detalle}
        </Texto>
        {puntos.length > 0 ? (
          <View className="flex-row mt-1.5 overflow-hidden">
            {puntos.slice(0, 4).map((p) => {
              const estado = ESTADO_RONDA[p.estado];
              return (
                <View key={p.punto} className="mr-1.5">
                  <Insignia texto={p.punto} tono={estado.tono} icono={estado.icono} />
                </View>
              );
            })}
            {puntos.length > 4 ? (
              <Texto className="text-tinta-suave text-xs self-center">+{puntos.length - 4}</Texto>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => alAbrir("incentivo")}
        accessibilityRole="button"
        className="flex-1 justify-center px-7 border-l border-piedra-borde min-w-0"
      >
        {vigente ? (
          <>
            <Texto className="text-tinta-media text-[13px]" numberOfLines={1}>
              <Texto className="text-tinta font-bold">{campana.nombre}: </Texto>
              {cumplen} de {avance.length} áreas en la meta
            </Texto>
            <View className="h-2 bg-ambar-medio rounded-full overflow-hidden mt-2">
              <View
                className="h-2 bg-ambar rounded-full"
                style={{ width: `${avance.length > 0 ? Math.round((cumplen / avance.length) * 100) : 0}%` }}
              />
            </View>
          </>
        ) : (
          <>
            <Texto className="text-tinta text-[13px] font-bold">Sin campaña vigente</Texto>
            <Texto className="text-tinta-suave text-xs mt-1">Créala en Campañas para que la vean todos.</Texto>
          </>
        )}
      </TouchableOpacity>

      <View className="flex-1 justify-center pl-7 border-l border-piedra-borde min-w-0">
        {atencion.length === 0 ? (
          <Texto className="text-tinta-suave text-[13px]">Nada pendiente en los puntos limpios.</Texto>
        ) : (
          atencion.slice(0, 2).map((a, i) => (
            <View key={a.id} className={`flex-row items-center ${i > 0 ? "mt-1" : ""}`}>
              <View className={`w-2 h-2 rounded-full mr-2 ${a.alerta ? "bg-ambar" : "bg-oliva"}`} />
              <Texto
                className={`text-[13px] flex-1 ${i === 0 ? "text-tinta font-semibold" : "text-tinta-media"}`}
                numberOfLines={1}
              >
                {a.texto}
              </Texto>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function ContenidoSeccion({ seccion }: { seccion: SeccionPanel }) {
  switch (seccion) {
    case "resumen":
      return <ResumenSeccion />;
    case "contenedores":
      return <ContenedoresSeccion />;
    case "personas":
      return <PersonasSeccion />;
    case "incentivo":
      return <IncentivoSeccion />;
    case "rondas":
      return <RondasSeccion />;
    case "retiros":
      return <RetirosSeccion />;
  }
}
