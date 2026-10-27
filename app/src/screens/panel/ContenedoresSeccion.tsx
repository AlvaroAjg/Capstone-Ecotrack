import React, { useMemo, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { MATERIALES, nombreContenedor, type Contenedor, type Material } from "../../lib/tipos";
import { agruparPorPunto, type PuntoLimpio } from "../../lib/gestionPlanta";
import { contenidoQr } from "../../lib/qr";
import { htmlEtiquetaQr, htmlHojaQr } from "../../lib/etiquetaQr";
import { etiquetaMes, mesDe } from "../../lib/certificadoMensual";
import { depositosPorPunto, rondaDeHoy, rondaPorPunto, type EstadoRonda } from "../../lib/resumenPanel";
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
  Insignia,
  Logo,
  Texto,
  Titulo,
  colorMaterial,
  type NombreIcono,
  type Tono,
} from "./estilo";

/** Desde este ancho, la hoja de QR va al lado de los puntos; bajo él, debajo. */
const ANCHO_DOS_COLUMNAS = 1280;

/** Cómo va hoy la ronda en un punto. Un punto sin nada que revisar no lleva etiqueta. */
const ESTADO_PUNTO: Record<EstadoRonda, { texto: string; tono: Tono; icono: NombreIcono } | null> = {
  conforme: { texto: "Conforme hoy", tono: "oliva", icono: "check" },
  observacion: { texto: "Con observación", tono: "ambar", icono: "alerta" },
  sinMaterial: { texto: "Sin material", tono: "rojo", icono: "alerta" },
  pendiente: { texto: "Ronda pendiente", tono: "gris", icono: "reloj" },
  vacio: null,
};

/** Abre una página en otra ventana y la manda a imprimir, sin imprimir el panel. */
function imprimir(html: string) {
  const ventana = window.open("", "_blank", "width=820,height=900");
  if (!ventana) {
    avisar("No se abrió la hoja", "Permite las ventanas emergentes de RecyTrack en el navegador.");
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

/**
 * Los puntos limpios de la planta, cada uno con sus contenedores. Un punto
 * puede tener un solo contenedor mixto o uno por material, cada uno con su
 * QR: al escanearlo, el material ya queda fijado. A la derecha, la hoja con
 * los QR del punto elegido, lista para imprimir; abajo, los depósitos del mes
 * por punto y material.
 */
export default function ContenedoresSeccion() {
  const { usuario, miPlanta, contenedores, registros, incidencias } = useEcoTrack();
  const dosColumnas = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;
  const puntos = useMemo(() => agruparPorPunto(contenedores), [contenedores]);
  const mes = mesDe(Date.now());
  const depositos = useMemo(() => depositosPorPunto(registros, contenedores, mes), [registros, contenedores, mes]);
  const estadoHoy = useMemo(
    () => new Map(rondaPorPunto(rondaDeHoy(registros, incidencias, contenedores)).map((p) => [p.punto, p.estado])),
    [registros, incidencias, contenedores]
  );
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  // Por nombre: al crear un punto o renombrarlo, sus contenedores llegan
  // después por el listener, y así se muestra apenas llegan.
  const [elegido, setElegido] = useState<string | null>(null);
  const puntoElegido = puntos.find((p) => p.punto === elegido) ?? puntos[0] ?? null;
  const activos = contenedores.filter((c) => c.activo);
  const nombrePlanta = miPlanta?.nombre ?? "";

  if (!usuario?.plantaId) return null;
  const plantaId = usuario.plantaId;

  return (
    <View>
      <EncabezadoSeccion
        titulo="Puntos limpios"
        detalle={
          puntos.length === 0
            ? "La planta todavía no tiene puntos limpios. Crea uno para que los colaboradores puedan registrar sus depósitos."
            : `${puntos.length} punto${puntos.length === 1 ? "" : "s"} y ${activos.length} contenedor${
                activos.length === 1 ? "" : "es"
              }. Cada contenedor tiene su propio QR.`
        }
        acciones={
          <>
            {activos.length > 0 ? (
              <BotonPanel
                titulo="Imprimir todos los QR"
                icono="imprimir"
                variante="secundario"
                onPress={() =>
                  imprimir(htmlHojaQr(puntos.flatMap((p) => p.contenedores), nombrePlanta, `Hoja de QR de ${nombrePlanta}`))
                }
                className="mr-2.5"
              />
            ) : null}
            {!creando ? <BotonPanel titulo="Nuevo punto limpio" icono="mas" onPress={() => setCreando(true)} /> : null}
          </>
        }
      />

      <View className={dosColumnas ? "flex-row items-start" : ""}>
        <View className={dosColumnas ? "flex-1 min-w-0 mr-7" : "mb-6"}>
          {creando ? (
            <FormularioPunto
              plantaId={plantaId}
              existentes={puntos.map((p) => p.punto)}
              alTerminar={(punto) => {
                setCreando(false);
                if (punto) setElegido(punto);
              }}
            />
          ) : null}

          {/* Dos puntos limpios por fila: así se ve la planta de una mirada, como se recorre. */}
          <View className="flex-row flex-wrap -mx-2">
            {puntos.map((p) => {
              const estado = ESTADO_PUNTO[estadoHoy.get(p.punto) ?? "vacio"];
              const delMes = depositos.find((d) => d.punto === p.punto)?.total ?? 0;
              return (
                <View key={p.punto} className={editando === p.punto ? "w-full px-2 mb-4" : "w-1/2 px-2 mb-4"}>
                  <View
                    className={`bg-white rounded-[20px] px-5 py-4 border-2 ${
                      puntoElegido?.punto === p.punto ? "border-oliva" : "border-transparent"
                    }`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 min-w-0 pr-2">
                        <Titulo className="text-[21px] leading-[25px]" numberOfLines={1}>
                          {p.punto}
                        </Titulo>
                        <Texto className="text-tinta-suave text-[13px] mt-0.5" numberOfLines={1}>
                          {p.ubicacion || "Sin ubicación"}
                        </Texto>
                      </View>
                      {estado ? <Insignia texto={estado.texto} tono={estado.tono} icono={estado.icono} /> : null}
                    </View>

                    <View className="flex-row flex-wrap items-end justify-between mt-3">
                      <View className="flex-row flex-wrap items-end mb-1">
                        {p.contenedores.map((c) => (
                          <View key={c.codigo} className="w-16 items-center mr-2">
                            <DibujoContenedor color={colorMaterial(c.material)} />
                            <Texto className="text-tinta-media text-[11px] text-center mt-1.5 leading-[13px]">
                              {c.material ?? "Mixto"}
                            </Texto>
                          </View>
                        ))}
                      </View>
                      <View className="items-end mb-1">
                        <Texto className="text-tinta-suave text-[13px]">
                          <Texto titulo className="text-tinta text-[20px]">
                            {delMes}
                          </Texto>{" "}
                          depósito{delMes === 1 ? "" : "s"} este mes
                        </Texto>
                        <View className="flex-row mt-2">
                          <BotonPanel
                            titulo={editando === p.punto ? "Cerrar" : "Editar"}
                            variante="secundario"
                            compacto
                            onPress={() => setEditando(editando === p.punto ? null : p.punto)}
                            className="mr-2"
                          />
                          <BotonPanel titulo="Ver QR" variante="suave" compacto onPress={() => setElegido(p.punto)} />
                        </View>
                      </View>
                    </View>

                    {editando === p.punto ? (
                      <EdicionPunto
                        plantaId={plantaId}
                        punto={p}
                        todos={contenedores.filter((c) => c.punto === p.punto)}
                        existentes={puntos.map((x) => x.punto)}
                        nombrePlanta={nombrePlanta}
                        alRenombrar={(nuevo) => {
                          setEditando(nuevo);
                          if (puntoElegido?.punto === p.punto) setElegido(nuevo);
                        }}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <TablaDepositos filas={depositos} mes={mes} />
        </View>

        <View className={dosColumnas ? "w-[380px]" : "max-w-[480px]"}>
          {puntoElegido ? (
            <HojaQr punto={puntoElegido} nombrePlanta={nombrePlanta} />
          ) : (
            <View className="bg-piedra-oscura rounded-[20px] p-5">
              <Titulo className="text-[24px]">Hoja de QR</Titulo>
              <Texto className="text-tinta-media text-[13px] mt-1.5 leading-[19px]">
                Cuando la planta tenga puntos limpios, aquí aparecen sus QR listos para imprimir.
              </Texto>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Lo que se cambia de un punto: su nombre y ubicación, y sus contenedores
 * (agregar uno, ver o imprimir su etiqueta, cambiarle el código o
 * desactivarlo).
 */
function EdicionPunto({
  plantaId,
  punto,
  todos,
  existentes,
  nombrePlanta,
  alRenombrar,
}: {
  plantaId: string;
  punto: PuntoLimpio;
  /** Todos los contenedores del punto, también los desactivados: se renombran juntos. */
  todos: Contenedor[];
  existentes: string[];
  nombrePlanta: string;
  alRenombrar: (nuevo: string) => void;
}) {
  const [nombre, setNombre] = useState(punto.punto);
  const [ubicacion, setUbicacion] = useState(punto.ubicacion);
  const [material, setMaterial] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const cambio = nombre.trim() !== punto.punto || ubicacion.trim() !== punto.ubicacion;

  async function ejecutar(accion: () => Promise<unknown>, alFallar: string) {
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      avisar(alFallar, textoDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  function guardar() {
    const limpio = nombre.trim();
    if (!limpio) {
      avisar("Falta el nombre", "Escribe el nombre del punto limpio, por ejemplo Casino.");
      return;
    }
    if (limpio !== punto.punto && existentes.includes(limpio)) {
      avisar("Ese nombre ya existe", "Ya hay un punto limpio con ese nombre. Elige otro.");
      return;
    }
    return ejecutar(async () => {
      await servicioContenedores.editarPunto(todos, { punto: limpio, ubicacion: ubicacion.trim() });
      alRenombrar(limpio);
    }, "No se pudo guardar el punto");
  }

  async function cambiarCodigo(c: Contenedor) {
    const acepta = await confirmar(
      "Cambiar código",
      `El QR actual del ${nombreContenedor(c).toLowerCase()} de ${c.punto} dejará de servir y tendrás que imprimir el nuevo. Úsalo si alguien compartió una foto del QR.`,
      "Cambiar código"
    );
    if (acepta) await ejecutar(() => servicioContenedores.cambiarCodigo(c), "No se pudo cambiar el código");
  }

  async function desactivar(c: Contenedor) {
    const acepta = await confirmar(
      "Desactivar contenedor",
      `El QR del ${nombreContenedor(c).toLowerCase()} de ${c.punto} dejará de servir. Los depósitos que ya se hicieron en él se conservan.`,
      "Desactivar"
    );
    if (acepta) await ejecutar(() => servicioContenedores.desactivarContenedor(c.codigo), "No se pudo desactivar");
  }

  function agregar() {
    const opcion = OPCIONES.find((o) => o.valor === material);
    if (!opcion) {
      avisar("Falta el material", "Elige si el contenedor nuevo es mixto o de un material.");
      return;
    }
    return ejecutar(async () => {
      await servicioContenedores.crearContenedor(plantaId, punto.punto, opcion.material, punto.ubicacion);
      setMaterial(null);
    }, "No se pudo agregar el contenedor");
  }

  return (
    <View className="border-t border-piedra-linea mt-4 pt-4">
      <View className="flex-row items-end">
        <CampoPanel etiqueta="Nombre del punto" value={nombre} onChangeText={setNombre} maxLength={60} className="flex-1 mr-3" />
        <CampoPanel
          etiqueta="Ubicación (opcional)"
          placeholder="Por ejemplo, Edificio principal, primer piso"
          value={ubicacion}
          onChangeText={setUbicacion}
          maxLength={80}
          className="flex-[1.4] mr-3"
        />
        <BotonPanel titulo="Guardar" deshabilitado={!cambio} cargando={ocupado} onPress={guardar} className="mb-4" />
      </View>
      <Texto className="text-tinta-suave text-xs -mt-2 mb-3">
        El nombre cambia en todos los contenedores del punto, también en su historial. Los QR ya impresos
        siguen sirviendo: el QR lleva solo el código, no el nombre.
      </Texto>

      <Texto className="text-tinta-media text-[13px] font-semibold mb-1">Contenedores</Texto>
      {punto.contenedores.map((c) => (
        <View key={c.codigo} className="flex-row items-center py-2 border-t border-piedra-linea">
          <View className="w-2.5 h-2.5 rounded-[3px] mr-2.5" style={{ backgroundColor: colorMaterial(c.material) }} />
          <View className="flex-1 min-w-0">
            <Texto className="text-tinta text-sm font-semibold" numberOfLines={1}>
              {nombreContenedor(c)}
            </Texto>
            <Texto className="text-tinta-suave text-xs tracking-widest">{c.codigo}</Texto>
          </View>
          <Enlace texto="Imprimir etiqueta" alPresionar={() => imprimir(htmlEtiquetaQr(c, nombrePlanta))} className="mr-4" />
          <Enlace texto="Cambiar código" tono="tinta" deshabilitado={ocupado} alPresionar={() => cambiarCodigo(c)} className="mr-4" />
          <Enlace texto="Desactivar" tono="rojo" deshabilitado={ocupado} alPresionar={() => desactivar(c)} />
        </View>
      ))}

      <View className="flex-row flex-wrap items-center border-t border-piedra-linea pt-3 mt-1">
        <Texto className="text-tinta-media text-[13px] font-semibold mr-3 mb-2">Agregar contenedor:</Texto>
        {OPCIONES.map((o) => (
          <ChipMaterial
            key={o.valor}
            texto={o.etiqueta}
            color={colorMaterial(o.material)}
            activo={material === o.valor}
            alPresionar={() => setMaterial(material === o.valor ? null : o.valor)}
          />
        ))}
        <BotonPanel titulo="Agregar" variante="suave" compacto deshabilitado={!material} cargando={ocupado} onPress={agregar} className="mb-2" />
      </View>
    </View>
  );
}

/** Mixto (el colaborador elige el material al depositar) o de un material. */
const OPCIONES: { valor: string; material: Material | null; etiqueta: string }[] = [
  { valor: "mixto", material: null, etiqueta: "Mixto" },
  ...MATERIALES.map((m) => ({ valor: m.nombre, material: m.nombre, etiqueta: m.nombre })),
];

function ChipMaterial({
  texto,
  color,
  activo,
  alPresionar,
}: {
  texto: string;
  color: string;
  activo: boolean;
  alPresionar: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className={`h-9 flex-row items-center px-3.5 mr-2 mb-2 rounded-full ${
        activo ? "bg-vino" : "bg-white border border-piedra-control"
      }`}
    >
      <View className="w-2.5 h-2.5 rounded-[3px] mr-1.5" style={{ backgroundColor: color }} />
      <Texto className={`text-[13px] ${activo ? "text-vino-texto font-semibold" : "text-tinta-media font-medium"}`}>
        {texto}
      </Texto>
    </TouchableOpacity>
  );
}

/**
 * Un punto limpio nuevo, con sus contenedores: uno mixto, o uno por cada
 * material que reciba. Se crean todos juntos.
 */
function FormularioPunto({
  plantaId,
  existentes,
  alTerminar,
}: {
  plantaId: string;
  existentes: string[];
  /** Con el nombre del punto creado, o sin nada si se canceló. */
  alTerminar: (punto?: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  // "mixto" solo, o los materiales elegidos: un punto no mezcla los dos.
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  function alternar(valor: string) {
    setElegidos((prev) => {
      if (valor === "mixto") return prev.includes("mixto") ? [] : ["mixto"];
      const sinMixto = prev.filter((v) => v !== "mixto");
      return sinMixto.includes(valor) ? sinMixto.filter((v) => v !== valor) : [...sinMixto, valor];
    });
  }

  async function guardar() {
    const limpio = nombre.trim();
    if (!limpio) {
      avisar("Falta el nombre", "Escribe dónde está el punto limpio, por ejemplo Casino.");
      return;
    }
    if (existentes.includes(limpio)) {
      avisar("Ese punto ya existe", "Para sumarle contenedores, usa Editar en su tarjeta.");
      return;
    }
    if (elegidos.length === 0) {
      avisar("Faltan los contenedores", "Elige un contenedor mixto o los materiales que recibe el punto.");
      return;
    }
    setGuardando(true);
    try {
      const materiales = OPCIONES.filter((o) => elegidos.includes(o.valor)).map((o) => o.material);
      await servicioContenedores.crearPunto(plantaId, limpio, ubicacion.trim(), materiales);
      alTerminar(limpio);
    } catch (e) {
      avisar("No se pudo crear el punto", textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Bloque className="mb-5">
      <Titulo className="text-[24px] mb-4">Nuevo punto limpio</Titulo>
      <View className="flex-row">
        <CampoPanel
          etiqueta="Nombre"
          placeholder="Por ejemplo, Casino"
          value={nombre}
          onChangeText={setNombre}
          maxLength={60}
          autoFocus
          className="flex-1 mr-3"
        />
        <CampoPanel
          etiqueta="Ubicación (opcional)"
          placeholder="Por ejemplo, Edificio principal, primer piso"
          value={ubicacion}
          onChangeText={setUbicacion}
          maxLength={80}
          className="flex-[1.4]"
        />
      </View>
      <Texto className="text-tinta-media text-[13px] font-semibold">¿Qué contenedores tiene?</Texto>
      <Texto className="text-tinta-suave text-xs mt-0.5 mb-2">
        Uno mixto, o uno por material. Si es de un material, al escanear su QR el colaborador no tiene que
        elegirlo.
      </Texto>
      <View className="flex-row flex-wrap">
        {OPCIONES.map((o) => (
          <ChipMaterial
            key={o.valor}
            texto={o.etiqueta}
            color={colorMaterial(o.material)}
            activo={elegidos.includes(o.valor)}
            alPresionar={() => alternar(o.valor)}
          />
        ))}
      </View>
      <View className="flex-row mt-3">
        <BotonPanel titulo="Crear punto" cargando={guardando} onPress={guardar} className="mr-2" />
        <BotonPanel titulo="Cancelar" variante="secundario" onPress={() => alTerminar()} />
      </View>
    </Bloque>
  );
}

/** Las etiquetas QR de un punto, como quedan en la hoja impresa. */
function HojaQr({ punto, nombrePlanta }: { punto: PuntoLimpio; nombrePlanta: string }) {
  return (
    <View className="bg-piedra-oscura rounded-[20px] p-5">
      <Titulo className="text-[24px] leading-[28px]">Hoja de QR de {punto.punto}</Titulo>
      <Texto className="text-tinta-media text-[13px] mt-1.5 leading-[19px]">
        Cada QR identifica el punto y el material. Al escanearlo, la persona solo elige el tamaño.
      </Texto>

      <View
        className="bg-white rounded-md p-3 mt-3.5 flex-row flex-wrap"
        style={{ shadowColor: "#2B1424", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }}
      >
        {punto.contenedores.map((c) => (
          <View key={c.codigo} className="w-1/2 p-1">
            <View className="border border-dashed border-piedra-control rounded-md overflow-hidden items-center">
              <View className="w-full h-[7px]" style={{ backgroundColor: colorMaterial(c.material) }} />
              <View className="items-center px-2 pt-2 pb-2.5">
                <View className="flex-row items-center mb-1.5">
                  <Logo tamano={13} />
                  <Titulo className="text-[11px] ml-1">RecyTrack</Titulo>
                </View>
                <CodigoQR texto={contenidoQr(c.plantaId, c.codigo)} tamano={96} />
                <Titulo className="text-tinta text-base mt-1.5">{c.material ?? "Mixto"}</Titulo>
                <Texto className="text-tinta-media text-[11px] font-semibold tracking-wider" numberOfLines={1}>
                  {punto.punto}, {c.codigo}
                </Texto>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Texto className="text-tinta-media text-xs mt-3 leading-[18px]">
        Hoja carta. Recorta cada etiqueta y pégala en su contenedor, idealmente en mica.
      </Texto>
      <BotonPanel
        titulo="Descargar hoja para imprimir"
        icono="descargar"
        variante="vino"
        onPress={() => imprimir(htmlHojaQr(punto.contenedores, nombrePlanta, `Hoja de QR de ${punto.punto}`))}
        className="mt-3.5 h-12"
      />
    </View>
  );
}

/** Los depósitos validados del mes por punto limpio y material, con el total de la planta. */
function TablaDepositos({ filas, mes }: { filas: ReturnType<typeof depositosPorPunto>; mes: string }) {
  const total = MATERIALES.map((m) => filas.reduce((t, f) => t + f.porMaterial[m.nombre], 0));
  const celda = (n: number) => (n > 0 ? String(n) : "—");
  const nombreMes = etiquetaMes(mes).replace(" de ", " ");

  return (
    <View className="mt-2">
      <View className="flex-row items-baseline justify-between mb-2.5">
        <Titulo className="text-[24px]">Depósitos por punto y material</Titulo>
        <Texto className="text-tinta-suave text-[13px]">
          {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
        </Texto>
      </View>
      {filas.length === 0 ? (
        <Texto className="text-tinta-suave text-sm">Este mes todavía no hay depósitos validados.</Texto>
      ) : (
        <>
          <View className="flex-row border-b-[1.5px] border-vino py-2">
            <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Punto limpio</Texto>
            {MATERIALES.map((m) => (
              <View key={m.nombre} className="w-28 flex-row items-center justify-end">
                <View className="w-2.5 h-2.5 rounded-[3px] mr-1.5" style={{ backgroundColor: colorMaterial(m.nombre) }} />
                <Texto className="text-tinta-media text-[13px] font-semibold">{m.nombre}</Texto>
              </View>
            ))}
            <Texto className="w-20 text-right text-tinta text-[13px] font-bold">Total</Texto>
          </View>
          {filas.map((f) => (
            <View key={f.punto} className="flex-row py-2.5 border-b border-[#DADDD5]">
              <Texto className="flex-1 text-tinta text-sm pr-2" numberOfLines={1}>
                {f.punto}
              </Texto>
              {MATERIALES.map((m) => (
                <Texto key={m.nombre} className="w-28 text-right text-tinta text-sm">
                  {celda(f.porMaterial[m.nombre])}
                </Texto>
              ))}
              <Texto className="w-20 text-right text-tinta text-sm font-bold">{f.total}</Texto>
            </View>
          ))}
          <View className="flex-row py-2.5 bg-piedra-oscura border-b border-[#DADDD5]">
            <Texto className="flex-1 text-tinta text-sm font-bold pl-2">Total de la planta</Texto>
            {total.map((n, i) => (
              <Texto key={MATERIALES[i].nombre} className="w-28 text-right text-tinta text-sm font-bold">
                {celda(n)}
              </Texto>
            ))}
            <Texto className="w-20 text-right text-tinta text-sm font-bold pr-2">
              {filas.reduce((t, f) => t + f.total, 0)}
            </Texto>
          </View>
        </>
      )}
    </View>
  );
}
