import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type Registro } from "../state/EcoTrack";
import { cantidadDeposito, formatKg, tiempoRelativo } from "../lib/formato";
import { etiquetaMes, mesDe } from "../lib/certificadoMensual";
import { useDescargaCertificado } from "../lib/useDescargaCertificado";
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
  const { descargar, generando } = useDescargaCertificado();

  // Agrupados por el mes en que se hicieron, que es el mes de su certificado.
  // misRegistros ya viene del más reciente al más antiguo.
  const porMes = useMemo(() => {
    const grupos: { mes: string; registros: Registro[] }[] = [];
    for (const r of misRegistros) {
      const mes = mesDe(r.creadoEn);
      const grupo = grupos[grupos.length - 1];
      if (grupo?.mes === mes) grupo.registros.push(r);
      else grupos.push({ mes, registros: [r] });
    }
    return grupos;
  }, [misRegistros]);

  return (
    <Cuerpo>
      <Encabezado>
        <TituloEncabezado titulo="Mis reciclados" subtitulo="Todo tu historial de depósitos" />
      </Encabezado>

      {misRegistros.length === 0 ? (
        <Seccion titulo="Actividad">
          <Vacio
            emoji="♻️"
            texto="Aún no registras reciclaje. Escanea el QR del contenedor para empezar."
          />
        </Seccion>
      ) : (
        porMes.map(({ mes, registros }) => {
          const conCertificado = registros.some((r) => r.estado === "certificado");
          const titulo = etiquetaMes(mes);
          return (
            <View key={mes} className="px-6 mt-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-gray-800 font-semibold">
                  {titulo.charAt(0).toUpperCase() + titulo.slice(1)}
                  <Text className="text-gray-400 font-normal text-xs">
                    {"  "}
                    {registros.length} registro{registros.length === 1 ? "" : "s"}
                  </Text>
                </Text>
                {conCertificado ? (
                  <TouchableOpacity
                    onPress={() => descargar(mes)}
                    disabled={generando !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Descargar certificado de ${titulo}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-green-700 text-xs font-semibold">
                      {generando === mes ? "Generando..." : "⬇️ Certificado"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {registros.map((r) => (
                <TarjetaActividad
                  key={r.id}
                  registro={r}
                  alAbrir={() => nav.ir("deposito", { registroId: r.id })}
                />
              ))}
            </View>
          );
        })
      )}
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
  // Solo pasa en depósitos antiguos, registrados en kilos: con talla de bolsa
  // el administrador valida la tanda y no corrige depósito por depósito.
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
            {registro.material} · {cantidadDeposito(registro)}
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
          Código {registro.codigo}
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
