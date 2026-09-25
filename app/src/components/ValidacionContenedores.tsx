import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  TALLAS,
  kgEfectivo,
  nombreContenedor,
  type Contenedor,
  type Registro,
} from "../lib/tipos";
import { avisar, confirmar, textoDeError } from "../lib/dialogos";
import { formatKgEstimado, sumaKg, tiempoRelativo } from "../lib/formato";
import { escucharContenedores } from "../services/contenedores";
import { Boton, Tarjeta } from "./ui";

interface Grupo {
  codigo: string;
  contenedor: Contenedor | null;
  registros: Registro[];
}

/** "3 depósitos: 2 de talla S y 1 de talla M" (los antiguos, en kilos, aparte). */
function resumenTallas(registros: Registro[]): string {
  const partes = TALLAS.map((t) => ({
    talla: t.valor,
    cantidad: registros.filter((r) => r.talla === t.valor).length,
  }))
    .filter((p) => p.cantidad > 0)
    .map((p) => `${p.cantidad} de talla ${p.talla}`);
  const enKilos = registros.filter((r) => !r.talla).length;
  if (enKilos > 0) partes.push(`${enKilos} registrado${enKilos === 1 ? "" : "s"} en kilos`);

  const total = `${registros.length} depósito${registros.length === 1 ? "" : "s"}`;
  if (partes.length === 0) return total;
  const lista =
    partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
  return `${total}: ${lista}`;
}

/** En un contenedor mixto importa también qué materiales se declararon. */
function resumenMateriales(registros: Registro[]): string {
  const cuenta = new Map<string, number>();
  for (const r of registros) cuenta.set(r.material, (cuenta.get(r.material) ?? 0) + 1);
  return Array.from(cuenta.entries())
    .map(([material, n]) => `${material} ${n}`)
    .join(" · ");
}

/**
 * Validación por contenedor. Los residentes vacían su reciclaje en el
 * contenedor, así que el administrador no puede saber de quién es cada cosa:
 * lo que sí ve es cada contenedor. Por eso los pendientes se agrupan por
 * contenedor con lo que se declaró en él, y el administrador compara a la
 * vista: si cuadra, valida el contenedor completo; si no, lo rechaza. La
 * revisión depósito por depósito queda plegada, solo para excepciones.
 */
export default function ValidacionContenedores({
  torreId,
  pendientes,
  alValidar,
  alRechazar,
}: {
  torreId: string;
  pendientes: Registro[];
  alValidar: (registro: Registro) => Promise<void>;
  alRechazar: (id: string) => Promise<void>;
}) {
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => escucharContenedores(torreId, setContenedores), [torreId]);

  const grupos = useMemo<Grupo[]>(() => {
    const porCodigo = new Map<string, Registro[]>();
    for (const r of pendientes) {
      porCodigo.set(r.contenedor, [...(porCodigo.get(r.contenedor) ?? []), r]);
    }
    return Array.from(porCodigo.entries()).map(([codigo, registros]) => ({
      codigo,
      contenedor: contenedores.find((c) => c.codigo === codigo) ?? null,
      registros: registros.sort((a, b) => a.creadoEn - b.creadoEn),
    }));
  }, [pendientes, contenedores]);

  async function ejecutar(clave: string, accion: () => Promise<void>) {
    setOcupado(clave);
    try {
      await accion();
    } catch (e) {
      avisar("No se pudo completar", textoDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function noCuadra(g: Grupo, nombre: string) {
    const acepta = await confirmar(
      "El contenedor no cuadra",
      `Se rechazarán los ${g.registros.length} depósitos pendientes del ${nombre.toLowerCase()}. Úsalo solo si lo que hay en el contenedor no corresponde a lo que se declaró.`,
      "Rechazar"
    );
    if (!acepta) return;
    await ejecutar(g.codigo, async () => {
      for (const r of g.registros) await alRechazar(r.id);
    });
  }

  async function rechazarUno(r: Registro) {
    const acepta = await confirmar(
      "Rechazar un depósito",
      `${r.depto || "Sin depto"} · ${r.material}${r.talla ? ` · talla ${r.talla}` : ""}. Úsalo para excepciones, por ejemplo un depósito registrado dos veces.`,
      "Rechazar"
    );
    if (!acepta) return;
    await ejecutar(r.id, () => alRechazar(r.id));
  }

  return (
    <>
      {grupos.map((g) => {
        const nombre = g.contenedor
          ? nombreContenedor(g.contenedor)
          : `Contenedor ${g.codigo}`;
        const reemplazado = !g.contenedor || !g.contenedor.activo;
        const kg = sumaKg(g.registros.map(kgEfectivo));
        const verDetalle = abierto === g.codigo;
        const ocupadoAqui = ocupado === g.codigo;

        return (
          <Tarjeta key={g.codigo} className="mb-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 min-w-0 pr-2">
                <Text className="text-gray-800 font-semibold">{nombre}</Text>
                <Text className="text-gray-400 text-xs mt-0.5 tracking-widest">
                  {g.codigo}
                  {reemplazado ? "  (código ya no en uso)" : ""}
                </Text>
              </View>
              <Text className="text-gray-700 text-sm font-semibold">{formatKgEstimado(kg)}</Text>
            </View>

            <View className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 mt-3">
              <Text className="text-gray-500 text-[11px] mb-1">Se declaró en este contenedor:</Text>
              <Text className="text-gray-800 text-sm font-medium">{resumenTallas(g.registros)}</Text>
              {!g.contenedor?.material ? (
                <Text className="text-gray-500 text-xs mt-1">{resumenMateriales(g.registros)}</Text>
              ) : null}
              <Text className="text-gray-400 text-[11px] mt-2">
                Míralo y compara: ¿cuadra con lo que hay adentro?
              </Text>
            </View>

            <View className="flex-row mt-3">
              <Boton
                titulo={ocupadoAqui ? "Validando..." : "Validar contenedor"}
                cargando={ocupadoAqui}
                deshabilitado={ocupado !== null}
                onPress={() =>
                  ejecutar(g.codigo, async () => {
                    for (const r of g.registros) await alValidar(r);
                  })
                }
                className="flex-1 py-3 mr-2"
              />
              <Boton
                titulo="No cuadra"
                variante="peligro"
                deshabilitado={ocupado !== null}
                onPress={() => noCuadra(g, nombre)}
                className="flex-1 py-3"
              />
            </View>

            <TouchableOpacity
              onPress={() => setAbierto(verDetalle ? null : g.codigo)}
              accessibilityRole="button"
              className="items-center pt-3"
            >
              <Text className="text-gray-500 text-xs">
                {verDetalle ? "Ocultar depósitos" : `Ver depósitos (${g.registros.length})`}
              </Text>
            </TouchableOpacity>

            {verDetalle
              ? g.registros.map((r) => (
                  <View
                    key={r.id}
                    className="flex-row items-center border-t border-gray-100 pt-2 mt-2"
                  >
                    <Text className="text-gray-600 text-xs flex-1 pr-2">
                      {r.depto || "Sin depto"} · {r.material}
                      {r.talla ? ` · talla ${r.talla}` : ""} · {tiempoRelativo(r.creadoEn)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => rechazarUno(r)}
                      disabled={ocupado !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Rechazar depósito de ${r.depto || "sin depto"}`}
                    >
                      <Text className="text-red-600 text-xs font-medium">Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                ))
              : null}
          </Tarjeta>
        );
      })}
    </>
  );
}
