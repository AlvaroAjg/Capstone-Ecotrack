import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useEcoTrack, type Area, type Usuario } from "../../state/EcoTrack";
import { generarCodigoArea, personasPorArea } from "../../lib/gestionPlanta";
import { avisar, textoDeError } from "../../lib/dialogos";
import * as servicioAreas from "../../services/areas";
import { escucharPersonas } from "../../services/personas";
import { Boton, Campo, Chip, Tarjeta } from "../../components/ui";

/**
 * Personas y áreas de la planta. Las áreas son las que compiten en el ranking:
 * cada una tiene un código para que su gente se una y una dotación, que es el
 * denominador de la participación.
 */
export default function PersonasSeccion() {
  const { usuario, areas } = useEcoTrack();
  const [personas, setPersonas] = useState<Usuario[]>([]);

  useEffect(() => {
    if (!usuario?.plantaId) return;
    return escucharPersonas(usuario.plantaId, setPersonas);
  }, [usuario?.plantaId]);

  if (!usuario?.plantaId) return null;

  return (
    <View>
      <TablaAreas plantaId={usuario.plantaId} areas={areas} personas={personas} />
    </View>
  );
}

function TablaAreas({
  plantaId,
  areas,
  personas,
}: {
  plantaId: string;
  areas: Area[];
  personas: Usuario[];
}) {
  const registradas = useMemo(() => personasPorArea(personas), [personas]);
  // "nueva" para el formulario de un área nueva, o el id del área que se edita.
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <Tarjeta className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-gray-800 text-base font-semibold">Áreas</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            La dotación es cuántas personas trabajan en el área: con ella se calcula la participación.
          </Text>
        </View>
        {editando === null ? (
          <Boton titulo="Nueva área" icono="➕" onPress={() => setEditando("nueva")} className="py-2 px-4" />
        ) : null}
      </View>

      <View className="flex-row border-b border-gray-200 pb-2">
        <Text className="flex-1 text-gray-500 text-xs font-semibold">Área</Text>
        <Text className="w-32 text-gray-500 text-xs font-semibold">Código</Text>
        <Text className="w-24 text-gray-500 text-xs font-semibold text-right">Dotación</Text>
        <Text className="w-28 text-gray-500 text-xs font-semibold text-right">Registradas</Text>
        <View className="w-24" />
      </View>

      {areas.length === 0 && editando !== "nueva" ? (
        <Text className="text-gray-500 text-sm py-4">
          Todavía no hay áreas. Crea una por cada sector de la planta que compita en el ranking.
        </Text>
      ) : null}

      {areas.map((a) =>
        editando === a.id ? (
          <FormularioArea
            key={a.id}
            plantaId={plantaId}
            area={a}
            areas={areas}
            personasDelArea={personas.filter((p) => p.areaId === a.id && p.rol !== "administrador")}
            alTerminar={() => setEditando(null)}
          />
        ) : (
          <View key={a.id} className="flex-row items-center py-3 border-b border-gray-100">
            <Text className="flex-1 text-gray-800 text-sm font-medium">{a.nombre}</Text>
            <Text className="w-32 text-gray-700 text-sm tracking-widest">{a.codigo}</Text>
            <Text className="w-24 text-gray-700 text-sm text-right">{a.dotacion}</Text>
            <Text className="w-28 text-gray-700 text-sm text-right">{registradas[a.id] ?? 0}</Text>
            <View className="w-24 items-end">
              {editando === null ? (
                <TouchableOpacity onPress={() => setEditando(a.id)} accessibilityRole="button">
                  <Text className="text-green-700 text-sm font-semibold">Editar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )
      )}

      {editando === "nueva" ? (
        <FormularioArea
          plantaId={plantaId}
          area={null}
          areas={areas}
          personasDelArea={[]}
          alTerminar={() => setEditando(null)}
        />
      ) : null}
    </Tarjeta>
  );
}

/** Crear un área (area = null) o editar una existente. */
function FormularioArea({
  plantaId,
  area,
  areas,
  personasDelArea,
  alTerminar,
}: {
  plantaId: string;
  area: Area | null;
  areas: Area[];
  personasDelArea: Usuario[];
  alTerminar: () => void;
}) {
  const [nombre, setNombre] = useState(area?.nombre ?? "");
  const [dotacion, setDotacion] = useState(area ? String(area.dotacion) : "");
  const [codigo, setCodigo] = useState(area?.codigo ?? "");
  const [guardando, setGuardando] = useState(false);

  // Los códigos de las otras áreas, para no repetir uno.
  const otrosCodigos = areas.filter((a) => a.id !== area?.id).map((a) => a.codigo);

  async function guardar() {
    const limpio = nombre.trim();
    const personas = Number(dotacion);
    if (!limpio) {
      avisar("Falta el nombre", "Escribe el nombre del área, por ejemplo Embotellado.");
      return;
    }
    if (!Number.isInteger(personas) || personas < 1) {
      avisar("Dotación no válida", "Escribe cuántas personas trabajan en el área, como número entero.");
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        nombre: limpio,
        dotacion: personas,
        // Un área nueva recibe su código al guardar, con las letras de su nombre.
        codigo: codigo || generarCodigoArea(limpio, otrosCodigos),
      };
      if (area) await servicioAreas.editarArea(area, datos, personasDelArea);
      else await servicioAreas.crearArea(plantaId, datos);
      alTerminar();
    } catch (e) {
      avisar("No se pudo guardar el área", textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View className="bg-gray-50 rounded-xl p-4 my-3">
      <Text className="text-gray-800 font-semibold mb-3">{area ? `Editar ${area.nombre}` : "Nueva área"}</Text>
      <View className="flex-row">
        <View className="flex-1 mr-3">
          <Campo
            etiqueta="Nombre"
            placeholder="Por ejemplo, Embotellado"
            value={nombre}
            onChangeText={setNombre}
            maxLength={60}
          />
        </View>
        <View className="w-40">
          <Campo
            etiqueta="Dotación (personas)"
            placeholder="20"
            keyboardType="number-pad"
            value={dotacion}
            onChangeText={(t) => setDotacion(t.replace(/[^0-9]/g, ""))}
          />
        </View>
      </View>
      {area ? (
        <View className="flex-row items-center mb-3">
          <Text className="text-gray-600 text-sm mr-3">
            Código: <Text className="font-semibold tracking-widest">{codigo}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setCodigo(generarCodigoArea(nombre || area.nombre, [...otrosCodigos, codigo]))}
            accessibilityRole="button"
          >
            <Text className="text-green-700 text-xs font-semibold">Generar uno nuevo</Text>
          </TouchableOpacity>
          <Text className="text-gray-400 text-xs ml-3 flex-1">
            Sirve si el código se filtró; las personas que ya están en el área no se mueven.
          </Text>
        </View>
      ) : (
        <Text className="text-gray-400 text-xs mb-3">
          El código para unirse se genera al guardar, con las letras del nombre y cuatro cifras al azar.
        </Text>
      )}
      <View className="flex-row">
        <Boton titulo="Guardar" cargando={guardando} onPress={guardar} className="py-2 px-5 mr-2" />
        <Boton titulo="Cancelar" variante="secundario" onPress={alTerminar} className="py-2 px-5" />
      </View>
    </View>
  );
}
