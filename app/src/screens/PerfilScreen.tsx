import React, { useState } from "react";
import { Text, View } from "react-native";
import { Navegacion } from "../../App";
import { useEcoTrack, type Rol } from "../state/EcoTrack";
import { mensajeError, tieneContrasena } from "../services/auth";
import {
  etiquetaDepto,
  normalizarNombre,
  numeroDepto,
  validarContrasenaNueva,
  validarDepto,
  validarNombre,
} from "../lib/perfil";
import { Aviso, Boton, Campo, Cuerpo, Encabezado, Seccion, Tarjeta, TituloEncabezado } from "../components/ui";

const ETIQUETA_ROL: Record<Rol, string> = {
  residente: "🏠 Residente",
  administrador: "🛡️ Administrador",
  gestor: "🚛 Gestor de reciclaje",
};

interface Mensaje {
  tono: "error" | "info";
  texto: string;
}

/** Datos que se muestran pero no se editan desde aquí. */
function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="mb-3">
      <Text className="text-gray-500 text-xs mb-1 ml-1">{etiqueta}</Text>
      <View className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-100">
        <Text className="text-gray-600" numberOfLines={1}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

/**
 * "Mi cuenta": se abre al tocar el avatar en cualquiera de los tres paneles.
 * Permite editar nombre y departamento, cambiar la contraseña y cerrar sesión.
 * El correo, el rol y la torre solo se muestran: el rol lo protegen las reglas
 * de Firestore y un usuario pertenece a una única torre a la vez.
 */
export default function PerfilScreen({ nav }: { nav: Navegacion }) {
  const { usuario, miTorre, actualizarPerfil, cambiarContrasena, cerrarSesion } = useEcoTrack();

  const esResidente = usuario?.rol === "residente";
  const tono = usuario?.rol === "residente" ? "verde" : "oscuro";

  // --- Datos personales
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [depto, setDepto] = useState(numeroDepto(usuario?.depto ?? ""));
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorDepto, setErrorDepto] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const hayCambios =
    normalizarNombre(nombre) !== (usuario?.nombre ?? "") ||
    (esResidente && etiquetaDepto(depto) !== (usuario?.depto ?? ""));

  async function guardar() {
    const eNombre = validarNombre(nombre);
    const eDepto = esResidente ? validarDepto(depto) : undefined;
    setErrorNombre(eNombre);
    setErrorDepto(eDepto);
    setMensaje(null);
    if (eNombre || eDepto) return;

    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre: normalizarNombre(nombre),
        depto: esResidente ? etiquetaDepto(depto) : undefined,
      });
      setNombre(normalizarNombre(nombre));
      if (esResidente) setDepto(numeroDepto(etiquetaDepto(depto)));
      setMensaje({ tono: "info", texto: "Cambios guardados." });
    } catch (e) {
      setMensaje({ tono: "error", texto: mensajeError(e) });
    } finally {
      setGuardando(false);
    }
  }

  // --- Contraseña
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveRepetida, setClaveRepetida] = useState("");
  const [errorClave, setErrorClave] = useState<string | undefined>();
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [mensajeClave, setMensajeClave] = useState<string | null>(null);

  function cerrarFormularioClave() {
    setCambiandoClave(false);
    setClaveActual("");
    setClaveNueva("");
    setClaveRepetida("");
    setErrorClave(undefined);
  }

  async function guardarClave() {
    const error = validarContrasenaNueva(claveActual, claveNueva, claveRepetida);
    setErrorClave(error);
    setMensajeClave(null);
    if (error) return;

    setGuardandoClave(true);
    try {
      await cambiarContrasena(claveActual, claveNueva);
      cerrarFormularioClave();
      setMensajeClave("Contraseña actualizada.");
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? "";
      setErrorClave(
        codigo === "auth/invalid-credential" || codigo === "auth/wrong-password"
          ? "La contraseña actual no es correcta."
          : mensajeError(e)
      );
    } finally {
      setGuardandoClave(false);
    }
  }

  if (!usuario) return null;

  return (
    <Cuerpo>
      <Encabezado tono={tono}>
        <TituloEncabezado titulo="Mi cuenta" alVolver={nav.volver} tono={tono} />
        <View className="items-center mt-6">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center ${
              tono === "verde" ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            <Text className="text-white font-bold text-3xl">
              {(usuario.nombre.trim().charAt(0) || "?").toUpperCase()}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold mt-3" numberOfLines={1}>
            {usuario.nombre}
          </Text>
          <Text className={`${tono === "verde" ? "text-green-100" : "text-gray-300"} text-sm mt-1`}>
            {ETIQUETA_ROL[usuario.rol]}
          </Text>
        </View>
      </Encabezado>

      <Seccion titulo="Información personal">
        <Tarjeta>
          {mensaje ? (
            <View className="mb-4">
              <Aviso tono={mensaje.tono} texto={mensaje.texto} />
            </View>
          ) : null}

          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChangeText={setNombre}
            onFocus={() => {
              setErrorNombre(undefined);
              setMensaje(null);
            }}
            error={errorNombre}
            autoCapitalize="words"
            maxLength={60}
          />

          {esResidente ? (
            <Campo
              etiqueta="Departamento"
              value={depto}
              onChangeText={setDepto}
              onFocus={() => {
                setErrorDepto(undefined);
                setMensaje(null);
              }}
              error={errorDepto}
              autoCapitalize="characters"
              maxLength={6}
              placeholder="305"
            />
          ) : null}

          <FilaDato etiqueta="Correo electrónico" valor={usuario.email} />
          {/* El gestor es externo al condominio: no pertenece a ninguna torre. */}
          {usuario.rol !== "gestor" ? (
            <FilaDato
              etiqueta="Torre"
              valor={miTorre ? `${miTorre.nombre} · ${miTorre.condominio}` : "Sin torre asignada"}
            />
          ) : null}

          <Text className="text-gray-400 text-[11px] mb-4">
            {usuario.rol === "gestor"
              ? "El correo y el rol no se pueden editar desde aquí."
              : "El correo, el rol y la torre no se pueden editar desde aquí. Solo puedes pertenecer a una torre a la vez."}
          </Text>

          <Boton
            titulo={guardando ? "Guardando..." : "Guardar cambios"}
            cargando={guardando}
            deshabilitado={!hayCambios}
            onPress={guardar}
            className="py-3"
          />
        </Tarjeta>
      </Seccion>

      {/* Quien entra con Google no tiene contraseña de EcoTrack: la maneja Google. */}
      {!tieneContrasena() ? (
        <Seccion titulo="Seguridad">
          <Tarjeta>
            <Text className="text-gray-500 text-sm">
              Entras con tu cuenta de Google. La contraseña y la seguridad se
              administran desde Google.
            </Text>
          </Tarjeta>
        </Seccion>
      ) : (
        <Seccion titulo="Seguridad">
          <Tarjeta>
            {mensajeClave ? (
              <View className="mb-4">
                <Aviso tono="info" texto={mensajeClave} />
              </View>
            ) : null}

            {!cambiandoClave ? (
              <Boton
                titulo="Cambiar contraseña"
                variante="secundario"
                onPress={() => {
                  setMensajeClave(null);
                  setCambiandoClave(true);
                }}
                className="py-3"
              />
            ) : (
              <>
                {errorClave ? (
                  <View className="mb-4">
                    <Aviso texto={errorClave} />
                  </View>
                ) : null}
                <Campo
                  etiqueta="Contraseña actual"
                  secureTextEntry
                  value={claveActual}
                  onChangeText={setClaveActual}
                  onFocus={() => setErrorClave(undefined)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Campo
                  etiqueta="Nueva contraseña"
                  secureTextEntry
                  value={claveNueva}
                  onChangeText={setClaveNueva}
                  onFocus={() => setErrorClave(undefined)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Mínimo 6 caracteres"
                />
                <Campo
                  etiqueta="Repite la nueva contraseña"
                  secureTextEntry
                  value={claveRepetida}
                  onChangeText={setClaveRepetida}
                  onFocus={() => setErrorClave(undefined)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Boton
                  titulo={guardandoClave ? "Actualizando..." : "Actualizar contraseña"}
                  cargando={guardandoClave}
                  onPress={guardarClave}
                  className="py-3 mb-2"
                />
                <Boton
                  titulo="Cancelar"
                  variante="secundario"
                  onPress={cerrarFormularioClave}
                  deshabilitado={guardandoClave}
                  className="py-3"
                />
              </>
            )}
          </Tarjeta>
        </Seccion>
      )}

      <View className="px-6 mt-6">
        <Boton titulo="Cerrar sesión" variante="peligro" onPress={() => cerrarSesion()} />
      </View>
    </Cuerpo>
  );
}
