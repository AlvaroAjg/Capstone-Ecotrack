import React, { useState } from "react";
import { Text, View } from "react-native";
import { Navegacion } from "../../App";
import { MATERIALES, useEcoTrack, type LoteRetiro } from "../state/EcoTrack";
import { avisar, textoDeError } from "../lib/dialogos";
import { formatKg, tiempoRelativo } from "../lib/formato";
import {
  AvatarPerfil,
  CampanaAvisos,
  Aviso,
  Boton,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

/**
 * Panel del gestor de reciclaje.
 *
 * El gestor retira el contenedor de una torre, no depósitos sueltos, así que
 * todo está agregado por torre: kilos totales y desglose por material. No se
 * muestran nombres de residentes ni departamentos, porque al gestor no le hacen
 * falta para hacer su trabajo.
 */
export default function GestorScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    lotesPorRetirar,
    kgEnCola,
    retirosConfirmadosHoy,
    errorDatos,
    confirmarRetiro,
    avisosNuevos,
  } = useEcoTrack();

  const [ultimoRetiro, setUltimoRetiro] = useState<string | null>(null);

  return (
    <Cuerpo>
      <Encabezado tono="oscuro">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <TituloEncabezado
              tono="oscuro"
              titulo="Retiros pendientes"
              subtitulo={`${usuario?.nombre ?? "Gestor"} · contenedores por torre`}
            />
          </View>
          <CampanaAvisos nuevos={avisosNuevos} alPresionar={() => nav.ir("avisos")} />
          <AvatarPerfil
            nombre={usuario?.nombre ?? "Gestor"}
            alPresionar={() => nav.ir("perfil")}
            color="bg-gray-700"
          />
        </View>
      </Encabezado>

      <FilaMetricas
        metricas={[
          { valor: `${lotesPorRetirar.length}`, etiqueta: "Torres por retirar" },
          { valor: formatKg(kgEnCola), etiqueta: "Kilos en cola" },
          { valor: `${retirosConfirmadosHoy}`, etiqueta: "Certificados hoy" },
        ]}
      />

      {errorDatos ? (
        <View className="px-6 mt-6">
          <Aviso texto={errorDatos} />
        </View>
      ) : null}

      {ultimoRetiro ? (
        <View className="px-6 mt-6">
          <Aviso
            tono="info"
            texto={`Retiro ${ultimoRetiro} confirmado. Los certificados de ese lote ya fueron emitidos.`}
          />
        </View>
      ) : null}

      <Seccion
        titulo="Contenedores validados"
        etiqueta={`${lotesPorRetirar.length} torre${lotesPorRetirar.length === 1 ? "" : "s"}`}
      >
        {lotesPorRetirar.length === 0 ? (
          <Vacio
            emoji="🎉"
            texto="No quedan contenedores por retirar. Todo lo validado fue certificado."
          />
        ) : (
          lotesPorRetirar.map((lote) => (
            <TarjetaLote
              key={lote.torreId}
              lote={lote}
              alConfirmar={confirmarRetiro}
              alConfirmado={setUltimoRetiro}
            />
          ))
        )}
      </Seccion>

    </Cuerpo>
  );
}

const EMOJI_MATERIAL: Record<string, string> = Object.fromEntries(
  MATERIALES.map((m) => [m.nombre, m.emoji])
);

function TarjetaLote({
  lote,
  alConfirmar,
  alConfirmado,
}: {
  lote: LoteRetiro;
  alConfirmar: (torreId: string) => Promise<string>;
  alConfirmado: (codigo: string) => void;
}) {
  const [ocupado, setOcupado] = useState(false);

  async function confirmar() {
    setOcupado(true);
    try {
      const codigo = await alConfirmar(lote.torreId);
      alConfirmado(codigo);
    } catch (e) {
      avisar("No se pudo confirmar el retiro", textoDeError(e));
      setOcupado(false);
    }
  }

  return (
    <Tarjeta className="mb-3">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 min-w-0 pr-2">
          <Text className="text-gray-800 font-semibold text-base">{lote.torreNombre}</Text>
          <Text className="text-gray-400 text-xs mt-1">{lote.condominio}</Text>
        </View>
        <Text className="text-gray-400 text-xs shrink-0" numberOfLines={1}>
          {tiempoRelativo(lote.esperandoDesde)}
        </Text>
      </View>

      <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 items-center mb-3">
        <Text className="text-green-700 text-3xl font-bold">{formatKg(lote.kgTotal)}</Text>
        <Text className="text-gray-500 text-xs mt-1">
          {lote.depositos} depósito{lote.depositos === 1 ? "" : "s"} validado
          {lote.depositos === 1 ? "" : "s"}
        </Text>
      </View>

      <View className="flex-row flex-wrap mb-3">
        {lote.porMaterial.map((m) => (
          <View
            key={m.material}
            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 mr-2 mb-2"
          >
            <Text className="text-gray-700 text-xs">
              {EMOJI_MATERIAL[m.material] ?? "♻️"} {m.material} · {formatKg(m.kg)}
            </Text>
          </View>
        ))}
      </View>

      <Boton
        titulo={ocupado ? "Emitiendo certificados..." : `Confirmar retiro de ${lote.torreNombre}`}
        cargando={ocupado}
        onPress={confirmar}
        className="py-3"
      />
    </Tarjeta>
  );
}
