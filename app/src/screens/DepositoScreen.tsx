import React from "react";
import { Text, View } from "react-native";
import { Navegacion } from "../../App";
import { MATERIALES, useEcoTrack } from "../state/EcoTrack";
import { etiquetaMes, mesDe } from "../lib/certificadoMensual";
import { cantidadDeposito, fechaLarga } from "../lib/formato";
import { useDescargaCertificado } from "../lib/useDescargaCertificado";
import {
  ASPECTO_ESTADO,
  Boton,
  CadenaVerificacion,
  Cuerpo,
  Encabezado,
  Insignia,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

/**
 * Detalle de un depósito: su estado, la fecha de cada etapa de la cadena y
 * sus códigos. Solo ese depósito; el certificado del mes no se muestra aquí,
 * se descarga como PDF.
 */
export default function DepositoScreen({ nav }: { nav: Navegacion }) {
  const { registroPorId } = useEcoTrack();
  const { descargar, generando } = useDescargaCertificado();
  const registro = nav.params.registroId ? registroPorId(nav.params.registroId) : undefined;

  if (!registro) {
    return (
      <Cuerpo>
        <Encabezado>
          <TituloEncabezado titulo="Depósito" alVolver={nav.volver} />
        </Encabezado>
        <View className="px-6 mt-6">
          <Vacio emoji="♻️" texto="No encontramos este depósito." />
        </View>
      </Cuerpo>
    );
  }

  const aspecto = ASPECTO_ESTADO[registro.estado];
  const emoji = MATERIALES.find((m) => m.nombre === registro.material)?.emoji ?? "♻️";
  const mes = mesDe(registro.creadoEn);
  const rechazado = registro.estado === "rechazado";

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado
          titulo="Detalle del depósito"
          subtitulo={fechaLarga(registro.creadoEn)}
          alVolver={nav.volver}
        />
      </Encabezado>

      <View className="px-6 -mt-6">
        <Tarjeta>
          <View className="flex-row items-center mb-4">
            <View className={`w-12 h-12 ${aspecto.fondo} rounded-full items-center justify-center mr-3`}>
              <Text className="text-2xl">{emoji}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-gray-900 font-bold text-base">{registro.material}</Text>
              <Text className="text-gray-500 text-sm mt-0.5">{cantidadDeposito(registro)}</Text>
            </View>
            <Insignia estado={registro.estado} />
          </View>
          <CadenaVerificacion estado={registro.estado} />
        </Tarjeta>
      </View>

      <View className="px-6 mt-6">
        <Text className="text-gray-800 font-semibold mb-3">Trazabilidad</Text>
        <Tarjeta>
          <Etapa
            hecha
            titulo="Depósito registrado"
            detalle={`Contenedor ${registro.contenedor}`}
            momento={registro.creadoEn}
          />
          <Etapa
            hecha={registro.validadoEn !== null}
            error={rechazado}
            titulo={rechazado ? "Rechazado por el administrador" : "Validado por el administrador"}
            detalle={
              rechazado
                ? "No se encontró en el contenedor, así que no suma"
                : registro.validadoEn
                  ? "Confirmó la deposición en el contenedor"
                  : "Esperando que el administrador revise el contenedor"
            }
            momento={registro.validadoEn}
            ultima={rechazado}
          />
          {!rechazado ? (
            <Etapa
              hecha={registro.certificadoEn !== null}
              titulo="Certificado por el gestor"
              detalle={
                registro.certificadoEn
                  ? `Retiró el contenedor de ${registro.torreNombre}`
                  : "Esperando que el gestor retire el contenedor"
              }
              momento={registro.certificadoEn}
              ultima
            />
          ) : null}
        </Tarjeta>
      </View>

      {registro.codigo || registro.codigoRetiro ? (
        <View className="px-6 mt-6">
          <Tarjeta>
            {registro.codigo ? (
              <View className="items-center mb-3">
                <Text className="text-gray-400 text-xs mb-1">Código del depósito</Text>
                <Text className="text-gray-900 font-bold text-lg tracking-widest">
                  {registro.codigo}
                </Text>
              </View>
            ) : null}
            {registro.codigoRetiro ? (
              <Text className="text-gray-500 text-xs text-center">
                Salió en el retiro {registro.codigoRetiro}
              </Text>
            ) : null}
          </Tarjeta>
        </View>
      ) : null}

      {registro.estado === "certificado" ? (
        <View className="px-6 mt-6">
          <Text className="text-gray-400 text-xs text-center mb-3">
            Este depósito suma a tu certificado de {etiquetaMes(mes)}.
          </Text>
          <Boton
            titulo={
              generando === mes ? "Generando PDF..." : `Descargar certificado de ${etiquetaMes(mes)}`
            }
            icono="⬇️"
            variante="secundario"
            cargando={generando === mes}
            onPress={() => descargar(mes)}
            className="py-3"
          />
        </View>
      ) : null}
    </Cuerpo>
  );
}

function Etapa({
  titulo,
  detalle,
  momento,
  hecha,
  error = false,
  ultima = false,
}: {
  titulo: string;
  detalle: string;
  momento: number | null;
  hecha: boolean;
  error?: boolean;
  ultima?: boolean;
}) {
  const circulo = error ? "bg-red-500" : hecha ? "bg-green-600" : "bg-gray-200";
  return (
    <View className="flex-row">
      <View className="items-center mr-3">
        <View className={`w-6 h-6 rounded-full ${circulo} items-center justify-center`}>
          <Text className="text-white text-xs font-bold">{error ? "✕" : hecha ? "✓" : ""}</Text>
        </View>
        {!ultima && <View className="w-0.5 flex-1 bg-green-200 my-1" />}
      </View>
      <View className={ultima ? "flex-1" : "flex-1 pb-5"}>
        <Text className={`font-medium text-sm ${hecha || error ? "text-gray-800" : "text-gray-400"}`}>
          {titulo}
        </Text>
        <Text className="text-gray-400 text-xs mt-1">{detalle}</Text>
        {momento ? (
          <Text className="text-gray-500 text-xs mt-1">{fechaLarga(momento)}</Text>
        ) : null}
      </View>
    </View>
  );
}
