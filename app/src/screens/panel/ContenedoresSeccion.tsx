import React, { useMemo, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useEcoTrack } from "../../state/EcoTrack";
import { MATERIALES, nombreContenedor, type Contenedor, type Material } from "../../lib/tipos";
import { agruparPorPunto } from "../../lib/gestionPlanta";
import { contenidoQr } from "../../lib/qr";
import { htmlEtiquetaQr } from "../../lib/etiquetaQr";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import * as servicioContenedores from "../../services/contenedores";
import CodigoQR from "../../components/CodigoQR";
import { Boton, Campo, Chip, Tarjeta } from "../../components/ui";

/** Mixto (el colaborador elige el material al depositar) o de un material. */
const OPCIONES: { material: Material | null; etiqueta: string; emoji: string }[] = [
  { material: null, etiqueta: "Mixto", emoji: "♻️" },
  ...MATERIALES.map((m) => ({ material: m.nombre, etiqueta: m.nombre, emoji: m.emoji })),
];

function emojiDe(material: Material | null): string {
  return MATERIALES.find((m) => m.nombre === material)?.emoji ?? "♻️";
}

/**
 * Los contenedores de la planta, agrupados por punto limpio. Un punto puede
 * tener un solo contenedor mixto o uno por material, cada uno con su QR: al
 * escanearlo, el material ya queda fijado.
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
      <View className="flex-row items-center justify-between mb-5">
        <Text className="text-gray-500 text-sm flex-1 pr-4">
          {puntos.length === 0
            ? "La planta todavía no tiene contenedores. Agrega uno para que los colaboradores puedan registrar sus depósitos."
            : `${contenedores.filter((c) => c.activo).length} contenedores en ${puntos.length} punto${puntos.length === 1 ? "" : "s"} limpio${puntos.length === 1 ? "" : "s"}.`}
        </Text>
        {!agregando ? (
          <Boton titulo="Agregar contenedor" icono="➕" onPress={() => setAgregando(true)} className="py-3 px-5" />
        ) : null}
      </View>

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

      {contenedorQr ? (
        <VistaQr
          contenedor={contenedorQr}
          nombrePlanta={miPlanta?.nombre ?? ""}
          alCerrar={() => setQrAbierto(null)}
        />
      ) : null}

      {puntos.map((p) => (
        <View key={p.punto} className="mb-6">
          <Text className="text-gray-800 font-semibold text-base mb-3">📍 {p.punto}</Text>
          <View className="flex-row flex-wrap -mx-2">
            {p.contenedores.map((c) => (
              <View key={c.codigo} className="w-1/3 px-2 mb-4">
                <Tarjeta>
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                      <Text className="text-lg">{emojiDe(c.material)}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-gray-800 font-medium">{nombreContenedor(c)}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5 tracking-widest">{c.codigo}</Text>
                    </View>
                  </View>
                  <Boton
                    titulo="Ver e imprimir QR"
                    icono="🖨️"
                    variante="secundario"
                    onPress={() => setQrAbierto(c.codigo)}
                    className="py-2 mb-2"
                  />
                  <View className="flex-row">
                    <Boton
                      titulo="Cambiar código"
                      variante="secundario"
                      deshabilitado={ocupado}
                      onPress={() => cambiarCodigo(c)}
                      className="flex-1 py-2 mr-2"
                    />
                    <Boton
                      titulo="Desactivar"
                      variante="peligro"
                      deshabilitado={ocupado}
                      onPress={() => desactivar(c)}
                      className="flex-1 py-2"
                    />
                  </View>
                </Tarjeta>
              </View>
            ))}
          </View>
        </View>
      ))}
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
  const [punto, setPunto] = useState<string | null>(puntosExistentes[0] ?? null);
  const [puntoNuevo, setPuntoNuevo] = useState("");
  const [material, setMaterial] = useState<Material | null | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);

  // null = se está escribiendo un punto nuevo.
  const nombrePunto = (punto ?? puntoNuevo).trim();

  async function guardar() {
    if (!nombrePunto) {
      avisar("Falta el punto limpio", "Elige uno o escribe dónde está el contenedor, por ejemplo Casino.");
      return;
    }
    if (material === undefined) {
      avisar("Falta el material", "Elige si el contenedor es mixto o de un material.");
      return;
    }
    setGuardando(true);
    try {
      alTerminar(await servicioContenedores.crearContenedor(plantaId, nombrePunto, material));
    } catch (e) {
      avisar("No se pudo agregar", textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta className="mb-6 max-w-[640px]">
      <Text className="text-gray-800 font-semibold text-base mb-3">Nuevo contenedor</Text>

      <Text className="text-gray-600 text-sm font-medium mb-2">Punto limpio</Text>
      <View className="flex-row flex-wrap mb-2">
        {puntosExistentes.map((p) => (
          <Chip key={p} texto={p} activo={punto === p} alPresionar={() => setPunto(p)} />
        ))}
        <Chip texto="➕ Otro punto" activo={punto === null} alPresionar={() => setPunto(null)} />
      </View>
      {punto === null ? (
        <Campo
          etiqueta="Nombre del punto limpio"
          placeholder="Por ejemplo, Casino"
          value={puntoNuevo}
          onChangeText={setPuntoNuevo}
          maxLength={60}
          autoFocus
        />
      ) : null}

      <Text className="text-gray-600 text-sm font-medium mb-1 mt-2">¿Qué recibe?</Text>
      <Text className="text-gray-400 text-xs mb-2">
        Si es de un material, al escanear su QR el colaborador no tiene que elegirlo.
      </Text>
      <View className="flex-row flex-wrap mb-4">
        {OPCIONES.map((o) => (
          <Chip
            key={o.etiqueta}
            texto={`${o.emoji} ${o.etiqueta}`}
            activo={material === o.material}
            alPresionar={() => setMaterial(o.material)}
          />
        ))}
      </View>

      <View className="flex-row">
        <Boton titulo="Agregar" cargando={guardando} onPress={guardar} className="py-3 px-6 mr-2" />
        <Boton titulo="Cancelar" variante="secundario" onPress={() => alTerminar()} className="py-3 px-6" />
      </View>
    </Tarjeta>
  );
}

/**
 * El QR de un contenedor con su código, material y punto limpio. «Imprimir»
 * abre la etiqueta en una ventana aparte (ver lib/etiquetaQr.ts) para no
 * imprimir el panel entero.
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
    <Tarjeta className="mb-6 max-w-[640px] flex-row items-center">
      <CodigoQR texto={contenidoQr(contenedor.plantaId, contenedor.codigo)} tamano={200} />
      <View className="flex-1 ml-6">
        <Text className="text-gray-900 font-bold text-3xl tracking-widest">{contenedor.codigo}</Text>
        <Text className="text-gray-800 font-semibold mt-2">{nombreContenedor(contenedor)}</Text>
        <Text className="text-gray-500 text-sm mt-0.5">
          {contenedor.punto} · {nombrePlanta}
        </Text>
        <Text className="text-gray-400 text-xs mt-3 mb-4 leading-4">
          Imprímelo y pégalo en el contenedor. El código va debajo del QR para escribirlo si la
          cámara no lo lee.
        </Text>
        <View className="flex-row">
          {Platform.OS === "web" ? (
            <Boton titulo="Imprimir" icono="🖨️" onPress={imprimir} className="py-3 px-5 mr-2" />
          ) : null}
          <Boton titulo="Cerrar" variante="secundario" onPress={alCerrar} className="py-3 px-5" />
        </View>
      </View>
    </Tarjeta>
  );
}
