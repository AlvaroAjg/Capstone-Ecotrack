import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { kgEfectivo, useEcoTrack, type Registro } from "../state/EcoTrack";
import { formatKg, tiempoRelativo } from "../lib/formato";
import {
  ASPECTO_ESTADO,
  CadenaVerificacion,
  Cuerpo,
  Encabezado,
  Insignia,
  Seccion,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

/**
 * Historial completo del residente: antes vivía como una sección más de
 * HomeScreen, pero al crecer obligaba a bajar toda la pantalla para llegar a
 * cerrar sesión. Ahora es su propia pestaña.
 */
export default function RecicladosScreen({ nav }: { nav: Navegacion }) {
  const { misRegistros } = useEcoTrack();

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado titulo="Mis reciclados" subtitulo="Todo tu historial de depósitos" />
      </Encabezado>

      <Seccion
        titulo="Actividad"
        etiqueta={`${misRegistros.length} registro${misRegistros.length === 1 ? "" : "s"}`}
      >
        {misRegistros.length === 0 ? (
          <Vacio
            emoji="♻️"
            texto="Aún no registras reciclaje. Escanea el QR del contenedor para empezar."
          />
        ) : (
          misRegistros.map((r) => (
            <TarjetaActividad
              key={r.id}
              registro={r}
              alAbrir={
                r.estado === "certificado"
                  ? () => nav.ir("certificado", { registroId: r.id })
                  : undefined
              }
            />
          ))
        )}
      </Seccion>
    </Cuerpo>
  );
}

function TarjetaActividad({
  registro,
  alAbrir,
}: {
  registro: Registro;
  alAbrir?: () => void;
}) {
  const aspecto = ASPECTO_ESTADO[registro.estado];
  const pesoCorregido =
    registro.kgConfirmado !== null &&
    Math.abs(registro.kgConfirmado - registro.kgDeclarado) > 0.01;

  const contenido = (
    <Tarjeta className="mb-3">
      {/* La insignia va bajo el texto y no a su lado: en pantallas angostas
          competía por el ancho y estrangulaba el título hasta una letra
          por línea. */}
      <View className="flex-row items-start mb-3">
        <View
          className={`w-10 h-10 ${aspecto.fondo} rounded-full items-center justify-center mr-3`}
        >
          <Text>{aspecto.emoji}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-gray-800 font-medium">
            {registro.material} · {formatKg(kgEfectivo(registro))}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            Contenedor {registro.contenedor} · {tiempoRelativo(registro.creadoEn)}
          </Text>
          {pesoCorregido ? (
            <Text className="text-amber-600 text-[10px] mt-1">
              Peso ajustado por el administrador (declaraste{" "}
              {formatKg(registro.kgDeclarado)})
            </Text>
          ) : null}
          <View className="flex-row mt-2">
            <Insignia estado={registro.estado} />
          </View>
        </View>
      </View>

      <CadenaVerificacion estado={registro.estado} />

      {registro.codigo ? (
        <Text className="text-green-700 text-xs font-medium mt-3">
          Código {registro.codigo} · toca para ver el certificado
        </Text>
      ) : null}
    </Tarjeta>
  );

  if (!alAbrir) return contenido;

  return (
    <TouchableOpacity onPress={alAbrir} activeOpacity={0.85} accessibilityRole="button">
      {contenido}
    </TouchableOpacity>
  );
}
