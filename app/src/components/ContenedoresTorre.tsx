import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MATERIALES, nombreContenedor, type Contenedor, type Material } from "../lib/tipos";
import { contenidoQr } from "../lib/qr";
import { avisar, confirmar, textoDeError } from "../lib/dialogos";
import * as servicioContenedores from "../services/contenedores";
import CodigoQR from "./CodigoQR";
import { Boton, Seccion, Tarjeta } from "./ui";

/** Opciones al agregar un contenedor: mixto (el residente elige) o de un material. */
const OPCIONES: { material: Material | null; etiqueta: string; emoji: string }[] = [
  { material: null, etiqueta: "Mixto", emoji: "♻️" },
  ...MATERIALES.map((m) => ({ material: m.nombre, etiqueta: m.nombre, emoji: m.emoji })),
];

function emojiDe(material: Material | null): string {
  return MATERIALES.find((m) => m.nombre === material)?.emoji ?? "♻️";
}

/**
 * Contenedores de la torre, en el panel del administrador. Un punto de
 * reciclaje puede tener un solo contenedor mixto (el residente elige el
 * material) o uno por material, cada uno con su QR: al escanearlo el material
 * ya queda fijado. Desde aquí se agregan, se imprime su QR, se les cambia el
 * código si se filtró o se quitan.
 */
export default function ContenedoresTorre({ torreId }: { torreId: string }) {
  const [contenedores, setContenedores] = useState<Contenedor[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(
    () =>
      servicioContenedores.escucharContenedores(torreId, (todos) =>
        setContenedores(todos.filter((c) => c.activo))
      ),
    [torreId]
  );

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

  async function agregar(material: Material | null) {
    await ejecutar(async () => {
      const codigo = await servicioContenedores.crearContenedor(torreId, material);
      setAgregando(false);
      setAbierto(codigo);
    });
  }

  async function cambiarCodigo(c: Contenedor) {
    const acepta = await confirmar(
      "Cambiar código",
      `El QR actual del ${nombreContenedor(c).toLowerCase()} dejará de servir y tendrás que imprimir el nuevo. Úsalo si alguien compartió una foto del QR.`,
      "Cambiar código"
    );
    if (!acepta) return;
    await ejecutar(async () => setAbierto(await servicioContenedores.cambiarCodigo(c)));
  }

  async function quitar(c: Contenedor) {
    const acepta = await confirmar(
      "Quitar contenedor",
      `Su QR dejará de servir. Los depósitos que ya se hicieron en él se conservan.`,
      "Quitar"
    );
    if (!acepta) return;
    await ejecutar(() => servicioContenedores.desactivarContenedor(c.codigo));
  }

  return (
    <Seccion
      titulo="Contenedores de la torre"
      etiqueta={contenedores ? `${contenedores.length}` : undefined}
    >
      {contenedores && contenedores.length === 0 ? (
        <Tarjeta className="mb-3">
          <Text className="text-gray-600 text-sm">
            Tu torre todavía no tiene contenedores. Agrega uno para que los residentes
            puedan registrar sus depósitos: uno mixto, o uno por material si el punto de
            reciclaje los tiene separados.
          </Text>
        </Tarjeta>
      ) : null}

      {contenedores?.map((c) => {
        const verQr = abierto === c.codigo;
        return (
          <Tarjeta key={c.codigo} className="mb-3">
            <TouchableOpacity
              onPress={() => setAbierto(verQr ? null : c.codigo)}
              accessibilityRole="button"
              accessibilityLabel={`${nombreContenedor(c)}, código ${c.codigo}. ${verQr ? "Ocultar" : "Ver"} QR`}
              className="flex-row items-center"
            >
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Text className="text-lg">{emojiDe(c.material)}</Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-gray-800 font-medium">{nombreContenedor(c)}</Text>
                <Text className="text-gray-400 text-xs mt-0.5 tracking-widest">{c.codigo}</Text>
              </View>
              <Text className="text-green-700 text-xs font-semibold">
                {verQr ? "Ocultar QR" : "Ver QR"}
              </Text>
            </TouchableOpacity>

            {verQr ? (
              <View className="items-center mt-4">
                <CodigoQR texto={contenidoQr(torreId, c.codigo)} tamano={220} />
                <Text className="text-gray-900 font-bold text-2xl tracking-widest mt-3">
                  {c.codigo}
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-1 mb-4">
                  Imprímelo y pégalo en el {nombreContenedor(c).toLowerCase()}, con el código
                  debajo: sirve para escribirlo si la cámara no lee el QR.
                </Text>
                <View className="flex-row self-stretch">
                  <Boton
                    titulo="Cambiar código"
                    variante="secundario"
                    deshabilitado={ocupado}
                    onPress={() => cambiarCodigo(c)}
                    className="flex-1 py-3 mr-2"
                  />
                  <Boton
                    titulo="Quitar"
                    variante="peligro"
                    deshabilitado={ocupado}
                    onPress={() => quitar(c)}
                    className="flex-1 py-3"
                  />
                </View>
              </View>
            ) : null}
          </Tarjeta>
        );
      })}

      {agregando ? (
        <Tarjeta>
          <Text className="text-gray-800 font-medium mb-1">¿Qué recibe el contenedor?</Text>
          <Text className="text-gray-400 text-xs mb-3">
            Si es de un material, al escanear su QR el residente no tiene que elegirlo.
          </Text>
          <View className="flex-row flex-wrap">
            {OPCIONES.map((o) => (
              <TouchableOpacity
                key={o.etiqueta}
                onPress={() => agregar(o.material)}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityLabel={`Agregar contenedor ${o.etiqueta.toLowerCase()}`}
                className={`flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-2 mr-2 mb-2 ${
                  ocupado ? "opacity-50" : ""
                }`}
              >
                <Text className="mr-1">{o.emoji}</Text>
                <Text className="text-gray-700 text-xs font-medium">{o.etiqueta}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setAgregando(false)}
            accessibilityRole="button"
            className="items-center pt-2"
          >
            <Text className="text-gray-400 text-xs">Cancelar</Text>
          </TouchableOpacity>
        </Tarjeta>
      ) : (
        <Boton
          titulo="Agregar contenedor"
          icono="➕"
          variante="secundario"
          onPress={() => setAgregando(true)}
          className="py-3"
        />
      )}
    </Seccion>
  );
}
