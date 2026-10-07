import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useEcoTrack, type Campana, type FilaRanking } from "../../state/EcoTrack";
import { avanceAreas, textoFecha, validarCampana } from "../../lib/incentivo";
import { diaYMes } from "../../lib/formato";
import { avisar, textoDeError } from "../../lib/dialogos";
import { Boton, Campo, Tarjeta } from "../../components/ui";

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
  const vigente = campana !== null && campana.terminaEn >= Date.now();

  return (
    <View className="max-w-[960px]">
      {editando || campana === null ? (
        <FormularioCampana
          campana={campana}
          alTerminar={() => setEditando(false)}
          puedeCancelar={campana !== null}
        />
      ) : (
        <Tarjeta className="mb-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
                {vigente ? "Campaña activa" : "Campaña terminada"}
              </Text>
              <Text className="text-gray-900 text-xl font-bold mt-1">{campana.nombre}</Text>
              <Text className="text-gray-600 text-sm mt-1">
                Meta: {campana.metaParticipacion}% de participación por área ·{" "}
                {vigente ? "termina" : "terminó"} el {diaYMes(campana.terminaEn)}
              </Text>
              <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3 self-start">
                <Text className="text-amber-900 text-sm">🏆 {campana.incentivo}</Text>
              </View>
            </View>
            <Boton
              titulo="Editar"
              variante="secundario"
              onPress={() => setEditando(true)}
              className="py-2 px-5"
            />
          </View>
          {!vigente ? (
            <Text className="text-gray-500 text-xs mt-3">
              Los colaboradores ya no ven esta campaña. Edítala para lanzar la siguiente.
            </Text>
          ) : null}
        </Tarjeta>
      )}

      {campana ? <AvanceAreas campana={campana} ranking={ranking} /> : null}
    </View>
  );
}

function AvanceAreas({ campana, ranking }: { campana: Campana; ranking: FilaRanking[] }) {
  const filas = useMemo(() => avanceAreas(campana.metaParticipacion, ranking), [campana, ranking]);
  const cumplen = filas.filter((f) => f.cumple).length;

  return (
    <Tarjeta>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-gray-800 text-base font-semibold">Avance de cada área</Text>
        <View className="bg-gray-200 rounded-full px-3 py-1">
          <Text className="text-gray-600 text-xs font-medium">
            {cumplen} de {filas.length} cumplen la meta
          </Text>
        </View>
      </View>
      {filas.map((f) => (
        <View key={f.areaId} className="flex-row items-center h-10">
          <Text className="w-48 text-gray-800 text-sm font-medium" numberOfLines={1}>
            {f.nombre}
          </Text>
          <View className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden mr-3">
            <View
              className={`h-2.5 rounded-full ${f.cumple ? "bg-green-700" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, (f.participacion / campana.metaParticipacion) * 100)}%` }}
            />
          </View>
          <Text className="w-14 text-right text-gray-900 text-sm font-bold">{f.participacion}%</Text>
          <Text
            className={`w-40 text-right text-xs ${f.cumple ? "text-green-700 font-semibold" : "text-gray-500"}`}
          >
            {f.cumple ? "Meta cumplida" : `Le falta un ${f.faltan}%`}
          </Text>
        </View>
      ))}
      <Text className="text-gray-400 text-xs mt-3">
        La barra es el avance hacia la meta de {campana.metaParticipacion}%, no hacia el 100 %.
      </Text>
    </Tarjeta>
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
    <Tarjeta className="mb-6">
      <Text className="text-gray-800 text-base font-semibold mb-1">
        {campana ? "Editar campaña" : "Crear la campaña"}
      </Text>
      <Text className="text-gray-500 text-xs mb-4">
        {campana
          ? "Al guardar, los colaboradores ven el cambio en su inicio."
          : "Todavía no hay incentivo. Mientras no exista, los colaboradores no ven ninguna campaña."}
      </Text>
      <View className="flex-row">
        <View className="flex-1 mr-3">
          <Campo
            etiqueta="Nombre"
            placeholder="Por ejemplo, Octubre verde"
            value={nombre}
            onChangeText={setNombre}
            maxLength={80}
          />
        </View>
        <View className="w-48 mr-3">
          <Campo
            etiqueta="Meta de participación (%)"
            placeholder="50"
            keyboardType="number-pad"
            value={meta}
            onChangeText={(t) => setMeta(t.replace(/[^0-9]/g, ""))}
          />
        </View>
        <View className="w-48">
          <Campo etiqueta="Termina el" placeholder="31-10-2026" value={termina} onChangeText={setTermina} />
        </View>
      </View>
      <Campo
        etiqueta="Incentivo"
        placeholder="Por ejemplo, desayuno para las áreas que lleguen a la meta"
        value={incentivo}
        onChangeText={setIncentivo}
        maxLength={200}
      />
      <View className="flex-row mt-1">
        <Boton titulo="Guardar campaña" cargando={guardando} onPress={guardar} className="py-3 px-6 mr-2" />
        {puedeCancelar ? (
          <Boton titulo="Cancelar" variante="secundario" onPress={alTerminar} className="py-3 px-6" />
        ) : null}
      </View>
    </Tarjeta>
  );
}
