import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import {
  textoAvance,
  tiempoParaRenovar,
  type MisionSistema,
} from "../lib/misionesSistema";
import { porcentaje } from "../lib/formato";
import {
  Barra,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Tarjeta,
  TituloEncabezado,
} from "../components/ui";

/**
 * Misiones del sistema: diarias y semanales, las mismas para todos los
 * residentes. No las define el administrador (esa es la misión de la torre,
 * en Inicio); el avance se calcula solo con los depósitos del residente.
 */
export default function MisionesScreen({ nav }: { nav: Navegacion }) {
  const { misionesDiarias, misionesSemanales, puntosSemana } = useEcoTrack();

  const hechasHoy = misionesDiarias.filter((m) => m.completada).length;
  const hechasSemana = misionesSemanales.filter((m) => m.completada).length;

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado
          titulo="Misiones"
          subtitulo="Retos diarios y semanales para reciclar con constancia"
        />
      </Encabezado>

      <FilaMetricas
        color="text-green-700"
        metricas={[
          { valor: `${puntosSemana}`, etiqueta: "EcoPuntos esta semana" },
          { valor: `${hechasHoy}/${misionesDiarias.length}`, etiqueta: "Diarias hoy" },
          { valor: `${hechasSemana}/${misionesSemanales.length}`, etiqueta: "Semanales" },
        ]}
      />

      <Seccion titulo="Misiones diarias" etiqueta={tiempoParaRenovar("diaria")}>
        {misionesDiarias.map((m) => (
          <TarjetaMision key={m.id} mision={m} alIr={() => nav.ir("escanear")} />
        ))}
      </Seccion>

      <Seccion titulo="Misiones semanales" etiqueta={tiempoParaRenovar("semanal")}>
        {misionesSemanales.map((m) => (
          <TarjetaMision key={m.id} mision={m} alIr={() => nav.ir("escanear")} />
        ))}
      </Seccion>

      <View className="px-6 mt-4 mb-2">
        <Text className="text-gray-400 text-xs text-center">
          Cuentan tus depósitos pendientes, validados y certificados. Si el
          administrador rechaza uno, deja de sumar.
        </Text>
      </View>
    </Cuerpo>
  );
}

function TarjetaMision({ mision, alIr }: { mision: MisionSistema; alIr: () => void }) {
  const avance = porcentaje(mision.progreso, mision.meta);
  const tipo = mision.tipo === "diaria" ? "Misión diaria" : "Misión semanal";
  const estado = mision.completada ? "Completada" : "En curso";

  return (
    <Tarjeta className={`mb-3 ${mision.completada ? "border-2 border-green-500" : ""}`}>
      {/* Un lector de pantalla lee la tarjeta de una vez, con el avance incluido. */}
      <View
        accessible
        accessibilityLabel={`${tipo}: ${mision.titulo}. ${mision.descripcion} ${textoAvance(
          mision
        )}. ${estado}. ${mision.puntos} EcoPuntos.`}
      >
        <View className="flex-row items-start mb-3">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              mision.completada ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            <Text>{mision.completada ? "✅" : mision.emoji}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-gray-800 font-medium">{mision.titulo}</Text>
            <Text className="text-gray-500 text-xs mt-1">{mision.descripcion}</Text>
          </View>
          <View className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-amber-800 text-[11px] font-semibold">+{mision.puntos}</Text>
          </View>
        </View>

        <Barra avance={avance} />
        <Text className="text-gray-400 text-xs mt-2">
          {textoAvance(mision)} · {estado}
        </Text>
      </View>

      {!mision.completada && mision.tipo === "diaria" ? (
        <TouchableOpacity
          onPress={alIr}
          accessibilityRole="button"
          accessibilityLabel={`Escanear QR para avanzar en ${mision.titulo}`}
          className="mt-3 self-start"
        >
          <Text className="text-green-700 text-xs font-semibold">📷 Escanear para avanzar</Text>
        </TouchableOpacity>
      ) : null}
    </Tarjeta>
  );
}
