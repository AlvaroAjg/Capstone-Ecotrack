import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Navegacion } from "../../App";
import { TorreId, TORRES, useEcoTrack } from "../state/EcoTrack";
import { formatKg, tiempoRelativo } from "../lib/formato";
import {
  Barra,
  Boton,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Segmentado,
  Tarjeta,
  Vacio,
} from "../components/ui";

export default function AdminScreen({ nav }: { nav: Navegacion }) {
  const { usuario, resumenTorre, validarRegistro, rechazarRegistro, cerrarSesion } = useEcoTrack();
  const [torre, setTorre] = useState<TorreId>("Torre A");
  const resumen = resumenTorre(torre);

  function salir() {
    cerrarSesion();
    nav.ir("login");
  }

  function exportarReporte() {
    Alert.alert(
      "Reporte mensual",
      `Se generará el PDF de ${torre} con ${formatKg(resumen.kgMes)} certificados y ${resumen.participacion}% de participación.`,
      [{ text: "Entendido" }]
    );
  }

  return (
    <Cuerpo>
      <Encabezado tono="oscuro">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1 pr-3">
            <Text className="text-gray-300 text-sm">Panel de administrador</Text>
            <Text className="text-white text-2xl font-bold mt-1">{torre}</Text>
            <Text className="text-gray-400 text-sm mt-1">
              {usuario?.nombre ?? "Administrador"} · Condominio Piloto
            </Text>
          </View>
          <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {(usuario?.nombre ?? "A").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Segmentado
          tono="oscuro"
          valor={torre}
          alCambiar={setTorre}
          opciones={TORRES.map((t) => ({ valor: t, etiqueta: t }))}
        />
      </Encabezado>

      <FilaMetricas
        metricas={[
          { valor: `${resumen.residentes}`, etiqueta: "Residentes activos" },
          { valor: formatKg(resumen.kgMes), etiqueta: "Certificado este mes" },
          { valor: `${resumen.participacion}%`, etiqueta: "Participación" },
        ]}
      />

      <Seccion
        titulo="Validaciones pendientes"
        etiqueta={`${resumen.pendientes.length} en cola`}
      >
        {resumen.pendientes.length === 0 ? (
          <Vacio emoji="✅" texto={`No hay depósitos pendientes en ${torre}.`} />
        ) : (
          resumen.pendientes.map((p) => (
            <Tarjeta key={p.id} className="mb-3">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-800 font-medium">{p.residente}</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    {p.depto} · {p.material} · {formatKg(p.kg)}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Contenedor {p.contenedor}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs">{tiempoRelativo(p.creadoEn)}</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => validarRegistro(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Validar depósito de ${p.residente}`}
                  className="flex-1 bg-green-700 rounded-xl py-3 items-center mr-2"
                >
                  <Text className="text-white font-medium text-sm">Validar depósito</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => rechazarRegistro(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rechazar depósito de ${p.residente}`}
                  className="flex-1 border border-red-300 rounded-xl py-3 items-center"
                >
                  <Text className="text-red-600 font-medium text-sm">Rechazar</Text>
                </TouchableOpacity>
              </View>
            </Tarjeta>
          ))
        )}
      </Seccion>

      <Seccion titulo="Misión de la torre">
        <Tarjeta>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-medium flex-1 pr-2">
              {resumen.metaKg} kg certificados este mes
            </Text>
            <Text className="text-green-700 font-semibold text-sm">{resumen.avanceMeta}%</Text>
          </View>
          <Barra avance={resumen.avanceMeta} />
          <Text className="text-gray-400 text-xs mt-2 mb-3">
            {formatKg(resumen.kgMes)} de {resumen.metaKg} kg acumulados
          </Text>
          <Boton
            titulo="Editar incentivo"
            variante="secundario"
            onPress={() =>
              Alert.alert("Incentivo", "La edición de misiones e incentivos llega en el sprint 5.", [
                { text: "Entendido" },
              ])
            }
            className="py-3"
          />
        </Tarjeta>
      </Seccion>

      <View className="px-6 mt-6">
        <Boton
          titulo="Exportar reporte mensual (PDF)"
          icono="📊"
          variante="oscuro"
          onPress={exportarReporte}
          className="mb-3"
        />
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} className="py-3" />
      </View>
    </Cuerpo>
  );
}
