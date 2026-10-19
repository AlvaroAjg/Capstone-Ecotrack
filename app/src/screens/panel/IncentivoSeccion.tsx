import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useEcoTrack, type Campana, type FilaRanking } from "../../state/EcoTrack";
import { avanceAreas, textoFecha, validarCampana } from "../../lib/incentivo";
import { diaYMes } from "../../lib/formato";
import { avisar, textoDeError } from "../../lib/dialogos";
import {
  Bloque,
  BotonPanel,
  CampoPanel,
  EncabezadoBloque,
  EncabezadoSeccion,
  Icono,
  Insignia,
  Texto,
  Titulo,
} from "./estilo";

const DIA = 24 * 60 * 60 * 1000;

/**
 * El incentivo de la planta: la campaña vigente, cómo va cada área frente a
 * la meta y el formulario para crearla o cambiarla. La meta es de
 * participación (% de personas del área que reciclaron en el mes) y no de
 * kilos: los kilos son estimados y premiarlos invita a inflarlos. Lo que se
 * guarda aquí lo ve cada colaborador en su inicio.
 */
export default function IncentivoSeccion() {
  const { campana, ranking } = useEcoTrack();
  const [editando, setEditando] = useState(false);

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
              <TarjetaCampana campana={campana} ranking={ranking} alEditar={() => setEditando(true)} />
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
          {editando || campana === null ? (
            <FormularioCampana
              campana={campana}
              alTerminar={() => setEditando(false)}
              puedeCancelar={campana !== null}
            />
          ) : (
            <View className="bg-ambar-claro rounded-[20px] px-5 py-4">
              <Texto className="text-ambar-profundo text-[15px] font-bold">Cómo funciona</Texto>
              <Texto className="text-ambar-oscuro text-[13px] mt-2 leading-[19px]">
                Hay una campaña a la vez. Al editarla, los colaboradores ven el cambio en su inicio. Cuando
                termine, edítala para lanzar la siguiente.
              </Texto>
            </View>
          )}
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
        <Titulo className="text-oliva text-[52px] leading-[56px]">
          {cumplen}/{avance.length}
        </Titulo>
        <View className="flex-1 ml-5">
          <Texto className="text-tinta-media text-[13px]">
            Áreas que llegan a la meta de {campana.metaParticipacion}% de participación este mes.
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
          Los colaboradores ya no ven esta campaña. Edítala para lanzar la siguiente.
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

function FormularioCampana({
  campana,
  puedeCancelar,
  alTerminar,
}: {
  campana: Campana | null;
  puedeCancelar: boolean;
  alTerminar: () => void;
}) {
  const { guardarCampana } = useEcoTrack();
  const [nombre, setNombre] = useState(campana?.nombre ?? "");
  const [meta, setMeta] = useState(campana ? String(campana.metaParticipacion) : "");
  const [incentivo, setIncentivo] = useState(campana?.incentivo ?? "");
  const [termina, setTermina] = useState(campana ? textoFecha(campana.terminaEn) : "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const revisado = validarCampana({ nombre, meta, incentivo, termina });
    if (!revisado.ok) {
      avisar("Revisa la campaña", revisado.error);
      return;
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
      <Titulo className="text-[24px]">{campana ? "Editar campaña" : "Nueva campaña"}</Titulo>
      <Texto className="text-tinta-suave text-xs mt-1 mb-4">
        {campana
          ? "Al guardar, los colaboradores ven el cambio en su inicio."
          : "Todavía no hay incentivo. Mientras no exista, los colaboradores no ven ninguna campaña."}
      </Texto>
      <CampoPanel
        etiqueta="Nombre"
        placeholder="Por ejemplo, Octubre verde"
        value={nombre}
        onChangeText={setNombre}
        maxLength={80}
      />
      <View className="flex-row">
        <CampoPanel
          etiqueta="Meta de participación (%)"
          placeholder="50"
          keyboardType="number-pad"
          value={meta}
          onChangeText={(t) => setMeta(t.replace(/[^0-9]/g, ""))}
          className="flex-1 mr-3"
        />
        <CampoPanel
          etiqueta="Termina el"
          placeholder="31-10-2026"
          value={termina}
          onChangeText={setTermina}
          className="flex-1"
        />
      </View>
      <CampoPanel
        etiqueta="Incentivo"
        placeholder="Por ejemplo, desayuno para las áreas que lleguen a la meta"
        value={incentivo}
        onChangeText={setIncentivo}
        maxLength={200}
      />
      <View className="flex-row mt-1">
        <BotonPanel titulo="Guardar campaña" cargando={guardando} onPress={guardar} className="mr-2" />
        {puedeCancelar ? <BotonPanel titulo="Cancelar" variante="secundario" onPress={alTerminar} /> : null}
      </View>
    </Bloque>
  );
}
