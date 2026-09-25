import React, { useState } from "react";
import { Text, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type Mision } from "../state/EcoTrack";
import { avisar, confirmar, textoDeError } from "../lib/dialogos";
import { formatKg } from "../lib/formato";
import ContenedoresTorre from "../components/ContenedoresTorre";
import ValidacionContenedores from "../components/ValidacionContenedores";
import {
  AvatarPerfil,
  CampanaAvisos,
  Aviso,
  Barra,
  Boton,
  Campo,
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
    mision,
    guardarMision,
    avisosNuevos,
  } = useEcoTrack();

  const resumen = resumenTorre(usuario?.torreId ?? null);
  const [validandoTanda, setValidandoTanda] = useState(false);

  /**
   * El conserje pasa una vez al día y revisa los contenedores, no depósito por
   * depósito. Esta acción valida todos los contenedores de una vez, con los
   * kilos estimados por la talla que se declaró en cada depósito.
   */
  async function validarTanda() {
    const pendientes = resumen.pendientes;
    if (pendientes.length === 0) return;

    const acepta = await confirmar(
      "Validar la tanda del día",
      `Se validarán ${pendientes.length} depósito${
        pendientes.length === 1 ? "" : "s"
      } de todos los contenedores, con la talla declarada en cada uno. Si un contenedor no cuadra con lo que se declaró, márcalo antes con "No cuadra".`,
      "Validar todo"
    );
    if (!acepta) return;

    setValidandoTanda(true);
    try {
      for (const p of pendientes) {
        await validarRegistro(p);
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
          <CampanaAvisos nuevos={avisosNuevos} alPresionar={() => nav.ir("avisos")} />
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
                cargando={validandoTanda}
                onPress={validarTanda}
                className="py-3"
              />
            </View>
            {usuario?.torreId ? (
              <ValidacionContenedores
                torreId={usuario.torreId}
                pendientes={resumen.pendientes}
                alValidar={validarRegistro}
                alRechazar={rechazarRegistro}
              />
            ) : null}
          </>
        )}
      </Seccion>

      {usuario?.torreId ? <ContenedoresTorre torreId={usuario.torreId} /> : null}

      <Seccion titulo="Misión de la torre">
        <TarjetaMision
          mision={mision}
          kgMes={resumen.kgMes}
          metaKg={resumen.metaKg}
          avanceMeta={resumen.avanceMeta}
          alGuardar={guardarMision}
        />
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

/**
 * Meta en kilos e incentivo de la torre, editables por el administrador.
 * Mientras no se haya definido una misión propia, muestra la meta base
 * sembrada en la torre (`metaKg` ya viene resuelta así desde `resumenTorre`).
 */
function TarjetaMision({
  mision,
  kgMes,
  metaKg,
  avanceMeta,
  alGuardar,
}: {
  mision: Mision | null;
  kgMes: number;
  metaKg: number;
  avanceMeta: number;
  alGuardar: (datos: { metaKg: number; incentivo: string }) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [meta, setMeta] = useState(String(metaKg));
  const [incentivo, setIncentivo] = useState(mision?.incentivo ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function abrir() {
    setMeta(String(metaKg));
    setIncentivo(mision?.incentivo ?? "");
    setError(undefined);
    setEditando(true);
  }

  async function guardar() {
    const metaNum = Number(meta.replace(",", "."));
    if (!Number.isFinite(metaNum) || metaNum <= 0) {
      setError("Ingresa una meta en kilos mayor a 0.");
      return;
    }
    setGuardando(true);
    try {
      await alGuardar({ metaKg: metaNum, incentivo: incentivo.trim() });
      setEditando(false);
    } catch (e) {
      setError(textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-800 font-medium flex-1 pr-2">
          {metaKg} kg certificados este mes
        </Text>
        <Text className="text-green-700 font-semibold text-sm">{avanceMeta}%</Text>
      </View>
      <Barra avance={avanceMeta} />
      <Text className="text-gray-400 text-xs mt-2 mb-3">
        {formatKg(kgMes)} de {metaKg} kg acumulados
      </Text>

      {mision?.incentivo ? (
        <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
          <Text className="text-amber-800 text-xs">🎁 {mision.incentivo}</Text>
        </View>
      ) : null}

      {!editando ? (
        <Boton titulo="Editar incentivo" variante="secundario" onPress={abrir} className="py-3" />
      ) : (
        <>
          {error ? (
            <View className="mb-3">
              <Aviso texto={error} />
            </View>
          ) : null}
          <Campo
            etiqueta="Meta en kilos este mes"
            value={meta}
            onChangeText={setMeta}
            keyboardType="decimal-pad"
          />
          <Campo
            etiqueta="Incentivo"
            placeholder="Ej: entrada al cine para el depto que más recicló"
            value={incentivo}
            onChangeText={setIncentivo}
          />
          <Boton
            titulo={guardando ? "Guardando..." : "Guardar misión"}
            cargando={guardando}
            onPress={guardar}
            className="py-3 mb-2"
          />
          <Boton
            titulo="Cancelar"
            variante="secundario"
            onPress={() => setEditando(false)}
            deshabilitado={guardando}
            className="py-3"
          />
        </>
      )}
    </Tarjeta>
  );
}

