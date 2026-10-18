import React, { useEffect, useMemo, useState } from "react";
import { TextInput, View, useWindowDimensions } from "react-native";
import { useEcoTrack, type Area, type Usuario } from "../../state/EcoTrack";
import { filasPersonas, generarCodigoArea, personasPorArea } from "../../lib/gestionPlanta";
import { fechaCorta } from "../../lib/formato";
import { avisar, confirmar, textoDeError } from "../../lib/dialogos";
import * as servicioAreas from "../../services/areas";
import { cambiarArea, cambiarRol, escucharPersonas } from "../../services/personas";
import {
  Bloque,
  BotonPanel,
  CampoPanel,
  EncabezadoSeccion,
  Enlace,
  Icono,
  Insignia,
  Pildoras,
  Texto,
  Titulo,
  iniciales,
  type Tono,
} from "./estilo";

/** Desde este ancho, validadores y áreas van al lado de la tabla; bajo él, debajo. */
const ANCHO_DOS_COLUMNAS = 1280;

/**
 * Personas y áreas de la planta. Las áreas son las que compiten en el ranking:
 * cada una tiene un código para que su gente se una y una dotación, que es el
 * denominador de la participación.
 */
export default function PersonasSeccion() {
  const { usuario, areas } = useEcoTrack();
  const [personas, setPersonas] = useState<Usuario[]>([]);
  const dosColumnas = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;

  useEffect(() => {
    if (!usuario?.plantaId) return;
    return escucharPersonas(usuario.plantaId, setPersonas);
  }, [usuario?.plantaId]);

  if (!usuario?.plantaId) return null;

  return (
    <View>
      <EncabezadoSeccion
        titulo="Personas y áreas"
        detalle={`${personas.length} persona${personas.length === 1 ? "" : "s"} en ${areas.length} área${
          areas.length === 1 ? "" : "s"
        }. Se suman cuando se unen a su área con el código.`}
      />
      <View className={dosColumnas ? "flex-row items-start" : ""}>
        <View className={dosColumnas ? "flex-1 min-w-0 mr-7" : "mb-6"}>
          <TablaPersonas personas={personas} areas={areas} />
        </View>
        <View className={dosColumnas ? "w-[380px]" : ""}>
          <Validadores personas={personas} />
          <TablaAreas plantaId={usuario.plantaId} areas={areas} personas={personas} />
        </View>
      </View>
    </View>
  );
}

const ETIQUETA_ROL: Record<Usuario["rol"], { texto: string; tono: Tono }> = {
  colaborador: { texto: "Colaborador", tono: "gris" },
  validador: { texto: "Validador", tono: "azul" },
  administrador: { texto: "Administrador", tono: "vino" },
};

/** Colores de los círculos con iniciales, para distinguir filas de un vistazo. */
const AVATARES = [
  { fondo: "bg-oliva-claro", texto: "text-oliva-oscuro" },
  { fondo: "bg-ambar-claro", texto: "text-ambar-oscuro" },
  { fondo: "bg-[#EFE3EA]", texto: "text-[#5A2A4A]" },
  { fondo: "bg-[#DDEDEC]", texto: "text-[#1F5652]" },
  { fondo: "bg-azulado-claro", texto: "text-azulado-oscuro" },
];

/** Quién valida hoy los depósitos de la planta. */
function Validadores({ personas }: { personas: Usuario[] }) {
  const validadores = personas.filter((p) => p.rol === "validador");
  return (
    <View className="bg-vino rounded-[20px] px-5 py-4 mb-5">
      <Titulo className="text-vino-texto text-[22px]">
        {validadores.length > 1 ? "Validadores de ronda" : "Validador de ronda"}
      </Titulo>
      {validadores.length === 0 ? (
        <Texto className="text-vino-nav text-[13px] mt-2 leading-[19px]">
          Todavía no hay validador: nadie revisa los depósitos en el punto limpio. Nómbralo en la tabla
          de personas.
        </Texto>
      ) : (
        validadores.map((v) => (
          <View key={v.id} className="flex-row items-center mt-3">
            <View className="w-11 h-11 rounded-full bg-oliva-hoja items-center justify-center mr-3">
              <Texto className="text-[#1D3314] font-bold">{iniciales(v.nombre)}</Texto>
            </View>
            <View className="flex-1 min-w-0">
              <Texto className="text-vino-texto text-base font-bold" numberOfLines={1}>
                {v.nombre}
              </Texto>
              <Texto className="text-vino-suave text-[13px]" numberOfLines={1}>
                {v.areaNombre ?? "Sin área"}
              </Texto>
            </View>
          </View>
        ))
      )}
      <Texto className="text-vino-nav text-[13px] mt-3 pt-3 border-t border-vino-linea leading-[19px]">
        Nombra a quien ya recorre la planta. Puedes nombrar a una segunda persona como suplente para los
        días en que el titular no está.
      </Texto>
    </View>
  );
}

/**
 * Las personas de la planta: buscar, filtrar por área, cambiarlas de área y
 * nombrar al validador.
 */
function TablaPersonas({ personas, areas }: { personas: Usuario[]; areas: Area[] }) {
  const { registros } = useEcoTrack();
  const [busqueda, setBusqueda] = useState("");
  const [areaFiltro, setAreaFiltro] = useState<string | null>(null);
  // Persona a la que se le está eligiendo un área nueva.
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const filas = useMemo(
    () => filasPersonas(personas, registros, { busqueda, areaId: areaFiltro }),
    [personas, registros, busqueda, areaFiltro]
  );

  async function ejecutar(accion: () => Promise<void>, alFallar: string) {
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      avisar(alFallar, textoDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  function mover(persona: Usuario, area: Area) {
    return ejecutar(async () => {
      await cambiarArea(persona, area);
      setMoviendo(null);
    }, "No se pudo cambiar de área");
  }

  async function alternarValidador(persona: Usuario) {
    const nombrar = persona.rol === "colaborador";
    const acepta = await confirmar(
      nombrar ? "Nombrar validador" : "Devolver a colaborador",
      nombrar
        ? `${persona.nombre} verá la vista de validación en vez de la de colaborador y podrá validar los depósitos de toda la planta. Sigue en ${persona.areaNombre ?? "su área"}.`
        : `${persona.nombre} vuelve a la vista de colaborador y deja de validar depósitos.`,
      nombrar ? "Nombrar" : "Devolver"
    );
    if (!acepta) return;
    await ejecutar(
      () => cambiarRol(persona, nombrar ? "validador" : "colaborador"),
      "No se pudo cambiar el rol"
    );
  }

  return (
    <Bloque>
      <Texto className="text-tinta-media text-[13px] font-semibold mb-1.5">Buscar</Texto>
      <View className="flex-row items-center h-11 px-3.5 bg-piedra-campo border border-piedra-control rounded-[10px] mb-3">
        <Icono nombre="buscar" tamano={18} color="#6E686C" />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Nombre de la persona"
          placeholderTextColor="#8B8589"
          accessibilityLabel="Buscar por nombre"
          className="flex-1 ml-2 text-tinta text-sm h-full"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        />
      </View>
      <Pildoras
        opciones={[{ valor: null, etiqueta: "Todas las áreas" }, ...areas.map((a) => ({ valor: a.id, etiqueta: a.nombre }))]}
        valor={areaFiltro}
        alCambiar={setAreaFiltro}
      />

      <View className="flex-row border-b-[1.5px] border-vino pb-2 mt-2">
        <Texto className="flex-1 text-tinta-media text-[13px] font-semibold">Persona</Texto>
        <Texto className="w-40 text-tinta-media text-[13px] font-semibold">Área</Texto>
        <Texto className="w-32 text-tinta-media text-[13px] font-semibold">Rol</Texto>
        <Texto className="w-28 text-tinta-media text-[13px] font-semibold">Último depósito</Texto>
        <View className="w-44" />
      </View>

      {filas.length === 0 ? (
        <Texto className="text-tinta-suave text-sm py-4">
          {personas.length === 0
            ? "Todavía no hay personas en la planta. Se suman cuando se unen a un área con su código."
            : "Nadie coincide con la búsqueda."}
        </Texto>
      ) : null}

      {filas.map(({ persona, ultimoDeposito }, i) => {
        const rol = ETIQUETA_ROL[persona.rol];
        const avatar = AVATARES[i % AVATARES.length];
        const gestionable = persona.rol !== "administrador";
        return (
          <View key={persona.id} className="border-b border-piedra-linea py-2.5">
            <View className="flex-row items-center">
              <View className="flex-1 min-w-0 flex-row items-center pr-2">
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 ${avatar.fondo}`}>
                  <Texto className={`text-xs font-bold ${avatar.texto}`}>{iniciales(persona.nombre || "?")}</Texto>
                </View>
                <View className="flex-1 min-w-0">
                  <Texto className="text-tinta text-sm font-bold" numberOfLines={1}>
                    {persona.nombre || "Sin nombre"}
                  </Texto>
                  <Texto className="text-tinta-suave text-xs" numberOfLines={1}>
                    {persona.email}
                  </Texto>
                </View>
              </View>
              <Texto className="w-40 text-tinta text-[13px] pr-2" numberOfLines={1}>
                {persona.areaNombre ?? "—"}
              </Texto>
              <View className="w-32 items-start">
                <Insignia texto={rol.texto} tono={rol.tono} />
              </View>
              <Texto className="w-28 text-tinta-media text-[13px]">
                {ultimoDeposito ? fechaCorta(ultimoDeposito) : "Nunca"}
              </Texto>
              <View className="w-44 items-end">
                {gestionable ? (
                  <>
                    <Enlace
                      texto={persona.rol === "validador" ? "Devolver a colaborador" : "Nombrar validador"}
                      tono="azul"
                      deshabilitado={ocupado}
                      alPresionar={() => alternarValidador(persona)}
                    />
                    <Enlace
                      texto="Cambiar de área"
                      deshabilitado={ocupado}
                      alPresionar={() => setMoviendo(moviendo === persona.id ? null : persona.id)}
                    />
                  </>
                ) : null}
              </View>
            </View>

            {moviendo === persona.id ? (
              <View className="bg-piedra rounded-xl px-3 pt-3 pb-1 mt-2">
                <Texto className="text-tinta-media text-xs mb-2">Mover a:</Texto>
                <Pildoras
                  opciones={areas.filter((a) => a.id !== persona.areaId).map((a) => ({ valor: a.id, etiqueta: a.nombre }))}
                  valor={null as string | null}
                  alCambiar={(id) => {
                    const area = areas.find((a) => a.id === id);
                    if (area) mover(persona, area);
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </Bloque>
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
    <Bloque>
      <View className="flex-row items-center justify-between">
        <Titulo className="text-[22px]">Áreas</Titulo>
        {editando === null ? (
          <BotonPanel titulo="Nueva área" variante="suave" compacto onPress={() => setEditando("nueva")} />
        ) : null}
      </View>
      <Texto className="text-tinta-suave text-xs mt-1 mb-2 leading-[17px]">
        Cada área tiene un código para que su gente se una. La dotación es cuántas personas trabajan en
        ella: con ella se calcula la participación.
      </Texto>

      {areas.length === 0 && editando !== "nueva" ? (
        <Texto className="text-tinta-suave text-sm py-3">
          Todavía no hay áreas. Crea una por cada sector de la planta que compita en el ranking.
        </Texto>
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
          <View key={a.id} className="flex-row items-center py-2 border-t border-piedra-linea">
            <View className="flex-1 min-w-0 pr-2">
              <Texto className="text-tinta text-[13px] font-semibold" numberOfLines={1}>
                {a.nombre}
              </Texto>
              <Texto className="text-tinta-suave text-xs">
                {registradas[a.id] ?? 0} de {a.dotacion} registradas
              </Texto>
            </View>
            <View className="bg-piedra rounded-md px-2 py-1 mr-3">
              <Texto className="text-vino text-xs font-bold tracking-widest">{a.codigo}</Texto>
            </View>
            {editando === null ? <Enlace texto="Editar" alPresionar={() => setEditando(a.id)} /> : null}
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
    </Bloque>
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
    <View className="bg-piedra rounded-2xl p-4 my-3">
      <Texto className="text-tinta text-[15px] font-bold mb-3">{area ? `Editar ${area.nombre}` : "Nueva área"}</Texto>
      <CampoPanel
        etiqueta="Nombre"
        placeholder="Por ejemplo, Embotellado"
        value={nombre}
        onChangeText={setNombre}
        maxLength={60}
      />
      <CampoPanel
        etiqueta="Dotación (personas)"
        placeholder="20"
        keyboardType="number-pad"
        value={dotacion}
        onChangeText={(t) => setDotacion(t.replace(/[^0-9]/g, ""))}
      />
      {area ? (
        <View className="mb-3">
          <View className="flex-row items-center">
            <Texto className="text-tinta-media text-[13px] mr-3">
              Código: <Texto className="text-vino font-bold tracking-widest">{codigo}</Texto>
            </Texto>
            <Enlace
              texto="Generar uno nuevo"
              alPresionar={() => setCodigo(generarCodigoArea(nombre || area.nombre, [...otrosCodigos, codigo]))}
            />
          </View>
          <Texto className="text-tinta-suave text-xs mt-1">
            Sirve si el código se filtró; las personas que ya están en el área no se mueven.
          </Texto>
        </View>
      ) : (
        <Texto className="text-tinta-suave text-xs mb-3">
          El código para unirse se genera al guardar, con las letras del nombre y cuatro cifras al azar.
        </Texto>
      )}
      <View className="flex-row">
        <BotonPanel titulo="Guardar" compacto cargando={guardando} onPress={guardar} className="mr-2" />
        <BotonPanel titulo="Cancelar" variante="secundario" compacto onPress={alTerminar} />
      </View>
    </View>
  );
}
