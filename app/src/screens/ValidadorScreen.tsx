import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack } from "../state/EcoTrack";
import { avisar, confirmar, textoDeError } from "../lib/dialogos";
import ValidacionContenedores from "../components/ValidacionContenedores";
import {
  AvatarPerfil,
  CampanaAvisos,
  Aviso,
  Boton,
  Cuerpo,
  Encabezado,
  Seccion,
  Vacio,
} from "../components/ui";

/**
 * Vista del validador: solo la ronda de validación. Las métricas, los
 * contenedores y el reporte son del administrador, en el panel web. Los
 * registros que llegan ya son solo los de la planta (ver consultasPara en
 * services/registros.ts).
 */
export default function ValidadorScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    miPlanta,
    errorDatos,
    validarRegistros,
    rechazarRegistros,
    avisosNuevos,
    registros,
    reportarYValidar,
  } = useEcoTrack();

  const pendientes = useMemo(() => registros.filter((r) => r.estado === "pendiente"), [registros]);
  const [validandoTanda, setValidandoTanda] = useState(false);

  /**
   * El validador pasa una vez al día y revisa los contenedores, no depósito
   * por depósito. Esta acción deja conformes todos los contenedores de una
   * vez, con los kilos estimados por la talla que se declaró en cada depósito.
   * Es un solo lote atómico: si falla, no queda nada validado a medias.
   */
  async function validarTanda() {
    if (pendientes.length === 0) return;

    const acepta = await confirmar(
      "Validar la tanda del día",
      `Se marcarán conformes ${pendientes.length} depósito${
        pendientes.length === 1 ? "" : "s"
      } de todos los contenedores, con la talla declarada en cada uno. Si un contenedor está vacío o no cuadra con lo declarado, márcalo antes como "Sin material".`,
      "Validar todo"
    );
    if (!acepta) return;

    setValidandoTanda(true);
    try {
      await validarRegistros(pendientes);
    } catch (e) {
      avisar("No se validó la tanda", `${textoDeError(e)} No se validó ningún depósito; intenta de nuevo.`);
    } finally {
      setValidandoTanda(false);
    }
  }

  return (
    <Cuerpo>
      <Encabezado tono="oscuro">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-gray-300 text-sm">
              Validador · {miPlanta?.nombre ?? "Sin planta"}
            </Text>
            <Text className="text-white text-2xl font-bold mt-1" numberOfLines={1}>
              {usuario?.nombre ?? "Validador"}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              {pendientes.length === 0
                ? "Ronda del día al día"
                : `${pendientes.length} depósito${pendientes.length === 1 ? "" : "s"} por validar`}
            </Text>
          </View>
          <CampanaAvisos nuevos={avisosNuevos} alPresionar={() => nav.ir("avisos")} />
          <AvatarPerfil
            nombre={usuario?.nombre ?? "Validador"}
            alPresionar={() => nav.ir("perfil")}
            color="bg-gray-700"
          />
        </View>
      </Encabezado>

      {errorDatos ? (
        <View className="px-6 mt-6">
          <Aviso texto={errorDatos} />
        </View>
      ) : null}

      <Seccion titulo="Validaciones pendientes" etiqueta={`${pendientes.length} en cola`}>
        {pendientes.length === 0 ? (
          <Vacio emoji="✅" texto="No hay depósitos pendientes en tu planta." />
        ) : (
          <>
            <View className="mb-3">
              <Boton
                titulo={
                  validandoTanda
                    ? "Validando..."
                    : `Validar la tanda del día (${pendientes.length})`
                }
                cargando={validandoTanda}
                onPress={validarTanda}
                className="py-3"
              />
            </View>
            {usuario?.plantaId ? (
              <ValidacionContenedores
                plantaId={usuario.plantaId}
                pendientes={pendientes}
                alValidar={validarRegistros}
                alRechazar={rechazarRegistros}
                alReportar={reportarYValidar}
              />
            ) : null}
          </>
        )}
      </Seccion>
    </Cuerpo>
  );
}
