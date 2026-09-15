import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { EstadoRegistro } from "../lib/tipos";

export function Encabezado({
  tono = "verde",
  children,
}: {
  tono?: "verde" | "oscuro";
  children: React.ReactNode;
}) {
  const fondo = tono === "verde" ? "bg-green-700" : "bg-gray-900";
  return <View className={`${fondo} pt-14 pb-10 px-6 rounded-b-3xl`}>{children}</View>;
}

export function TituloEncabezado({
  titulo,
  subtitulo,
  alVolver,
  tono = "verde",
}: {
  titulo: string;
  subtitulo?: string;
  alVolver?: () => void;
  tono?: "verde" | "oscuro";
}) {
  const textoSuave = tono === "verde" ? "text-green-100" : "text-gray-400";
  return (
    <View className="flex-row items-center">
      {alVolver && (
        <TouchableOpacity
          onPress={alVolver}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="mr-3"
        >
          <Text className="text-white text-2xl">←</Text>
        </TouchableOpacity>
      )}
      <View className="flex-1">
        <Text className="text-white text-xl font-bold">{titulo}</Text>
        {subtitulo ? <Text className={`${textoSuave} text-sm mt-1`}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

export function Tarjeta({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={`bg-white rounded-2xl p-5 shadow-sm ${className}`}>{children}</View>;
}

export function Seccion({
  titulo,
  etiqueta,
  children,
}: {
  titulo: string;
  etiqueta?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-6 mt-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-800 font-semibold">{titulo}</Text>
        {etiqueta ? (
          <View className="bg-gray-200 rounded-full px-3 py-1">
            <Text className="text-gray-600 text-xs font-medium">{etiqueta}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function FilaMetricas({
  metricas,
  color = "text-gray-900",
}: {
  metricas: { valor: string; etiqueta: string }[];
  color?: string;
}) {
  return (
    <View className="px-6 -mt-6">
      <Tarjeta className="flex-row justify-between">
        {metricas.map((m, i) => (
          <React.Fragment key={m.etiqueta}>
            {i > 0 && <View className="w-px bg-gray-200" />}
            <View className="items-center flex-1 px-1">
              <Text className={`text-2xl font-bold ${color}`} numberOfLines={1}>
                {m.valor}
              </Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">{m.etiqueta}</Text>
            </View>
          </React.Fragment>
        ))}
      </Tarjeta>
    </View>
  );
}

export function Vacio({ emoji, texto }: { emoji: string; texto: string }) {
  return (
    <Tarjeta className="items-center py-8">
      <Text className="text-4xl mb-3">{emoji}</Text>
      <Text className="text-gray-600 font-medium text-center">{texto}</Text>
    </Tarjeta>
  );
}

type VarianteBoton = "primario" | "secundario" | "peligro" | "oscuro";

const ESTILO_BOTON: Record<VarianteBoton, { caja: string; texto: string }> = {
  primario: { caja: "bg-green-700", texto: "text-white" },
  secundario: { caja: "border border-gray-300 bg-white", texto: "text-gray-700" },
  peligro: { caja: "border border-red-300 bg-white", texto: "text-red-600" },
  oscuro: { caja: "bg-gray-900", texto: "text-white" },
};

export function Boton({
  titulo,
  onPress,
  variante = "primario",
  icono,
  deshabilitado = false,
  cargando = false,
  className = "",
}: {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  icono?: string;
  deshabilitado?: boolean;
  cargando?: boolean;
  className?: string;
}) {
  const estilo = ESTILO_BOTON[variante];
  const inactivo = deshabilitado || cargando;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactivo}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      className={`rounded-xl py-4 items-center flex-row justify-center ${estilo.caja} ${
        inactivo ? "opacity-50" : ""
      } ${className}`}
    >
      {cargando ? (
        <ActivityIndicator
          color={variante === "primario" || variante === "oscuro" ? "#FFFFFF" : "#166534"}
          style={{ marginRight: 8 }}
        />
      ) : icono ? (
        <Text className="text-lg mr-2">{icono}</Text>
      ) : null}
      <Text className={`font-semibold text-base ${estilo.texto}`}>{titulo}</Text>
    </TouchableOpacity>
  );
}

export function Campo({
  etiqueta,
  error,
  className = "",
  ...props
}: React.ComponentProps<typeof TextInput> & { etiqueta: string; error?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-gray-500 text-xs mb-1 ml-1">{etiqueta}</Text>
      <TextInput
        placeholderTextColor="#B0B0B0"
        accessibilityLabel={etiqueta}
        className={`border rounded-xl px-4 py-3 bg-gray-50 ${
          error ? "border-red-400" : "border-gray-200"
        } ${className}`}
        {...props}
      />
      {error ? <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  alCambiar,
  tono = "claro",
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  alCambiar: (v: T) => void;
  tono?: "claro" | "oscuro";
}) {
  const fondo = tono === "claro" ? "bg-gray-100" : "bg-gray-800";
  return (
    <View className={`flex-row ${fondo} rounded-xl p-1`}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        const cajaActiva = tono === "claro" ? "bg-green-700" : "bg-white";
        const textoActivo = tono === "claro" ? "text-white" : "text-gray-900";
        const textoInactivo = tono === "claro" ? "text-gray-500" : "text-gray-400";
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => alCambiar(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            className={`flex-1 py-2 rounded-lg items-center ${activo ? cajaActiva : ""}`}
          >
            <Text
              className={`font-medium text-xs ${activo ? textoActivo : textoInactivo}`}
              numberOfLines={1}
            >
              {o.etiqueta}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Barra({ avance, color = "bg-green-600" }: { avance: number; color?: string }) {
  return (
    <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <View className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(avance, 100)}%` }} />
    </View>
  );
}

export const ASPECTO_ESTADO: Record<
  EstadoRegistro,
  { texto: string; fondo: string; color: string; emoji: string }
> = {
  pendiente: {
    texto: "Esperando administrador",
    fondo: "bg-amber-100",
    color: "text-amber-700",
    emoji: "⏳",
  },
  validado: {
    texto: "Esperando gestor",
    fondo: "bg-blue-100",
    color: "text-blue-700",
    emoji: "🔎",
  },
  certificado: {
    texto: "Certificado",
    fondo: "bg-green-100",
    color: "text-green-700",
    emoji: "📄",
  },
  rechazado: {
    texto: "Rechazado",
    fondo: "bg-red-100",
    color: "text-red-600",
    emoji: "✕",
  },
};

export function Insignia({ estado }: { estado: EstadoRegistro }) {
  const a = ASPECTO_ESTADO[estado];
  return (
    <View className={`${a.fondo} rounded-full px-3 py-1`}>
      <Text className={`${a.color} text-xs font-medium`}>{a.texto}</Text>
    </View>
  );
}

const ETAPAS: { clave: EstadoRegistro; corto: string }[] = [
  { clave: "pendiente", corto: "Depósito" },
  { clave: "validado", corto: "Administrador" },
  { clave: "certificado", corto: "Gestor" },
];

export function CadenaVerificacion({ estado }: { estado: EstadoRegistro }) {
  if (estado === "rechazado") {
    return (
      <View className="bg-red-50 rounded-xl p-3">
        <Text className="text-red-600 text-sm font-medium text-center">
          ✕ Depósito rechazado por el administrador
        </Text>
      </View>
    );
  }

  const alcanzado = ETAPAS.findIndex((e) => e.clave === estado);

  return (
    <View className="flex-row">
      {ETAPAS.map((etapa, i) => {
        const completada = i <= alcanzado;
        const esActual = i === alcanzado;
        return (
          <View key={etapa.clave} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              <View className={`flex-1 h-0.5 ${i === 0 ? "bg-transparent" : completada ? "bg-green-600" : "bg-gray-200"}`} />
              <View
                className={`w-7 h-7 rounded-full items-center justify-center ${
                  completada ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                <Text className={`text-xs font-bold ${completada ? "text-white" : "text-gray-400"}`}>
                  {completada ? "✓" : i + 1}
                </Text>
              </View>
              <View
                className={`flex-1 h-0.5 ${
                  i === ETAPAS.length - 1 ? "bg-transparent" : i < alcanzado ? "bg-green-600" : "bg-gray-200"
                }`}
              />
            </View>
            <Text
              className={`text-[10px] mt-2 text-center ${
                esActual ? "text-green-700 font-semibold" : completada ? "text-gray-600" : "text-gray-400"
              }`}
              numberOfLines={1}
            >
              {etapa.corto}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Cuerpo({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {children}
    </ScrollView>
  );
}

/** Pantalla completa de carga, usada mientras se resuelve la sesión. */
export function PantallaCargando({ mensaje }: { mensaje?: string }) {
  return (
    <SafeAreaView className="flex-1 bg-green-700 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-white/15 items-center justify-center mb-5 border border-white/30">
        <Text className="text-4xl">♻️</Text>
      </View>
      <Text className="text-white text-2xl font-bold mb-3">EcoTrack</Text>
      <ActivityIndicator color="#FFFFFF" />
      {mensaje ? (
        <Text className="text-green-100 text-sm mt-4 text-center">{mensaje}</Text>
      ) : null}
    </SafeAreaView>
  );
}

/** Banda de error. Se usa para fallos de red o de permisos de Firestore. */
export function Aviso({
  texto,
  tono = "error",
}: {
  texto: string;
  tono?: "error" | "info";
}) {
  const estilo =
    tono === "error"
      ? { caja: "bg-red-50 border-red-200", texto: "text-red-700" }
      : { caja: "bg-blue-50 border-blue-200", texto: "text-blue-700" };
  return (
    <View className={`border rounded-xl px-4 py-3 ${estilo.caja}`}>
      <Text className={`text-xs ${estilo.texto}`}>{texto}</Text>
    </View>
  );
}
