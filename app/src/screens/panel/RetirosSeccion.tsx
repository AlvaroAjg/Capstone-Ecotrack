import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { nombreContenedor } from "../../lib/tipos";
import { validarRetiro } from "../../lib/retiros";
import { textoFecha } from "../../lib/incentivo";
import { formatKg, tiempoRelativo } from "../../lib/formato";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import ReporteMensual from "../../components/ReporteMensual";
import { Boton, Campo, Tarjeta } from "../../components/ui";

/**
 * Retiros: el administrador confirma que se fue el material de unos
 * contenedores. Es la etapa 2 de la cadena: al registrarlo se certifican los
 * depósitos validados de esos contenedores y cada colaborador recibe su
 * código de certificado (ver registrarRetiro en services/retiros.ts).
 */
export default function RetirosSeccion() {
  const { miPlanta, areas, registros, incidencias } = useEcoTrack();
  return (
    <View className="max-w-[1100px]">
      <FormularioRetiro />
      {miPlanta ? (
        <View className="max-w-[720px]">
          <Text className="text-gray-800 text-base font-semibold mb-3">Reporte mensual</Text>
          <ReporteMensual
            planta={miPlanta}
            areas={areas}
            registros={registros}
            incidencias={incidencias}
          />
        </View>
      ) : null}
    </View>
  );
}

function FormularioRetiro() {
  const { porRetirar, registrarRetiro } = useEcoTrack();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [fecha, setFecha] = useState(textoFecha(Date.now()));
  const [quienRetira, setQuienRetira] = useState("");
  const [guia, setGuia] = useState("");
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const seleccion = porRetirar.filter((c) => elegidos.includes(c.contenedor));
  const depositos = seleccion.reduce((t, c) => t + c.depositos, 0);
  const kg = seleccion.reduce((t, c) => t + c.kgEstimado, 0);

  function alternar(codigo: string) {
    setElegidos((prev) => (prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]));
  }

  async function registrar() {
    const revisado = validarRetiro({ fecha, quienRetira, guia, peso }, seleccion.length);
    if (!revisado.ok) {
      avisar("Revisa el retiro", revisado.error);
      return;
    }
    const acepta = await confirmar(
      "Registrar retiro",
      `Se certificarán ${depositos} depósito${depositos === 1 ? "" : "s"} (${formatKg(kg)} estimados) de ${seleccion.length} contenedor${seleccion.length === 1 ? "" : "es"}. Cada colaborador recibe su código de certificado. Un retiro no se puede editar ni borrar.`,
      "Registrar"
    );
    if (!acepta) return;
    setGuardando(true);
    try {
      const codigo = await registrarRetiro(revisado.datos, elegidos);
      setElegidos([]);
      setQuienRetira("");
      setGuia("");
      setPeso("");
      avisar("Retiro registrado", `Quedó como ${codigo}. Los depósitos ya aparecen certificados para cada colaborador.`);
    } catch (e) {
      avisar("No se registró el retiro", `${textoDeError(e)} No se certificó ningún depósito; intenta de nuevo.`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta className="mb-6">
      <Text className="text-gray-800 text-base font-semibold mb-1">Registrar retiro</Text>
      <Text className="text-gray-500 text-xs mb-4">
        Marca los contenedores que se vaciaron. Solo aparecen los que tienen depósitos validados.
      </Text>

      {porRetirar.length === 0 ? (
        <Text className="text-gray-500 text-sm mb-4">
          No hay contenedores esperando retiro: aparecen cuando el validador deja conforme su tanda.
        </Text>
      ) : (
        <View className="mb-4">
          {porRetirar.map((c) => {
            const marcado = elegidos.includes(c.contenedor);
            return (
              <TouchableOpacity
                key={c.contenedor}
                onPress={() => alternar(c.contenedor)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: marcado }}
                className={`flex-row items-center border rounded-xl px-4 py-3 mb-2 ${
                  marcado ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"
                }`}
              >
                <View
                  className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                    marcado ? "bg-green-700 border-green-700" : "border-gray-400"
                  }`}
                >
                  {marcado ? <Text className="text-white text-xs font-bold">✓</Text> : null}
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-gray-800 text-sm font-medium">
                    {c.punto ? `${c.punto} · ` : ""}
                    {nombreContenedor(c)}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {c.contenedor} · validado {tiempoRelativo(c.esperandoDesde)}
                  </Text>
                </View>
                <Text className="w-32 text-right text-gray-700 text-sm">
                  {c.depositos} depósito{c.depositos === 1 ? "" : "s"}
                </Text>
                <Text className="w-28 text-right text-gray-900 text-sm font-semibold">
                  {formatKg(c.kgEstimado)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View className="flex-row">
        <View className="w-40 mr-3">
          <Campo etiqueta="Fecha del retiro" placeholder="06-10-2026" value={fecha} onChangeText={setFecha} />
        </View>
        <View className="flex-1 mr-3">
          <Campo
            etiqueta="Quién retira"
            placeholder="Empresa o persona"
            value={quienRetira}
            onChangeText={setQuienRetira}
            maxLength={80}
          />
        </View>
        <View className="w-44 mr-3">
          <Campo etiqueta="N° de guía (opcional)" value={guia} onChangeText={setGuia} maxLength={40} />
        </View>
        <View className="w-44">
          <Campo
            etiqueta="Peso informado, kg (opcional)"
            keyboardType="decimal-pad"
            value={peso}
            onChangeText={setPeso}
          />
        </View>
      </View>
      <Text className="text-gray-400 text-xs mb-3">
        Si quien retira informa el peso, el retiro queda como verificado; si no, como estimado según la
        talla de cada depósito.
      </Text>

      <View className="flex-row items-center">
        <Boton
          titulo="Registrar retiro"
          cargando={guardando}
          deshabilitado={seleccion.length === 0}
          onPress={registrar}
          className="py-3 px-6 mr-4"
        />
        {seleccion.length > 0 ? (
          <Text className="text-gray-600 text-sm">
            {seleccion.length} contenedor{seleccion.length === 1 ? "" : "es"} · {depositos} depósito
            {depositos === 1 ? "" : "s"} · {formatKg(kg)} estimados
          </Text>
        ) : null}
      </View>
    </Tarjeta>
  );
}
