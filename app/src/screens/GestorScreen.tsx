import React from "react";
import { View, Text } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { formatKg, sumaKg, tiempoRelativo } from "../lib/formato";
import {
  Boton,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Tarjeta,
  TituloEncabezado,
  Vacio,
} from "../components/ui";

export default function GestorScreen({ nav }: { nav: Navegacion }) {
  const { porRetirar, retirosConfirmadosHoy, confirmarRetiro, cerrarSesion } = useEcoTrack();

  const kgEnCola = sumaKg(porRetirar.map((r) => r.kg));

  function salir() {
    cerrarSesion();
    nav.ir("login");
  }

  return (
    <Cuerpo>
      <Encabezado tono="oscuro">
        <TituloEncabezado
          tono="oscuro"
          titulo="Retiros pendientes"
          subtitulo="Recicla Sur SpA · Condominio Piloto, torres A y B"
        />
      </Encabezado>

      <FilaMetricas
        metricas={[
          { valor: `${porRetirar.length}`, etiqueta: "Por retirar" },
          { valor: formatKg(kgEnCola), etiqueta: "Kilos en cola" },
          { valor: `${retirosConfirmadosHoy}`, etiqueta: "Procesados hoy" },
        ]}
      />

      <Seccion titulo="Validados por el administrador">
        {porRetirar.length === 0 ? (
          <Vacio
            emoji="🎉"
            texto="No quedan retiros pendientes. Todos los depósitos validados fueron certificados."
          />
        ) : (
          porRetirar.map((r) => (
            <Tarjeta key={r.id} className="mb-3">
              <View className="mb-3">
                <Text className="text-gray-800 font-medium">{r.residente}</Text>
                <Text className="text-gray-400 text-xs mt-1">
                  {r.torre} · {r.depto} · {r.material} · {formatKg(r.kg)}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">Contenedor {r.contenedor}</Text>
                <View className="bg-blue-50 rounded-lg px-3 py-2 mt-3">
                  <Text className="text-blue-700 text-xs">
                    ✓ Validado por administrador · {tiempoRelativo(r.validadoEn ?? r.creadoEn)}
                  </Text>
                </View>
              </View>
              <Boton
                titulo="Confirmar retiro y emitir certificado"
                onPress={() => confirmarRetiro(r.id)}
                className="py-3"
              />
            </Tarjeta>
          ))
        )}
      </Seccion>

      <View className="px-6 mt-6">
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} className="py-3" />
      </View>
    </Cuerpo>
  );
}
