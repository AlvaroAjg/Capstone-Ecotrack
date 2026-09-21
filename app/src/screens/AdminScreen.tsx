import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type Registro } from "../state/EcoTrack";
import { avisar, confirmar, textoDeError } from "../lib/dialogos";
import { formatKg, tiempoRelativo } from "../lib/formato";
import { contenidoQr, idContenedor } from "../lib/qr";
import CodigoQR from "../components/CodigoQR";
import {
  AvatarPerfil,
  Aviso,
  Barra,
  Boton,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Seccion,
  Tarjeta,
  Vacio,
} from "../components/ui";

export default function AdminScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    miTorre,
    errorDatos,
    resumenTorre,
    validarRegistro,
    rechazarRegistro,
  } = useEcoTrack();

  const resumen = resumenTorre(usuario?.torreId ?? null);
  const [validandoTanda, setValidandoTanda] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  /**
   * El conserje pasa una vez al día y revisa el contenedor completo, no
   * depósito por depósito. Esta acción cierra toda la cola pendiente de una vez,
   * tomando el peso declarado por cada residente.
   */
  async function validarTanda() {
    const pendientes = resumen.pendientes;
    if (pendientes.length === 0) return;

    const acepta = await confirmar(
      "Validar la tanda del día",
      `Se validarán ${pendientes.length} depósito${
        pendientes.length === 1 ? "" : "s"
      } con el peso declarado por cada residente. Los que necesiten corrección puedes ajustarlos uno a uno.`,
      "Validar todo"
    );
    if (!acepta) return;

    setValidandoTanda(true);
    try {
      for (const p of pendientes) {
        await validarRegistro(p.id, p.kgDeclarado);
      }
    } catch (e) {
      avisar("No se pudo completar", textoDeError(e));
    } finally {
      setValidandoTanda(false);
    }
  }

  return (
    <Cuerpo>
      <Encabezado tono="oscuro">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-gray-300 text-sm">Panel de administrador</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {miTorre?.nombre ?? "Sin torre"}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              {usuario?.nombre ?? "Administrador"} · {miTorre?.condominio ?? ""}
            </Text>
          </View>
          <AvatarPerfil
            nombre={usuario?.nombre ?? "Administrador"}
            alPresionar={() => nav.ir("perfil")}
            color="bg-gray-700"
          />
        </View>
      </Encabezado>

      <FilaMetricas
        metricas={[
          {
            valor: `${resumen.deptosActivos}/${resumen.deptosTotales}`,
            etiqueta: "Deptos. activos",
          },
          { valor: formatKg(resumen.kgMes), etiqueta: "Certificado este mes" },
          { valor: `${resumen.participacion}%`, etiqueta: "Participación" },
        ]}
      />

      {errorDatos ? (
        <View className="px-6 mt-6">
          <Aviso texto={errorDatos} />
        </View>
      ) : null}

      <Seccion
        titulo="Validaciones pendientes"
        etiqueta={`${resumen.pendientes.length} en cola`}
      >
        {resumen.pendientes.length === 0 ? (
          <Vacio emoji="✅" texto="No hay depósitos pendientes en tu torre." />
        ) : (
          <>
            <View className="mb-3">
              <Boton
                titulo={
                  validandoTanda
                    ? "Validando..."
                    : `Validar la tanda del día (${resumen.pendientes.length})`
                }
                icono="🗓️"
                cargando={validandoTanda}
                onPress={validarTanda}
                className="py-3"
              />
            </View>
            {resumen.pendientes.map((p) => (
              <TarjetaPendiente
                key={p.id}
                registro={p}
                alValidar={validarRegistro}
                alRechazar={rechazarRegistro}
              />
            ))}
          </>
        )}
      </Seccion>

      {usuario?.torreId ? (
        <Seccion titulo="Contenedor de la torre">
          <Tarjeta className="items-center">
            {mostrarQr ? (
              <>
                <CodigoQR texto={contenidoQr(usuario.torreId)} tamano={240} />
                <Text className="text-gray-900 font-bold text-lg tracking-widest mt-3">
                  {idContenedor(usuario.torreId)}
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-1 mb-4">
                  Imprímelo y pégalo en el contenedor. Los residentes lo escanean al depositar.
                </Text>
              </>
            ) : (
              <Text className="text-gray-500 text-xs text-center mb-4">
                Cada contenedor tiene un QR propio. Solo los residentes de esta torre pueden
                registrar depósitos con él.
              </Text>
            )}
            <Boton
              titulo={mostrarQr ? "Ocultar QR" : "Mostrar QR del contenedor"}
              variante="secundario"
              onPress={() => setMostrarQr((v) => !v)}
              className="py-3 self-stretch"
            />
          </Tarjeta>
        </Seccion>
      ) : null}

      <Seccion titulo="Misión de la torre">
        <Tarjeta>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-medium flex-1 pr-2">
              {resumen.metaKg} kg certificados este mes
            </Text>
            <Text className="text-green-700 font-semibold text-sm">
              {resumen.avanceMeta}%
            </Text>
          </View>
          <Barra avance={resumen.avanceMeta} />
          <Text className="text-gray-400 text-xs mt-2 mb-3">
            {formatKg(resumen.kgMes)} de {resumen.metaKg} kg acumulados
          </Text>
          <Boton
            titulo="Editar incentivo"
            variante="secundario"
            onPress={() =>
              avisar(
                "Incentivo",
                "La edición de misiones e incentivos llega en el sprint 5."
              )
            }
            className="py-3"
          />
        </Tarjeta>
      </Seccion>

      <View className="px-6 mt-6">
        <Boton
          titulo="Exportar reporte mensual (PDF)"
          icono="📊"
          variante="oscuro"
          onPress={() =>
            avisar(
              "Reporte mensual",
              "La exportación del reporte mensual en PDF llega en un próximo tramo."
            )
          }
        />
      </View>
    </Cuerpo>
  );
}

const PASO_KG = 0.5;

/**
 * Tarjeta de validación individual. El administrador no tiene balanza: estima
 * el peso a la vista y puede ajustar lo que declaró el residente antes de validar.
 */
function TarjetaPendiente({
  registro,
  alValidar,
  alRechazar,
}: {
  registro: Registro;
  alValidar: (id: string, kg: number) => Promise<void>;
  alRechazar: (id: string) => Promise<void>;
}) {
  const [kg, setKg] = useState(registro.kgDeclarado);
  const [ocupado, setOcupado] = useState(false);
  const ajustado = Math.abs(kg - registro.kgDeclarado) > 0.01;

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      avisar("No se pudo completar", textoDeError(e));
      setOcupado(false);
    }
  }

  return (
    <Tarjeta className="mb-3">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 min-w-0 pr-2">
          <Text className="text-gray-800 font-medium">{registro.residente}</Text>
          <Text className="text-gray-400 text-xs mt-1">
            {registro.depto} · {registro.material}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            Contenedor {registro.contenedor}
          </Text>
        </View>
        <Text className="text-gray-400 text-xs shrink-0" numberOfLines={1}>
          {tiempoRelativo(registro.creadoEn)}
        </Text>
      </View>

      <View className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 mb-3">
        <Text className="text-gray-500 text-[11px] mb-2">
          Peso declarado: {formatKg(registro.kgDeclarado)} · ajústalo si a la vista
          difiere
        </Text>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => setKg((v) => Math.max(PASO_KG, Math.round((v - PASO_KG) * 10) / 10))}
            accessibilityRole="button"
            accessibilityLabel="Disminuir peso"
            className="w-11 h-11 rounded-xl bg-white border border-gray-300 items-center justify-center"
          >
            <Text className="text-gray-700 text-xl">−</Text>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-gray-900 text-lg font-bold">{formatKg(kg)}</Text>
            {ajustado ? (
              <Text className="text-amber-600 text-[10px] mt-0.5">peso corregido</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setKg((v) => Math.round((v + PASO_KG) * 10) / 10)}
            accessibilityRole="button"
            accessibilityLabel="Aumentar peso"
            className="w-11 h-11 rounded-xl bg-white border border-gray-300 items-center justify-center"
          >
            <Text className="text-gray-700 text-xl">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row">
        <TouchableOpacity
          onPress={() => ejecutar(() => alValidar(registro.id, kg))}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityLabel={`Validar depósito de ${registro.residente}`}
          className={`flex-1 bg-green-700 rounded-xl py-3 items-center mr-2 ${
            ocupado ? "opacity-50" : ""
          }`}
        >
          <Text className="text-white font-medium text-sm">Validar {formatKg(kg)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => ejecutar(() => alRechazar(registro.id))}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityLabel={`Rechazar depósito de ${registro.residente}`}
          className={`flex-1 border border-red-300 rounded-xl py-3 items-center ${
            ocupado ? "opacity-50" : ""
          }`}
        >
          <Text className="text-red-600 font-medium text-sm">Rechazar</Text>
        </TouchableOpacity>
      </View>
    </Tarjeta>
  );
}
