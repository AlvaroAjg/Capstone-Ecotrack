import React from "react";
import { ActivityIndicator, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Material } from "../../lib/tipos";
import type { EstadoRonda } from "../../lib/resumenPanel";

/**
 * Piezas visuales del panel del administrador, según su diseño: títulos con
 * serifa (Gloock), texto en Hanken Grotesk, tarjetas blancas sobre fondo
 * piedra y los colores vino, oliva y ámbar de tailwind.config.js. Las
 * tipografías se cargan en public/index.html.
 *
 * El panel solo existe en el navegador del computador (ver App.tsx), así que
 * los íconos y el logo se dibujan con SVG del navegador, sin otra librería.
 */

const FUENTE = {
  titulo: "Gloock, Georgia, serif",
  cuerpo: "'Hanken Grotesk', system-ui, sans-serif",
};

/** Un texto del panel. En la web, Text no hereda la tipografía: cada uno la declara. */
export function Texto({
  titulo = false,
  style,
  ...props
}: React.ComponentProps<typeof Text> & { titulo?: boolean }) {
  return <Text {...props} style={[{ fontFamily: titulo ? FUENTE.titulo : FUENTE.cuerpo }, style]} />;
}

/** Título con serifa. El tamaño va en className (p. ej. text-[26px]). */
export function Titulo({ className = "", ...props }: React.ComponentProps<typeof Text>) {
  return <Texto titulo accessibilityRole="header" className={`text-vino ${className}`} {...props} />;
}

/** Tarjeta blanca del panel. */
export function Bloque({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`bg-white rounded-[20px] px-6 py-5 ${className}`}>{children}</View>;
}

/** Título de una tarjeta, con una línea de detalle y algo a la derecha. */
export function EncabezadoBloque({
  titulo,
  detalle,
  derecha,
}: {
  titulo: string;
  detalle?: string;
  derecha?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between mb-4">
      <View className="flex-1 min-w-0 pr-4">
        <Titulo className="text-[24px] leading-[28px]">{titulo}</Titulo>
        {detalle ? <Texto className="text-tinta-suave text-[13px] mt-1">{detalle}</Texto> : null}
      </View>
      {derecha}
    </View>
  );
}

/** Encabezado de cada sección: título grande, una línea que la explica y sus acciones. */
export function EncabezadoSeccion({
  titulo,
  detalle,
  acciones,
}: {
  titulo: string;
  detalle?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between mb-6">
      <View className="flex-1 min-w-0 pr-6">
        <Titulo className="text-[42px] leading-[46px]">{titulo}</Titulo>
        {detalle ? <Texto className="text-tinta-suave text-sm mt-1">{detalle}</Texto> : null}
      </View>
      {acciones ? <View className="flex-row items-center">{acciones}</View> : null}
    </View>
  );
}

type VarianteBoton = "primario" | "secundario" | "suave" | "peligro";

const ESTILO_BOTON: Record<VarianteBoton, { caja: string; texto: string; icono: string }> = {
  primario: { caja: "bg-oliva", texto: "text-white", icono: "#FFFFFF" },
  secundario: { caja: "bg-white border border-piedra-control", texto: "text-tinta", icono: "#221C20" },
  suave: { caja: "bg-oliva-claro", texto: "text-oliva-oscuro", icono: "#2C4D20" },
  peligro: { caja: "bg-white border border-rojizo-claro", texto: "text-rojizo-oscuro", icono: "#8A2A22" },
};

export function BotonPanel({
  titulo,
  onPress,
  variante = "primario",
  icono,
  compacto = false,
  cargando = false,
  deshabilitado = false,
  className = "",
}: {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  icono?: NombreIcono;
  /** 36 px de alto en vez de 44, para acciones dentro de una tarjeta. */
  compacto?: boolean;
  cargando?: boolean;
  deshabilitado?: boolean;
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
      className={`flex-row items-center justify-center rounded-[10px] ${compacto ? "h-9 px-3" : "h-11 px-4"} ${
        estilo.caja
      } ${inactivo ? "opacity-50" : ""} ${className}`}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={estilo.icono} style={{ marginRight: 8 }} />
      ) : icono ? (
        <View className="mr-2">
          <Icono nombre={icono} tamano={compacto ? 16 : 18} color={estilo.icono} />
        </View>
      ) : null}
      <Texto className={`${compacto ? "text-[13px]" : "text-sm"} font-semibold ${estilo.texto}`}>{titulo}</Texto>
    </TouchableOpacity>
  );
}

export type Tono = "oliva" | "ambar" | "gris" | "rojo" | "azul" | "vino";

const ESTILO_TONO: Record<Tono, { caja: string; texto: string; color: string }> = {
  oliva: { caja: "bg-oliva-claro", texto: "text-oliva-oscuro", color: "#2C4D20" },
  ambar: { caja: "bg-ambar-claro", texto: "text-ambar-oscuro", color: "#7A4E17" },
  gris: { caja: "bg-piedra-linea", texto: "text-tinta-media", color: "#4D474B" },
  rojo: { caja: "bg-rojizo-claro", texto: "text-rojizo-oscuro", color: "#8A2A22" },
  azul: { caja: "bg-azulado-claro", texto: "text-azulado-oscuro", color: "#24496F" },
  vino: { caja: "bg-vino", texto: "text-vino-texto", color: "#F6EFF3" },
};

/** Etiqueta redondeada de estado. */
export function Insignia({ texto, tono = "gris", icono }: { texto: string; tono?: Tono; icono?: NombreIcono }) {
  const estilo = ESTILO_TONO[tono];
  return (
    <View className={`flex-row items-center rounded-full px-2.5 py-1 ${estilo.caja}`}>
      {icono ? (
        <View className="mr-1.5">
          <Icono nombre={icono} tamano={12} color={estilo.color} grosor={2.4} />
        </View>
      ) : null}
      <Texto className={`text-xs font-semibold ${estilo.texto}`}>{texto}</Texto>
    </View>
  );
}

/** Opciones en píldoras, una elegida: meses, áreas, materiales. */
export function Pildoras<T extends string | null>({
  opciones,
  valor,
  alCambiar,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  alCambiar: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap">
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <TouchableOpacity
            key={String(o.valor)}
            onPress={() => alCambiar(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            className={`h-9 px-3.5 mr-2 mb-2 rounded-full justify-center ${
              activa ? "bg-vino" : "bg-white border border-piedra-control"
            }`}
          >
            <Texto className={`text-[13px] ${activa ? "text-vino-texto font-semibold" : "text-tinta-media font-medium"}`}>
              {o.etiqueta}
            </Texto>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Campo de formulario del panel: etiqueta arriba y caja de 44 px. */
export function CampoPanel({
  etiqueta,
  className = "",
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & { etiqueta: string }) {
  return (
    <View className={`mb-4 ${className}`}>
      <Texto className="text-tinta-media text-[13px] font-semibold mb-1.5">{etiqueta}</Texto>
      <TextInput
        placeholderTextColor="#8B8589"
        accessibilityLabel={etiqueta}
        className="h-11 px-3.5 bg-piedra-campo border border-piedra-control rounded-[10px] text-tinta text-sm"
        style={[{ fontFamily: FUENTE.cuerpo }, style]}
        {...props}
      />
    </View>
  );
}

/** Texto tocable para acciones secundarias dentro de una fila o tarjeta. */
export function Enlace({
  texto,
  alPresionar,
  tono = "oliva",
  deshabilitado = false,
  className = "",
}: {
  texto: string;
  alPresionar: () => void;
  tono?: "oliva" | "tinta" | "rojo" | "azul";
  deshabilitado?: boolean;
  className?: string;
}) {
  const color = {
    oliva: "text-oliva",
    tinta: "text-tinta-media",
    rojo: "text-rojizo-oscuro",
    azul: "text-azulado-oscuro",
  }[tono];
  return (
    <TouchableOpacity
      onPress={alPresionar}
      disabled={deshabilitado}
      accessibilityRole="button"
      className={`py-1 ${deshabilitado ? "opacity-50" : ""} ${className}`}
    >
      <Texto className={`text-[13px] font-semibold ${color}`}>{texto}</Texto>
    </TouchableOpacity>
  );
}

/**
 * Cómo se muestra el estado de un contenedor en la ronda de hoy. Los mismos
 * nombres que usa el validador (ver ValidacionContenedores).
 */
export const ESTADO_RONDA: Record<EstadoRonda, { texto: string; tono: Tono; icono: NombreIcono }> = {
  conforme: { texto: "Conforme", tono: "oliva", icono: "check" },
  observacion: { texto: "Con observación", tono: "ambar", icono: "alerta" },
  sinMaterial: { texto: "Sin material", tono: "rojo", icono: "alerta" },
  pendiente: { texto: "Pendiente", tono: "gris", icono: "reloj" },
  vacio: { texto: "Sin depósitos", tono: "gris", icono: "reloj" },
};

/**
 * Un color por material, para las tapas de los contenedores y los gráficos.
 * Se distinguen también por claridad, no solo por tono. null es el mixto.
 */
export function colorMaterial(material: Material | null): string {
  switch (material) {
    case "Plástico":
      return "#C79A1E";
    case "Papel/cartón":
      return "#3B6EA8";
    case "Vidrio":
      return "#2F7F7A";
    case "Metal":
      return "#8A8F96";
    default:
      return "#3F6B2E";
  }
}

/** Iniciales para el círculo de una persona: "Rosa Muñoz" → "RM". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return ((partes[0][0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// -------------------------------------------------------------------- íconos

/** Trazos de 24×24, del mismo estilo que los del diseño. */
const TRAZOS = {
  calendario: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18",
  abajo: "M6 9l6 6 6-6",
  descargar: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  mas: "M12 5v14M5 12h14",
  campana: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  buscar: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  imprimir: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  check: "M20 6 9 17l-5-5",
  alerta: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  reloj: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  regalo:
    "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  cerrar: "M18 6 6 18M6 6l12 12",
  editar: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4z",
  renovar: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  apagar: "M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10",
  punto: "M12 22s7-7.4 7-12a7 7 0 0 0-14 0c0 4.6 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  camion:
    "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  personas:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({
  nombre,
  tamano = 18,
  color = "#221C20",
  grosor = 1.75,
}: {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
  grosor?: number;
}) {
  if (Platform.OS !== "web") return null;
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

/** Logo de RecyTrack: seis uvas, la de abajo ámbar, y una hoja. */
export function Logo({ tamano = 36 }: { tamano?: number }) {
  if (Platform.OS !== "web") return null;
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 40 40" aria-hidden="true" style={{ display: "block" }}>
      <path
        d="M20 12.5V10M20 11c0-4 2.5-6.5 7-7.5-.6 4.6-3.2 7-7 7.5z"
        fill="#8DB574"
        stroke="#8DB574"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="4.3" fill="#CFE3BE" />
      <circle cx="20" cy="17" r="4.3" fill="#CFE3BE" />
      <circle cx="28" cy="17" r="4.3" fill="#CFE3BE" />
      <circle cx="16" cy="24.5" r="4.3" fill="#CFE3BE" />
      <circle cx="24" cy="24.5" r="4.3" fill="#CFE3BE" />
      <circle cx="20" cy="32" r="4.3" fill="#D9A35B" />
    </svg>
  );
}

/** Un contenedor dibujado, con la tapa del color de su material. */
export function DibujoContenedor({ color }: { color: string }) {
  if (Platform.OS !== "web") return null;
  return (
    <svg width={42} height={50} viewBox="0 0 46 54" aria-hidden="true" style={{ display: "block" }}>
      <rect x="5" y="12" width="36" height="40" rx="6" fill="#F1F2EE" stroke="#CFD2CA" strokeWidth={1.5} />
      <rect x="2" y="5" width="42" height="9" rx="4" fill={color} />
      <rect x="17" y="1" width="12" height="6" rx="3" fill={color} />
      <path d="M15 22v22M23 22v22M31 22v22" stroke="#DADDD5" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
