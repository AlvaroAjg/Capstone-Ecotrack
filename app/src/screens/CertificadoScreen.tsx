import React, { useState } from "react";
import { View, Text } from "react-native";
import { Navegacion } from "../../App";
import { kgEfectivo, useEcoTrack } from "../state/EcoTrack";
import { descargarCertificado } from "../lib/certificadoPdf";
import { avisar, textoDeError } from "../lib/dialogos";
import { fechaLarga, formatKg, tiempoRelativo } from "../lib/formato";
import {
  Boton,
  CadenaVerificacion,
  Cuerpo,
  Encabezado,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

export default function CertificadoScreen({ nav }: { nav: Navegacion }) {
  const { registroPorId } = useEcoTrack();
  const [generando, setGenerando] = useState(false);
  const registro =nav.params.registroId ? registroPorId(nav.params.registroId) : undefined;

  if (!registro || registro.estado !== "certificado" || !registro.codigo) {
    return (
      <Cuerpo>
        <Encabezado>
          <TituloEncabezado titulo="Certificado" alVolver={nav.volver} />
        </Encabezado>
        <View className="px-6 mt-6">
          <Vacio
            emoji="📄"
            texto="Este registro todavía no completó la cadena de verificación, así que aún no tiene certificado."
          />
        </View>
      </Cuerpo>
    );
  }

  async function descargar() {
    setGenerando(true);
    try {
      const resultado = await descargarCertificado(registro!);
      if (resultado === "descargado") {
        avisar("Certificado descargado", "El PDF quedó guardado en la carpeta de descargas de tu dispositivo.");
      }
    } catch (e) {
      avisar("No se pudo generar el PDF", textoDeError(e));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado
          titulo="Certificado digital"
          subtitulo="Emitido al completar la cadena de verificación"
          alVolver={nav.volver}
        />
      </Encabezado>

      <View className="px-6 -mt-6">
        <Tarjeta className="items-center py-8">
          <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
            <Text className="text-3xl">♻️</Text>
          </View>

          <Text className="text-gray-400 text-xs tracking-widest uppercase">EcoTrack</Text>
          <Text className="text-gray-900 text-xl font-bold mt-1 text-center">
            Certificado de reciclaje verificado
          </Text>

          <View className="w-16 h-0.5 bg-green-600 my-5" />

          <Text className="text-gray-500 text-sm text-center">Se certifica que</Text>
          <Text className="text-gray-900 text-lg font-bold mt-1 text-center">
            {registro.residente}
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-1">
            {registro.torreNombre} · {registro.depto}
          </Text>

          <Text className="text-gray-500 text-sm text-center mt-5">recicló de forma verificada</Text>
          <Text className="text-green-700 text-3xl font-bold mt-1">{formatKg(kgEfectivo(registro))}</Text>
          <Text className="text-gray-700 font-medium">{registro.material}</Text>

          <View className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 mt-6 items-center">
            <Text className="text-gray-400 text-xs mb-1">Código de verificación</Text>
            <Text className="text-gray-900 font-bold text-lg tracking-widest">
              {registro.codigo}
            </Text>
          </View>

          {registro.codigoRetiro ? (
            <Text className="text-gray-400 text-xs mt-3 text-center">
              Retirado en el lote {registro.codigoRetiro}
            </Text>
          ) : null}

          <Text className="text-gray-400 text-xs mt-2 text-center">
            Emitido el {fechaLarga(registro.certificadoEn ?? registro.creadoEn)}
          </Text>
        </Tarjeta>
      </View>

      <View className="px-6 mt-6">
        <Text className="text-gray-800 font-semibold mb-3">Trazabilidad</Text>
        <Tarjeta>
          <View className="mb-5">
            <CadenaVerificacion estado="certificado" />
          </View>

          <Etapa
            titulo="Depósito registrado"
            detalle={`${registro.residente} · contenedor ${registro.contenedor}`}
            momento={registro.creadoEn}
          />
          <Etapa
            titulo="Validado por el administrador"
            detalle="Se confirmó la correcta deposición en el contenedor"
            momento={registro.validadoEn}
          />
          <Etapa
            titulo="Confirmado por el gestor"
            detalle={`El gestor retiró el contenedor de ${registro.torreNombre}${registro.codigoRetiro ? ` (lote ${registro.codigoRetiro})` : ""}`}
            momento={registro.certificadoEn}
            ultima
          />
        </Tarjeta>
      </View>

      <View className="px-6 mt-6">
        <Boton
          titulo={generando ? "Generando PDF..." : "Descargar PDF"}
          icono="⬇️"
          cargando={generando}
          onPress={descargar}
          className="mb-3"
        />
        <Boton
          titulo="Volver"
          variante="secundario"
          onPress={nav.volver}
          className="py-3"
        />
      </View>
    </Cuerpo>
  );
}

function Etapa({
  titulo,
  detalle,
  momento,
  ultima = false,
}: {
  titulo: string;
  detalle: string;
  momento: number | null;
  ultima?: boolean;
}) {
  return (
    <View className="flex-row">
      <View className="items-center mr-3">
        <View className="w-6 h-6 rounded-full bg-green-600 items-center justify-center">
          <Text className="text-white text-xs font-bold">✓</Text>
        </View>
        {!ultima && <View className="w-0.5 flex-1 bg-green-200 my-1" />}
      </View>
      <View className={ultima ? "flex-1" : "flex-1 pb-5"}>
        <Text className="text-gray-800 font-medium text-sm">{titulo}</Text>
        <Text className="text-gray-400 text-xs mt-1">{detalle}</Text>
        {momento ? (
          <Text className="text-gray-400 text-xs mt-1">{tiempoRelativo(momento)}</Text>
        ) : null}
      </View>
    </View>
  );
}
