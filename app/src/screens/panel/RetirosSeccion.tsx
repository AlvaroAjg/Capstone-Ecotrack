import React, { useMemo, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { nombreContenedor } from "../../lib/tipos";
import { retirosDelMes, validarRetiro } from "../../lib/retiros";
import { textoFecha } from "../../lib/incentivo";
import { fechaCorta, formatKg, tiempoRelativo } from "../../lib/formato";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import ReporteMensual from "./ReporteMensual";
import {
  Bloque,
  BotonPanel,
  CampoPanel,
  EncabezadoBloque,
  EncabezadoSeccion,
  Icono,
  Insignia,
  Texto,
} from "./estilo";

/** Desde este ancho, el reporte va al lado de los retiros; bajo él, debajo. */
const ANCHO_DOS_COLUMNAS = 1280;

/**
 * Retiros: el administrador confirma que se fue el material de unos
 * contenedores. Es la etapa 2 de la cadena: al registrarlo se certifican los
 * depósitos validados de esos contenedores y cada colaborador recibe su
 * código de certificado (ver registrarRetiro en services/retiros.ts).
 */
export default function RetirosSeccion() {
  const { miPlanta, areas, registros, incidencias, retiros } = useEcoTrack();
  const dosColumnas = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;
  return (
    <View>
      <EncabezadoSeccion
        titulo="Retiros y reportes"
        detalle="Quién retiró, cuándo y con qué guía. Desde aquí sale el reporte mensual de la planta."
      />
      <View className={dosColumnas ? "flex-row items-start" : ""}>
        <View className={dosColumnas ? "flex-1 min-w-0 mr-7" : "mb-6"}>
          <FormularioRetiro />
          <HistorialRetiros />
        </View>
        {miPlanta ? (
          <View className={dosColumnas ? "w-[380px]" : "max-w-[480px]"}>
            <ReporteMensual
              planta={miPlanta}
              areas={areas}
              registros={registros}
              incidencias={incidencias}
              retiros={retiros}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function FormularioRetiro() {
  const { porRetirar, incidencias, registrarRetiro } = useEcoTrack();
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
    <Bloque className="mb-6">
      <EncabezadoBloque
        titulo="Registrar retiro"
        detalle="Marca los contenedores que se vaciaron. Solo aparecen los que tienen depósitos validados."
      />

      {porRetirar.length === 0 ? (
        <Texto className="text-tinta-suave text-sm mb-4">
          No hay contenedores esperando retiro: aparecen cuando el validador deja conforme su tanda.
        </Texto>
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
                  marcado ? "border-oliva bg-oliva-claro" : "border-piedra-borde bg-white"
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-[5px] border-[1.5px] mr-3 items-center justify-center ${
                    marcado ? "bg-oliva border-oliva" : "border-piedra-control bg-white"
                  }`}
                >
                  {marcado ? <Icono nombre="check" tamano={13} color="#FFFFFF" grosor={3} /> : null}
                </View>
                <View className="flex-1 min-w-0">
                  <Texto className="text-tinta text-sm font-semibold">
                    {c.punto ? `${c.punto} · ` : ""}
                    {nombreContenedor(c)}
                  </Texto>
                  <Texto className="text-tinta-suave text-xs mt-0.5">
                    {c.contenedor} · validado {tiempoRelativo(c.esperandoDesde)}
                  </Texto>
                  {/* Advertencia de seguridad para quien retira, como la que veía el
                      gestor: el validador encontró algo que no corresponde. */}
                  {incidencias
                    .filter((i) => !i.atendida && i.contenedor === c.contenedor)
                    .map((i) => (
                      <View key={i.id} className="flex-row items-start mt-1.5">
                        <View className="mt-px mr-1.5">
                          <Icono nombre="alerta" tamano={13} color="#7A4E17" grosor={2.2} />
                        </View>
                        <Texto className="text-ambar-oscuro text-xs font-semibold flex-1">
                          Tiene {i.contaminante.toLowerCase()} (reportado {tiempoRelativo(i.reportadoEn)}): avisa a
                          quien lo retire para que lo haga con cuidado.
                        </Texto>
                      </View>
                    ))}
                </View>
                <Texto className="w-28 text-right text-tinta-media text-[13px]">
                  {c.depositos} depósito{c.depositos === 1 ? "" : "s"}
                </Texto>
                <Texto className="w-24 text-right text-tinta text-sm font-bold">{formatKg(c.kgEstimado)}</Texto>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View className="flex-row">
        <CampoPanel
          etiqueta="Fecha del retiro"
          placeholder="06-10-2026"
          value={fecha}
          onChangeText={setFecha}
          className="w-36 mr-3"
        />
        <CampoPanel
          etiqueta="Quién retira"
          placeholder="Empresa o persona"
          value={quienRetira}
          onChangeText={setQuienRetira}
          maxLength={80}
          className="flex-1 mr-3"
        />
        <CampoPanel
          etiqueta="N° de guía (opcional)"
          value={guia}
          onChangeText={setGuia}
          maxLength={40}
          className="w-40 mr-3"
        />
        <CampoPanel
          etiqueta="Peso, kg (opcional)"
          keyboardType="decimal-pad"
          value={peso}
          onChangeText={setPeso}
          className="w-36"
        />
      </View>
      <Texto className="text-tinta-suave text-xs -mt-1 mb-4">
        Si quien retira informa el peso, el retiro queda como verificado; si no, como estimado según la
        talla de cada depósito.
      </Texto>

      <View className="flex-row items-center">
        <BotonPanel
          titulo="Registrar retiro"
          icono="camion"
          cargando={guardando}
          deshabilitado={seleccion.length === 0}
          onPress={registrar}
          className="mr-4"
        />
        {seleccion.length > 0 ? (
          <Texto className="text-tinta-media text-[13px]">
            {seleccion.length} contenedor{seleccion.length === 1 ? "" : "es"} · {depositos} depósito
            {depositos === 1 ? "" : "s"} · {formatKg(kg)} estimados
          </Texto>
        ) : null}
      </View>
    </Bloque>
  );
}

/** Los retiros del mes, del más reciente al más antiguo (ver retirosDelMes). */
function HistorialRetiros() {
  const { retiros, contenedores } = useEcoTrack();
  const delMes = useMemo(() => retirosDelMes(retiros), [retiros]);
  const kgMes = delMes.reduce((t, r) => t + (r.pesoKg ?? r.kgEstimado), 0);
  const nombreDe = (codigo: string) => {
    const c = contenedores.find((x) => x.codigo === codigo);
    return c ? `${c.punto} · ${nombreContenedor(c)}` : codigo;
  };

  return (
    <Bloque>
      <EncabezadoBloque
        titulo="Retiros del mes"
        derecha={
          delMes.length > 0 ? (
            <Texto className="text-tinta-suave text-xs">
              {delMes.length} retiro{delMes.length === 1 ? "" : "s"}, {formatKg(kgMes)} en total
            </Texto>
          ) : null
        }
      />
      {delMes.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">Todavía no hay retiros registrados este mes.</Texto>
      ) : (
        <>
          <View className="flex-row border-b-[1.5px] border-vino pb-2">
            <Texto className="w-28 text-tinta-media text-[13px] font-semibold">Fecha</Texto>
            <Texto className="w-40 text-tinta-media text-[13px] font-semibold">Retiró</Texto>
            <Texto className="w-24 text-tinta-media text-[13px] font-semibold">Guía</Texto>
            <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Contenedores</Texto>
            <Texto className="w-32 text-tinta-media text-[13px] font-semibold text-right">Peso</Texto>
          </View>
          {delMes.map((r) => (
            <View key={r.id} className="flex-row items-center py-3 border-b border-piedra-linea">
              <View className="w-28">
                <Texto className="text-tinta text-[13px]">{fechaCorta(r.fecha)}</Texto>
                <Texto className="text-tinta-suave text-[11px]">{r.id}</Texto>
              </View>
              <Texto className="w-40 text-tinta text-[13px] pr-2" numberOfLines={1}>
                {r.quienRetira}
              </Texto>
              <Texto className="w-24 text-tinta-media text-[13px]">{r.guia ?? "—"}</Texto>
              <Texto className="flex-1 text-tinta-media text-xs pr-2">
                {r.contenedores.map(nombreDe).join(", ")} · {r.depositos} depósitos
              </Texto>
              <View className="w-32 items-end">
                <Texto className="text-tinta text-sm font-bold">{formatKg(r.pesoKg ?? r.kgEstimado)}</Texto>
                <View className="mt-1">
                  <Insignia texto={r.verificado ? "Verificado" : "Estimado"} tono={r.verificado ? "oliva" : "gris"} />
                </View>
              </View>
            </View>
          ))}
          <Texto className="text-tinta-suave text-xs mt-3">
            Verificado: con el peso que informó quien retiró. Estimado: sin peso, se muestran los kilos
            estimados por la talla de cada depósito.
          </Texto>
        </>
      )}
    </Bloque>
  );
}
