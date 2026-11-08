import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useEcoTrack, type Campana, type FilaRanking } from "../../state/EcoTrack";
import {
  avanceAreas,
  fechaIso,
  isoATexto,
  personasQueFaltan,
  validarCampana,
} from "../../lib/incentivo";
import { diaYMes } from "../../lib/formato";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import {
  Bloque,
  BotonPanel,
  CampoFecha,
  CampoPanel,
  EncabezadoBloque,
  EncabezadoSeccion,
  Enlace,
  Icono,
  Insignia,
  Texto,
  Titulo,
} from "./estilo";

const DIA = 24 * 60 * 60 * 1000;

/**
 * El incentivo de la planta: la campaña vigente, cómo va cada área frente a
 * la meta y, al lado, el formulario para editarla o lanzar la siguiente. Hay
 * una campaña a la vez. La meta es de participación (% de personas del área
 * que reciclaron en el mes) y no de kilos: los kilos son estimados y
 * premiarlos invita a inflarlos. Lo que se guarda aquí lo ve cada colaborador
 * en su inicio.
 */
export default function IncentivoSeccion() {
  const { campana, ranking } = useEcoTrack();
  // "editar" la campaña actual o empezar una "nueva" que la reemplaza. Sin
  // elegir (null), se edita la vigente y, si ya terminó, se lanza la siguiente.
  const [modo, setModo] = useState<"editar" | "nueva" | null>(null);
  const terminada = campana !== null && campana.terminaEn < Date.now();
  const nueva = campana === null || (modo ?? (terminada ? "nueva" : "editar")) === "nueva";

  return (
    <View>
      <EncabezadoSeccion
        titulo="Campañas e incentivos"
        detalle="La meta se mide en participación: el porcentaje de personas de cada área que reciclan en el mes, nunca en kilos."
      />
      <View className="flex-row items-start">
        <View className="flex-1 min-w-0 mr-7">
          {campana ? (
            <>
              <TarjetaCampana campana={campana} ranking={ranking} alEditar={() => setModo("editar")} />
              <AvanceAreas campana={campana} ranking={ranking} />
            </>
          ) : (
            <Bloque>
              <Titulo className="text-[24px]">Todavía no hay campaña</Titulo>
              <Texto className="text-tinta-suave text-sm mt-1">
                Mientras no exista, los colaboradores no ven ninguna en su inicio. Créala con el formulario.
              </Texto>
            </Bloque>
          )}
        </View>
        <View className="w-[380px]">
          {/* Con key, el formulario se vuelve a llenar cuando la campaña cambia o se cambia de modo. */}
          <FormularioCampana
            key={`${nueva ? "nueva" : "editar"}-${campana?.actualizadaEn ?? 0}`}
            campana={nueva ? null : campana}
            reemplaza={campana !== null && campana.terminaEn >= Date.now() && nueva}
            alTerminar={() => setModo(null)}
            alCambiarModo={campana ? () => setModo(nueva ? "editar" : "nueva") : undefined}
          />
        </View>
      </View>
    </View>
  );
}

function TarjetaCampana({
  campana,
  ranking,
  alEditar,
}: {
  campana: Campana;
  ranking: FilaRanking[];
  alEditar: () => void;
}) {
  const vigente = campana.terminaEn >= Date.now();
  const quedan = Math.max(0, Math.ceil((campana.terminaEn - Date.now()) / DIA));
  const avance = avanceAreas(campana.metaParticipacion, ranking);
  const cumplen = avance.filter((a) => a.cumple).length;
  const faltan = personasQueFaltan(campana.metaParticipacion, ranking);

  return (
    <Bloque className="mb-6 px-7 py-6">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 min-w-0 pr-4">
          <Texto className="text-tinta-suave text-[13px]">
            Toda la planta · {vigente ? "termina" : "terminó"} el {diaYMes(campana.terminaEn)}
          </Texto>
          <Titulo className="text-[30px] leading-[34px] mt-1">{campana.nombre}</Titulo>
        </View>
        <Insignia
          texto={vigente ? `Activa, queda${quedan === 1 ? "" : "n"} ${quedan} día${quedan === 1 ? "" : "s"}` : "Terminada"}
          tono={vigente ? "oliva" : "gris"}
        />
      </View>

      <View className="flex-row items-center mt-5">
        <Titulo className="text-oliva text-[60px] leading-[62px]">
          {cumplen}/{avance.length}
        </Titulo>
        <View className="flex-1 ml-5">
          <Texto className="text-tinta-media text-[13px] leading-[19px]">
            Áreas que llegan a la meta de {campana.metaParticipacion}%: que esa parte de su gente recicle al menos
            una vez en el mes.{" "}
            {faltan > 0
              ? `Faltan ${faltan} persona${faltan === 1 ? "" : "s"} para que lleguen todas.`
              : "Todas llegan a la meta."}
          </Texto>
          <View className="h-2.5 bg-piedra-linea rounded-full overflow-hidden mt-2">
            <View
              className="h-2.5 bg-oliva rounded-full"
              style={{ width: `${avance.length > 0 ? Math.round((cumplen / avance.length) * 100) : 0}%` }}
            />
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-ambar-claro rounded-2xl px-4 py-3 mt-5">
        <View className="flex-row items-center flex-1 min-w-0 pr-3">
          <Icono nombre="regalo" tamano={18} color="#A8732F" />
          <Texto className="text-ambar-profundo text-sm font-semibold ml-2 flex-1">{campana.incentivo}</Texto>
        </View>
        <BotonPanel titulo="Editar" variante="secundario" icono="editar" compacto onPress={alEditar} />
      </View>
      {!vigente ? (
        <Texto className="text-tinta-suave text-xs mt-3">
          Los colaboradores ya no ven esta campaña. Lanza la siguiente desde el formulario.
        </Texto>
      ) : null}
    </Bloque>
  );
}

function AvanceAreas({ campana, ranking }: { campana: Campana; ranking: FilaRanking[] }) {
  const filas = useMemo(() => avanceAreas(campana.metaParticipacion, ranking), [campana, ranking]);
  const cumplen = filas.filter((f) => f.cumple).length;

  return (
    <Bloque>
      <EncabezadoBloque
        titulo="Avance de cada área"
        derecha={
          <Texto className="text-tinta-suave text-xs">
            {cumplen} de {filas.length} cumplen la meta
          </Texto>
        }
      />
      {filas.map((f) => (
        <View key={f.areaId} className="flex-row items-center h-11 border-t border-piedra-linea">
          <Texto className="w-48 text-tinta text-sm font-semibold pr-2" numberOfLines={1}>
            {f.nombre}
          </Texto>
          <View className="flex-1 h-2.5 bg-piedra-linea rounded-full overflow-hidden mr-3">
            <View
              className={`h-2.5 rounded-full ${f.cumple ? "bg-oliva" : "bg-ambar"}`}
              style={{ width: `${Math.min(100, (f.participacion / campana.metaParticipacion) * 100)}%` }}
            />
          </View>
          <Titulo className="w-14 text-right text-tinta text-[19px]">{f.participacion}%</Titulo>
          <Texto
            className={`w-40 text-right text-xs ${f.cumple ? "text-oliva font-semibold" : "text-tinta-suave"}`}
          >
            {f.cumple ? "Meta cumplida" : `Le falta un ${f.faltan}%`}
          </Texto>
        </View>
      ))}
      <Texto className="text-tinta-suave text-xs mt-3">
        La barra es el avance hacia la meta de {campana.metaParticipacion}%, no hacia el 100 %.
      </Texto>
    </Bloque>
  );
}

/**
 * Editar la campaña actual (con sus datos) o lanzar una nueva (en blanco).
 * Hay una campaña a la vez: la nueva reemplaza a la actual.
 */
function FormularioCampana({
  campana,
  reemplaza,
  alTerminar,
  alCambiarModo,
}: {
  /** La campaña que se edita; null para una nueva. */
  campana: Campana | null;
  /** Guardar reemplaza a una campaña que sigue vigente: se pide confirmar. */
  reemplaza: boolean;
  alTerminar: () => void;
  /** Pasar de editar la actual a lanzar otra, o volver; no está si todavía no hay campaña. */
  alCambiarModo?: () => void;
}) {
  const { guardarCampana } = useEcoTrack();
  const [nombre, setNombre] = useState(campana?.nombre ?? "");
  const [meta, setMeta] = useState(campana ? String(campana.metaParticipacion) : "");
  const [incentivo, setIncentivo] = useState(campana?.incentivo ?? "");
  const [termina, setTermina] = useState(campana ? fechaIso(campana.terminaEn) : "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const revisado = validarCampana({ nombre, meta, incentivo, termina: isoATexto(termina) });
    if (!revisado.ok) {
      avisar("Revisa la campaña", revisado.error);
      return;
    }
    if (reemplaza) {
      const acepta = await confirmar(
        "Reemplazar la campaña",
        "Hay una campaña a la vez: la nueva reemplaza a la actual, y los colaboradores dejan de verla.",
        "Reemplazar"
      );
      if (!acepta) return;
    }
    setGuardando(true);
    try {
      await guardarCampana(revisado.datos);
      alTerminar();
    } catch (e) {
      avisar("No se pudo guardar la campaña", textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Bloque>
      <View className="flex-row items-baseline justify-between">
        <Titulo className="text-[24px]">{campana ? "Editar campaña" : "Nueva campaña"}</Titulo>
        {alCambiarModo ? (
          <Enlace texto={campana ? "Lanzar otra" : "Volver a la actual"} alPresionar={alCambiarModo} />
        ) : null}
      </View>
      <Texto className="text-tinta-suave text-xs mt-1 mb-4">
        {campana
          ? "Al guardar, los colaboradores ven el cambio en su inicio."
          : alCambiarModo
            ? "Hay una campaña a la vez: la nueva reemplaza a la actual."
            : "Todavía no hay incentivo. Mientras no exista, los colaboradores no ven ninguna campaña."}
      </Texto>
      <CampoPanel
        etiqueta="Nombre"
        placeholder="Por ejemplo, Diciembre sin latas en la basura"
        value={nombre}
        onChangeText={setNombre}
        maxLength={80}
      />
      <View className="flex-row">
        <CampoPanel
          etiqueta="Meta en % de participación"
          placeholder="50"
          keyboardType="number-pad"
          value={meta}
          onChangeText={(t) => setMeta(t.replace(/[^0-9]/g, ""))}
          className="flex-1 mr-3"
        />
        <CampoFecha
          etiqueta="Termina el"
          valor={termina}
          alCambiar={setTermina}
          className="flex-1"
        />
      </View>
      <CampoPanel
        etiqueta="Incentivo"
        placeholder="Por ejemplo, almuerzo especial para las áreas que lleguen a la meta"
        ayuda="Lo define y entrega la viña. Las personas lo ven en su inicio."
        value={incentivo}
        onChangeText={setIncentivo}
        maxLength={200}
        multiline
        numberOfLines={2}
      />
      <View className="flex-row mt-1">
        <BotonPanel
          titulo={campana ? "Guardar cambios" : "Crear campaña"}
          cargando={guardando}
          onPress={guardar}
          className="mr-2"
        />
        {alCambiarModo && !campana ? (
          <BotonPanel titulo="Cancelar" variante="secundario" onPress={alCambiarModo} />
        ) : null}
      </View>
    </Bloque>
  );
}
