import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type Registro } from "../state/EcoTrack";
import { descargarCertificado } from "../lib/certificadoPdf";
import {
  certificadoDelMes,
  etiquetaMes,
  mesDe,
  mesesConCertificado,
  tieneEstimados,
} from "../lib/certificadoMensual";
import { avisar, textoDeError } from "../lib/dialogos";
import {
  cantidadDeposito,
  fechaCorta,
  fechaLarga,
  formatKg,
  formatKgEstimado,
} from "../lib/formato";
import {
  Boton,
  Cuerpo,
  Encabezado,
  Insignia,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

/**
 * Certificado mensual: uno por mes y no uno por depósito, así una botella
 * suelta suma a tu mes sin generar un documento propio. Se abre en el mes que
 * pida la navegación (o el del depósito que se tocó) y deja cambiar de mes.
 */
export default function CertificadoScreen({ nav }: { nav: Navegacion }) {
  const { misRegistros, registroPorId } = useEcoTrack();
  const meses = useMemo(() => mesesConCertificado(misRegistros), [misRegistros]);

  const mesInicial = useMemo(() => {
    if (nav.params.mes) return nav.params.mes;
    const registro = nav.params.registroId ? registroPorId(nav.params.registroId) : undefined;
    if (registro) return mesDe(registro.creadoEn);
    return meses[0] ?? mesDe(Date.now());
    // Solo al abrir la pantalla: después el mes lo elige la persona.
  }, []);

  const [mes, setMes] = useState(mesInicial);
  const [generando, setGenerando] = useState(false);
  const certificado = useMemo(() => certificadoDelMes(misRegistros, mes), [misRegistros, mes]);

  async function descargar() {
    if (!certificado) return;
    setGenerando(true);
    try {
      const resultado = await descargarCertificado(certificado);
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
          titulo="Certificado del mes"
          subtitulo="Todo lo que reciclaste en el mes, verificado"
          alVolver={nav.volver}
        />
      </Encabezado>

      {meses.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          {meses.map((m) => {
            const activo = m === mes;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMes(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                className={`rounded-full px-4 py-2 mr-2 border ${
                  activo ? "bg-green-700 border-green-700" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-xs font-medium ${activo ? "text-white" : "text-gray-600"}`}>
                  {etiquetaMes(m)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {!certificado ? (
        <View className="px-6 mt-6">
          <Vacio
            emoji="📄"
            texto={`En ${etiquetaMes(mes)} todavía no tienes depósitos certificados. Se completan cuando el gestor retira el contenedor.`}
          />
        </View>
      ) : (
        <>
          <View className="px-6 mt-4">
            <Tarjeta className="items-center py-7">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                <Text className="text-3xl">♻️</Text>
              </View>
              <Text className="text-gray-400 text-xs tracking-widest uppercase">EcoTrack</Text>
              <Text className="text-gray-900 text-xl font-bold mt-1 text-center">
                Certificado mensual de reciclaje
              </Text>
              <Text className="text-green-700 font-semibold mt-1 capitalize">
                {certificado.etiqueta}
              </Text>

              <View className="w-16 h-0.5 bg-green-600 my-5" />

              <Text className="text-gray-500 text-sm text-center">Se certifica que</Text>
              <Text className="text-gray-900 text-lg font-bold mt-1 text-center">
                {certificado.residente}
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-1">
                {certificado.torreNombre} · {certificado.depto}
              </Text>

              <Text className="text-gray-500 text-sm text-center mt-5">
                recicló de forma verificada
              </Text>
              <Text className="text-green-700 text-3xl font-bold mt-1">
                {tieneEstimados(certificado)
                  ? formatKgEstimado(certificado.kgCertificados)
                  : formatKg(certificado.kgCertificados)}
              </Text>
              <Text className="text-gray-500 text-xs mt-1 text-center">
                en {certificado.certificados.length} depósito
                {certificado.certificados.length === 1 ? "" : "s"} que completaron la cadena
              </Text>

              <View className="flex-row flex-wrap justify-center mt-3">
                {certificado.porMaterial.map((m) => (
                  <View key={m.material} className="bg-green-50 rounded-full px-3 py-1 m-1">
                    <Text className="text-green-800 text-[11px] font-medium">
                      {m.material} · {formatKg(m.kg)} ({m.depositos})
                    </Text>
                  </View>
                ))}
              </View>

              <View className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 mt-5 items-center">
                <Text className="text-gray-400 text-xs mb-1">Código del certificado</Text>
                <Text className="text-gray-900 font-bold text-lg tracking-widest">
                  {certificado.codigo}
                </Text>
              </View>

              {certificado.enCurso ? (
                <Text className="text-gray-400 text-[11px] mt-3 text-center">
                  Mes en curso: el certificado se completa con cada retiro. Estado al{" "}
                  {fechaLarga(Date.now())}
                </Text>
              ) : null}
            </Tarjeta>
          </View>

          <View className="px-6 mt-6">
            <Text className="text-gray-800 font-semibold mb-1">
              Depósitos del mes ({certificado.registros.length})
            </Text>
            <Text className="text-gray-400 text-xs mb-3">
              Solo suman los certificados. Los demás siguen en proceso o fueron rechazados.
            </Text>
            {certificado.registros.map((r) => (
              <FilaDeposito key={r.id} registro={r} />
            ))}
          </View>

          <View className="px-6 mt-4">
            <Boton
              titulo={generando ? "Generando PDF..." : "Descargar PDF del mes"}
              icono="⬇️"
              cargando={generando}
              onPress={descargar}
              className="mb-3"
            />
          </View>
        </>
      )}

      <View className="px-6 mt-2">
        <Boton titulo="Volver" variante="secundario" onPress={nav.volver} className="py-3" />
      </View>
    </Cuerpo>
  );
}

/** Un depósito del mes con la fecha de cada etapa de la cadena. */
function FilaDeposito({ registro }: { registro: Registro }) {
  const suma = registro.estado === "certificado";
  return (
    <Tarjeta className={`mb-2 py-4 ${suma ? "" : "opacity-60"}`}>
      <View className="flex-row justify-between items-start">
        <Text className="text-gray-800 font-medium text-sm flex-1 pr-2">
          {registro.material} · {cantidadDeposito(registro)}
        </Text>
        <Insignia estado={registro.estado} />
      </View>
      <Text className="text-gray-500 text-xs mt-2">
        Depósito {fechaCorta(registro.creadoEn)}
        {registro.validadoEn
          ? ` · ${registro.estado === "rechazado" ? "Rechazado" : "Validado"} ${fechaCorta(registro.validadoEn)}`
          : ""}
        {registro.certificadoEn ? ` · Certificado ${fechaCorta(registro.certificadoEn)}` : ""}
      </Text>
      {registro.codigoRetiro ? (
        <Text className="text-gray-400 text-[11px] mt-1">
          Retiro {registro.codigoRetiro}
          {registro.codigo ? ` · ${registro.codigo}` : ""}
        </Text>
      ) : null}
    </Tarjeta>
  );
}
