import React, { useEffect, useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import ContenedoresSeccion from "./ContenedoresSeccion";
import PersonasSeccion from "./PersonasSeccion";
import IncentivoSeccion from "./IncentivoSeccion";
import RondasSeccion from "./RondasSeccion";
import ReporteMensual from "../../components/ReporteMensual";
import { Aviso, Tarjeta } from "../../components/ui";
import ResumenSeccion from "./ResumenSeccion";
import CampanaPanel from "./CampanaPanel";

export type SeccionPanel =
  | "resumen"
  | "contenedores"
  | "personas"
  | "rondas"
  | "incentivo"
  | "retiros";

const SECCIONES: { id: SeccionPanel; etiqueta: string; icono: string }[] = [
  { id: "resumen", etiqueta: "Resumen", icono: "📊" },
  { id: "contenedores", etiqueta: "Contenedores", icono: "📍" },
  { id: "personas", etiqueta: "Personas y áreas", icono: "👥" },
  { id: "rondas", etiqueta: "Rondas", icono: "📋" },
  { id: "incentivo", etiqueta: "Incentivo", icono: "🏆" },
  { id: "retiros", etiqueta: "Retiros y reporte", icono: "🚛" },
];

/** "martes 6 de octubre", para el encabezado. */
function hoyLargo(): string {
  return new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Panel web del administrador: menú lateral con las secciones y la elegida a
 * la derecha. Solo se muestra en el navegador del computador (ver App.tsx):
 * el administrador trabaja con tablas y formularios que no caben en un
 * teléfono.
 */
export default function PanelAdmin() {
  const { usuario, miPlanta, errorDatos, cerrarSesion } = useEcoTrack();
  const [seccion, setSeccion] = useState<SeccionPanel>("resumen");
  const actual = SECCIONES.find((s) => s.id === seccion)!;
  const nombre = usuario?.nombre ?? "Administrador";

  // En el computador, public/index.html encoge la app al ancho de un teléfono.
  // El panel necesita la pantalla completa: mientras está abierto, se quita
  // ese límite, y al salir (cerrar sesión) vuelve.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.body.classList.add("panel-escritorio");
    return () => document.body.classList.remove("panel-escritorio");
  }, []);

  return (
    <View className="flex-1 flex-row bg-gray-50">
      <View className="w-[248px] bg-gray-900 px-4 pt-7 pb-6">
        <View className="flex-row items-center px-2 mb-7">
          <View className="w-10 h-10 rounded-xl bg-green-700 items-center justify-center mr-3">
            <Text className="text-xl">♻️</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-white text-lg font-bold">RecyTrack</Text>
            <Text className="text-gray-400 text-xs" numberOfLines={1}>
              {miPlanta?.nombre ?? "Sin planta"}
            </Text>
          </View>
        </View>

        <Text className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest px-3 mb-2">
          Panel de administrador
        </Text>
        {SECCIONES.map((s) => {
          const activa = s.id === seccion;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSeccion(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              className={`flex-row items-center h-11 px-3 rounded-xl mb-1 ${activa ? "bg-green-700" : ""}`}
            >
              <Text className="mr-3">{s.icono}</Text>
              <Text className={`text-sm ${activa ? "text-white font-semibold" : "text-gray-300 font-medium"}`}>
                {s.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View className="mt-auto bg-gray-800 rounded-2xl p-3">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center mr-3">
              <Text className="text-white font-bold">{(nombre.trim().charAt(0) || "?").toUpperCase()}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                {nombre}
              </Text>
              <Text className="text-gray-400 text-xs">Administrador</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => cerrarSesion()}
            accessibilityRole="button"
            className="mt-3 border border-gray-600 rounded-lg py-2 items-center"
          >
            <Text className="text-gray-300 text-xs font-medium">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 40, paddingVertical: 32 }}>
        {/* z-10 en la fila y no solo en la campana: si no, la lista de avisos
            queda debajo de lo que viene después en la página. */}
        <View className="flex-row items-end justify-between mb-6 z-10">
          <View>
            <Text className="text-gray-500 text-sm">
              {miPlanta?.nombre ?? ""} · {hoyLargo()}
            </Text>
            <Text className="text-gray-900 text-3xl font-bold mt-1">{actual.etiqueta}</Text>
          </View>
          <CampanaPanel />
        </View>

        {errorDatos ? (
          <View className="mb-6">
            <Aviso texto={errorDatos} />
          </View>
        ) : null}

        <ContenidoSeccion seccion={seccion} />
      </ScrollView>
    </View>
  );
}

function ContenidoSeccion({ seccion }: { seccion: SeccionPanel }) {
  const { miPlanta, areas, registros, incidencias } = useEcoTrack();

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
    // Mientras no exista su sección (#35), el reporte se descarga con el mismo
    // componente que tenía la app.
    case "retiros":
      return miPlanta ? (
        <View className="max-w-[720px]">
          <ReporteMensual planta={miPlanta} areas={areas} registros={registros} incidencias={incidencias} />
        </View>
      ) : null;
    default:
      return <Proximamente />;
  }
}

function Proximamente() {
  return (
    <Tarjeta className="items-center py-16">
      <Text className="text-4xl mb-3">🚧</Text>
      <Text className="text-gray-800 font-semibold text-base">Próximamente</Text>
      <Text className="text-gray-500 text-sm mt-1">Esta sección todavía está en construcción.</Text>
    </Tarjeta>
  );
}
