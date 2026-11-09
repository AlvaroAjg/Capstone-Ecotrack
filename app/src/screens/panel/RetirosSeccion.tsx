import React, { useMemo, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { nombreContenedor, type ContenedorPorRetirar } from "../../lib/tipos";
import { detalleRetiro, quienesRetiraron, retirosDelMes, validarRetiro } from "../../lib/retiros";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { fechaIso, isoATexto } from "../../lib/incentivo";
import { formatKg, tiempoRelativo } from "../../lib/formato";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import ReporteMensual from "./ReporteMensual";
import {
  Bloque,
  BotonPanel,
  CampoFecha,
  CampoPanel,
  EncabezadoBloque,
  EncabezadoSeccion,
  Icono,
  Insignia,
  Pildoras,
  Texto,
} from "./estilo";

/** Desde este ancho, el reporte va al lado de los retiros; bajo él, debajo. */
const ANCHO_DOS_COLUMNAS = 1280;

/** "8 nov", para la tabla de retiros. */
function diaCorto(t: number): string {
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

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
          <HistorialRetiros />
          <FormularioRetiro />
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

/** Los retiros del mes, del más reciente al más antiguo (ver retirosDelMes). */
function HistorialRetiros() {
  const { retiros, contenedores, registros } = useEcoTrack();
  const delMes = useMemo(() => retirosDelMes(retiros), [retiros]);
  const kgMes = delMes.reduce((t, r) => t + (r.pesoKg ?? r.kgEstimado), 0);
  const nombreMes = etiquetaMes(mesDe(Date.now())).split(" ")[0];

  return (
    <Bloque className="mb-6">
      <EncabezadoBloque
        titulo={`Retiros de ${nombreMes}`}
        derecha={
          delMes.length > 0 ? (
            <Texto className="text-tinta-suave text-[13px]">
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
            <Texto className="w-16 text-tinta-media text-[13px] font-semibold">Fecha</Texto>
            <Texto className="w-36 text-tinta-media text-[13px] font-semibold">Retiró</Texto>
            <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Puntos limpios</Texto>
            <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Materiales</Texto>
            <Texto className="w-20 text-tinta-media text-[13px] font-semibold">Guía</Texto>
            <Texto className="w-24 text-right text-tinta-media text-[13px] font-semibold">Peso</Texto>
          </View>
          {delMes.map((r) => {
            const detalle = detalleRetiro(r, contenedores, registros);
            return (
              <View key={r.id} className="flex-row items-center py-3 border-b border-piedra-linea">
                <View className="w-16">
                  <Texto className="text-tinta text-[13px]">{diaCorto(r.fecha)}</Texto>
                  <Texto className="text-tinta-suave text-[10px]">{r.id}</Texto>
                </View>
                <Texto className="w-36 text-tinta text-[13px] pr-2" numberOfLines={1}>
                  {r.quienRetira}
                </Texto>
                <Texto className="flex-1 text-tinta-media text-[13px] pr-2">{detalle.puntos}</Texto>
                <Texto className="flex-1 text-tinta-media text-[13px] pr-2">{detalle.materiales}</Texto>
                <Texto className="w-20 text-tinta-media text-[13px]">{r.guia ?? "—"}</Texto>
                <View className="w-24 items-end">
                  <Texto className="text-tinta text-sm font-bold">{formatKg(r.pesoKg ?? r.kgEstimado)}</Texto>
                  <View className="mt-1">
                    <Insignia texto={r.verificado ? "verificado" : "estimado"} tono={r.verificado ? "oliva" : "gris"} />
                  </View>
                </View>
              </View>
            );
          })}
          <Texto className="text-tinta-suave text-xs mt-3">
            Verificado: con el peso que informó quien retiró. Estimado: sin peso, se muestran los kilos
            estimados por la talla de cada depósito.
          </Texto>
        </>
      )}
    </Bloque>
  );
}

/** Los contenedores que esperan retiro, agrupados por su punto limpio. */
function porPunto(lista: ContenedorPorRetirar[]): { punto: string; contenedores: ContenedorPorRetirar[] }[] {
  const grupos = new Map<string, ContenedorPorRetirar[]>();
  for (const c of lista) {
    const punto = c.punto || "Sin punto";
    grupos.set(punto, [...(grupos.get(punto) ?? []), c]);
  }
  return [...grupos.entries()].map(([punto, contenedores]) => ({ punto, contenedores }));
}

function FormularioRetiro() {
  const { porRetirar, incidencias, retiros, registrarRetiro } = useEcoTrack();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [fecha, setFecha] = useState(fechaIso(Date.now()));
  const [quienRetira, setQuienRetira] = useState("");
  const [guia, setGuia] = useState("");
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const anteriores = useMemo(() => quienesRetiraron(retiros), [retiros]);
  const grupos = useMemo(() => porPunto(porRetirar), [porRetirar]);

  const seleccion = porRetirar.filter((c) => elegidos.includes(c.contenedor));
  const depositos = seleccion.reduce((t, c) => t + c.depositos, 0);
  const kg = seleccion.reduce((t, c) => t + c.kgEstimado, 0);

  function alternar(codigos: string[]) {
    setElegidos((prev) => {
      const todos = codigos.every((c) => prev.includes(c));
      return todos ? prev.filter((c) => !codigos.includes(c)) : [...new Set([...prev, ...codigos])];
    });
  }

  async function registrar() {
    const revisado = validarRetiro({ fecha: isoATexto(fecha), quienRetira, guia, peso }, seleccion.length);
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
    <Bloque>
      <EncabezadoBloque
        titulo="Registrar retiro"
        detalle="Marca los puntos limpios o los contenedores que se vaciaron. Solo aparecen los que tienen depósitos validados."
      />

      <View className="flex-row">
        <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={setFecha} maximo={fechaIso(Date.now())} className="w-44 mr-3" />
        <CampoPanel
          etiqueta="Quién retira"
          placeholder="Empresa o persona"
          value={quienRetira}
          onChangeText={setQuienRetira}
          maxLength={80}
          className="flex-1 mr-3"
        />
        <CampoPanel
          etiqueta="Número de guía (opcional)"
          placeholder="Por ejemplo, 004530"
          value={guia}
          onChangeText={setGuia}
          maxLength={40}
          className="w-48"
        />
      </View>
      {anteriores.length > 0 ? (
        <View className="flex-row flex-wrap items-center -mt-2 mb-3">
          <Texto className="text-tinta-suave text-xs mr-2 mb-2">Retiraron antes:</Texto>
          <Pildoras
            opciones={anteriores.map((n) => ({ valor: n, etiqueta: n }))}
            valor={quienRetira.trim()}
            alCambiar={setQuienRetira}
          />
        </View>
      ) : null}

      <Texto className="text-tinta-media text-[13px] font-semibold mb-2">Puntos limpios retirados</Texto>
      {grupos.length === 0 ? (
        <Texto className="text-tinta-suave text-sm mb-4">
          No hay contenedores esperando retiro: aparecen cuando el validador deja conforme su tanda.
        </Texto>
      ) : (
        <View className="mb-4">
          {grupos.map((g) => {
            const codigos = g.contenedores.map((c) => c.contenedor);
            const marcados = codigos.filter((c) => elegidos.includes(c)).length;
            return (
              <View
                key={g.punto}
                className={`border rounded-xl mb-2 overflow-hidden ${
                  marcados > 0 ? "border-oliva-hoja bg-oliva-claro" : "border-piedra-control bg-white"
                }`}
              >
                <Casilla
                  marcada={marcados === codigos.length}
                  parcial={marcados > 0 && marcados < codigos.length}
                  alPresionar={() => alternar(codigos)}
                  titulo={g.punto}
                  detalle={`${g.contenedores.length} contenedor${g.contenedores.length === 1 ? "" : "es"} · ${g.contenedores.reduce(
                    (t, c) => t + c.depositos,
                    0
                  )} depósitos · ${formatKg(g.contenedores.reduce((t, c) => t + c.kgEstimado, 0))}`}
                  destacado
                />
                {g.contenedores.map((c) => (
                  <View key={c.contenedor} className="border-t border-piedra-linea pl-8">
                    <Casilla
                      marcada={elegidos.includes(c.contenedor)}
                      alPresionar={() => alternar([c.contenedor])}
                      titulo={nombreContenedor(c)}
                      detalle={`${c.contenedor} · ${c.depositos} depósito${c.depositos === 1 ? "" : "s"} · ${formatKg(
                        c.kgEstimado
                      )} · validado ${tiempoRelativo(c.esperandoDesde)}`}
                    />
                    {/* Advertencia de seguridad para quien retira: el validador
                        encontró algo que no corresponde. */}
                    {incidencias
                      .filter((i) => !i.atendida && i.contenedor === c.contenedor)
                      .map((i) => (
                        <View key={i.id} className="flex-row items-start px-4 pb-2.5 -mt-1">
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
                ))}
              </View>
            );
          })}
        </View>
      )}

      <View className="flex-row items-end">
        <CampoPanel
          etiqueta="Peso informado en kg (opcional)"
          placeholder="Solo si quien retira lo entrega"
          keyboardType="decimal-pad"
          value={peso}
          onChangeText={setPeso}
          className="w-64 mr-4"
        />
        <Texto className="flex-1 text-tinta-suave text-xs mb-5 leading-[17px]">
          Con peso informado, el retiro queda como verificado. Sin él, se mantiene la masa estimada por la talla
          de cada depósito.
        </Texto>
      </View>

      <View className="flex-row items-center">
        <BotonPanel
          titulo="Guardar retiro"
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

/** Una casilla del formulario de retiro: un punto limpio entero o uno de sus contenedores. */
function Casilla({
  marcada,
  parcial = false,
  alPresionar,
  titulo,
  detalle,
  destacado = false,
}: {
  marcada: boolean;
  /** Algunos contenedores del punto marcados, no todos. */
  parcial?: boolean;
  alPresionar: () => void;
  titulo: string;
  detalle: string;
  destacado?: boolean;
}) {
  const activa = marcada || parcial;
  return (
    <TouchableOpacity
      onPress={alPresionar}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: parcial ? "mixed" : marcada }}
      className="flex-row items-center px-4 py-2.5"
    >
      <View
        className={`w-5 h-5 rounded-[5px] border-[1.5px] mr-3 items-center justify-center ${
          activa ? "bg-oliva border-oliva" : "border-piedra-control bg-white"
        }`}
      >
        {marcada ? <Icono nombre="check" tamano={13} color="#FFFFFF" grosor={3} /> : null}
        {parcial ? <View className="w-2.5 h-0.5 bg-white rounded-full" /> : null}
      </View>
      <View className="flex-1 min-w-0">
        <Texto className={`text-tinta ${destacado ? "text-sm font-bold" : "text-[13px] font-semibold"}`}>{titulo}</Texto>
        <Texto className="text-tinta-suave text-xs mt-0.5">{detalle}</Texto>
      </View>
    </TouchableOpacity>
  );
}
