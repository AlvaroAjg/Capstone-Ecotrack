import React, { useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { MATERIALES, nombreContenedor, type Contenedor, type Material } from "../../lib/tipos";
import { agruparPorPunto } from "../../lib/gestionPlanta";
import { contenidoQr } from "../../lib/qr";
import { htmlEtiquetaQr } from "../../lib/etiquetaQr";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import * as servicioContenedores from "../../services/contenedores";
import CodigoQR from "../../components/CodigoQR";
import {
  Bloque,
  BotonPanel,
  CampoPanel,
  DibujoContenedor,
  EncabezadoSeccion,
  Enlace,
  Icono,
  Pildoras,
  Texto,
  Titulo,
  colorMaterial,
} from "./estilo";

/** Mixto (el colaborador elige el material al depositar) o de un material. */
const OPCIONES: { valor: string; material: Material | null; etiqueta: string }[] = [
  { valor: "mixto", material: null, etiqueta: "Mixto" },
  ...MATERIALES.map((m) => ({ valor: m.nombre, material: m.nombre, etiqueta: m.nombre })),
];

/** Valor de las píldoras para escribir un punto limpio nuevo. */
const OTRO_PUNTO = "__otro__";

/**
 * Los contenedores de la planta, agrupados por punto limpio. Un punto puede
 * tener un solo contenedor mixto o uno por material, cada uno con su QR: al
 * escanearlo, el material ya queda fijado. El QR elegido se ve a la derecha,
 * listo para imprimir.
 */
export default function ContenedoresSeccion() {
  const { usuario, miPlanta, contenedores } = useEcoTrack();
  const puntos = useMemo(() => agruparPorPunto(contenedores), [contenedores]);
  const [agregando, setAgregando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  // Por código y no por objeto: al crear un contenedor o cambiarle el código,
  // el documento llega después por el listener, y así se muestra apenas llega.
  const [qrAbierto, setQrAbierto] = useState<string | null>(null);
  const contenedorQr = contenedores.find((c) => c.codigo === qrAbierto && c.activo) ?? null;
  const activos = contenedores.filter((c) => c.activo).length;

  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      avisar("No se pudo completar", textoDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarCodigo(c: Contenedor) {
    const acepta = await confirmar(
      "Cambiar código",
      `El QR actual del ${nombreContenedor(c).toLowerCase()} de ${c.punto} dejará de servir y tendrás que imprimir el nuevo. Úsalo si alguien compartió una foto del QR.`,
      "Cambiar código"
    );
    if (!acepta) return;
    await ejecutar(async () => setQrAbierto(await servicioContenedores.cambiarCodigo(c)));
  }

  async function desactivar(c: Contenedor) {
    const acepta = await confirmar(
      "Desactivar contenedor",
      `El QR del ${nombreContenedor(c).toLowerCase()} de ${c.punto} dejará de servir. Los depósitos que ya se hicieron en él se conservan.`,
      "Desactivar"
    );
    if (!acepta) return;
    await ejecutar(() => servicioContenedores.desactivarContenedor(c.codigo));
  }

  if (!usuario?.plantaId) return null;

  return (
    <View>
      <EncabezadoSeccion
        titulo="Puntos limpios"
        detalle={
          puntos.length === 0
            ? "La planta todavía no tiene contenedores. Agrega uno para que los colaboradores puedan registrar sus depósitos."
            : `${puntos.length} punto${puntos.length === 1 ? "" : "s"} y ${activos} contenedor${activos === 1 ? "" : "es"}. Cada contenedor tiene su propio QR.`
        }
        acciones={
          !agregando ? <BotonPanel titulo="Agregar contenedor" icono="mas" onPress={() => setAgregando(true)} /> : null
        }
      />

      <View className="flex-row items-start">
        <View className="flex-1 min-w-0 mr-7">
          {agregando ? (
            <FormularioContenedor
              plantaId={usuario.plantaId}
              puntosExistentes={puntos.map((p) => p.punto)}
              alTerminar={(codigo) => {
                setAgregando(false);
                if (codigo) setQrAbierto(codigo);
              }}
            />
          ) : null}

          {/* Dos puntos limpios por fila: así se ve la planta de una mirada, como se recorre. */}
          <View className="flex-row flex-wrap -mx-2.5">
            {puntos.map((p) => (
              <View key={p.punto} className="w-1/2 px-2.5 mb-5">
                <Bloque>
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1 min-w-0 pr-2">
                      <Icono nombre="punto" tamano={18} color="#3F6B2E" />
                      <Titulo className="text-[22px] leading-[26px] ml-2 flex-1" numberOfLines={1}>
                        {p.punto}
                      </Titulo>
                    </View>
                    <Texto className="text-tinta-suave text-xs">
                      {p.contenedores.length} contenedor{p.contenedores.length === 1 ? "" : "es"}
                    </Texto>
                  </View>

                  {p.contenedores.map((c) => {
                    const elegido = qrAbierto === c.codigo;
                    return (
                      <View
                        key={c.codigo}
                        className={`flex-row items-center py-3 border-t border-piedra-linea ${
                          elegido ? "bg-oliva-claro -mx-3 px-3 rounded-xl border-transparent" : ""
                        }`}
                      >
                        <DibujoContenedor color={colorMaterial(c.material)} />
                        <View className="flex-1 min-w-0 ml-3">
                          <Texto className="text-tinta text-sm font-semibold" numberOfLines={1}>
                            {nombreContenedor(c)}
                          </Texto>
                          <Texto className="text-tinta-suave text-xs tracking-widest mt-0.5">{c.codigo}</Texto>
                          <View className="flex-row flex-wrap mt-1">
                            <Enlace
                              texto={elegido ? "Ocultar QR" : "Ver QR"}
                              alPresionar={() => setQrAbierto(elegido ? null : c.codigo)}
                              className="mr-4"
                            />
                            <Enlace
                              texto="Cambiar código"
                              tono="tinta"
                              deshabilitado={ocupado}
                              alPresionar={() => cambiarCodigo(c)}
                              className="mr-4"
                            />
                            <Enlace
                              texto="Desactivar"
                              tono="rojo"
                              deshabilitado={ocupado}
                              alPresionar={() => desactivar(c)}
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Bloque>
              </View>
            ))}
          </View>
        </View>

        <View className="w-[340px]">
          {contenedorQr ? (
            <VistaQr
              contenedor={contenedorQr}
              nombrePlanta={miPlanta?.nombre ?? ""}
              alCerrar={() => setQrAbierto(null)}
            />
          ) : (
            <Bloque>
              <Titulo className="text-[22px]">Etiqueta QR</Titulo>
              <Texto className="text-tinta-suave text-[13px] mt-1 leading-[19px]">
                Toca «Ver QR» en un contenedor para ver su etiqueta e imprimirla. Al escanearla, el
                colaborador ya tiene el punto y el material: solo elige el tamaño de su bolsa.
              </Texto>
            </Bloque>
          )}
        </View>
      </View>
    </View>
  );
}

/** Nuevo contenedor: en un punto limpio que ya existe o en uno nuevo. */
function FormularioContenedor({
  plantaId,
  puntosExistentes,
  alTerminar,
}: {
  plantaId: string;
  puntosExistentes: string[];
  /** Con el código del contenedor creado, o sin nada si se canceló. */
  alTerminar: (codigo?: string) => void;
}) {
  const [punto, setPunto] = useState<string>(puntosExistentes[0] ?? OTRO_PUNTO);
  const [puntoNuevo, setPuntoNuevo] = useState("");
  const [opcion, setOpcion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const nombrePunto = (punto === OTRO_PUNTO ? puntoNuevo : punto).trim();
  const elegida = OPCIONES.find((o) => o.valor === opcion);

  async function guardar() {
    if (!nombrePunto) {
      avisar("Falta el punto limpio", "Elige uno o escribe dónde está el contenedor, por ejemplo Casino.");
      return;
    }
    if (!elegida) {
      avisar("Falta el material", "Elige si el contenedor es mixto o de un material.");
      return;
    }
    setGuardando(true);
    try {
      alTerminar(await servicioContenedores.crearContenedor(plantaId, nombrePunto, elegida.material));
    } catch (e) {
      avisar("No se pudo agregar", textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Bloque className="mb-6">
      <Titulo className="text-[24px] mb-4">Nuevo contenedor</Titulo>

      <Texto className="text-tinta-media text-[13px] font-semibold mb-2">Punto limpio</Texto>
      <Pildoras
        opciones={[
          ...puntosExistentes.map((p) => ({ valor: p, etiqueta: p })),
          { valor: OTRO_PUNTO, etiqueta: "Otro punto" },
        ]}
        valor={punto}
        alCambiar={setPunto}
      />
      {punto === OTRO_PUNTO ? (
        <CampoPanel
          etiqueta="Nombre del punto limpio"
          placeholder="Por ejemplo, Casino"
          value={puntoNuevo}
          onChangeText={setPuntoNuevo}
          maxLength={60}
          autoFocus
          className="mt-2 max-w-[420px]"
        />
      ) : null}

      <Texto className="text-tinta-media text-[13px] font-semibold mt-2">¿Qué recibe?</Texto>
      <Texto className="text-tinta-suave text-xs mb-2 mt-0.5">
        Si es de un material, al escanear su QR el colaborador no tiene que elegirlo.
      </Texto>
      <Pildoras opciones={OPCIONES.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))} valor={opcion} alCambiar={setOpcion} />

      <View className="flex-row mt-3">
        <BotonPanel titulo="Agregar" cargando={guardando} onPress={guardar} className="mr-2" />
        <BotonPanel titulo="Cancelar" variante="secundario" onPress={() => alTerminar()} />
      </View>
    </Bloque>
  );
}

/**
 * La etiqueta QR del contenedor elegido. «Imprimir» la abre en una ventana
 * aparte (ver lib/etiquetaQr.ts) para no imprimir el panel entero.
 */
function VistaQr({
  contenedor,
  nombrePlanta,
  alCerrar,
}: {
  contenedor: Contenedor;
  nombrePlanta: string;
  alCerrar: () => void;
}) {
  function imprimir() {
    const ventana = window.open("", "_blank", "width=480,height=640");
    if (!ventana) {
      avisar("No se abrió la etiqueta", "Permite las ventanas emergentes de RecyTrack en el navegador.");
      return;
    }
    ventana.document.write(htmlEtiquetaQr(contenedor, nombrePlanta));
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  return (
    <Bloque>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 min-w-0 pr-2">
          <Titulo className="text-[22px] leading-[26px]" numberOfLines={1}>
            {contenedor.punto}
          </Titulo>
          <Texto className="text-tinta-suave text-[13px] mt-0.5">{nombreContenedor(contenedor)}</Texto>
        </View>
        <Enlace texto="Cerrar" tono="tinta" alPresionar={alCerrar} />
      </View>

      <View className="items-center bg-piedra rounded-2xl mt-4 p-5">
        <View className="bg-white rounded-xl p-3">
          <CodigoQR texto={contenidoQr(contenedor.plantaId, contenedor.codigo)} tamano={180} />
        </View>
        <Titulo className="text-tinta text-[28px] tracking-widest mt-3">{contenedor.codigo}</Titulo>
        <View className="flex-row items-center mt-1">
          <View className="w-2.5 h-2.5 rounded-[3px] mr-1.5" style={{ backgroundColor: colorMaterial(contenedor.material) }} />
          <Texto className="text-tinta-media text-xs">{contenedor.material ?? "Mixto"}</Texto>
        </View>
      </View>

      <Texto className="text-tinta-suave text-xs mt-3 leading-[17px]">
        Imprímela y pégala en el contenedor, idealmente en mica. El código va debajo del QR para
        escribirlo si la cámara no lo lee.
      </Texto>
      {Platform.OS === "web" ? (
        <BotonPanel titulo="Imprimir etiqueta" icono="imprimir" onPress={imprimir} className="mt-4" />
      ) : null}
    </Bloque>
  );
}
