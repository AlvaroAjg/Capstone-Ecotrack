import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEcoTrack, type Rol } from "../state/EcoTrack";
import { mensajeError } from "../services/auth";
import { Aviso, Boton, Campo, Segmentado } from "../components/ui";

interface Errores {
  nombre?: string;
  email?: string;
  password?: string;
  codigo?: string;
}

/**
 * Roles que se pueden elegir al registrarse. Administrador queda afuera a
 * propósito: nadie se autoasigna ese rol. Se llega a él vinculándose a una
 * torre con el código de administrador (ver JoinTorreScreen), no desde aquí.
 * La regla de Firestore lo exige igual, así que esto es solo para no ofrecer
 * en la interfaz un camino que el servidor va a rechazar.
 */
const ROLES_PUBLICOS: { valor: Rol; etiqueta: string }[] = [
  { valor: "residente", etiqueta: "🏠 Residente" },
  { valor: "gestor", etiqueta: "🚛 Gestor" },
];

export default function RegisterScreen({ alVolver }: { alVolver: () => void }) {
  const { registrarCuenta } = useEcoTrack();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("residente");
  const [codigoGestor, setCodigoGestor] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleRegistrar() {
    const nuevosErrores: Errores = {};
    if (nombre.trim().length < 3) nuevosErrores.nombre = "Ingresa tu nombre completo";
    if (!email.includes("@")) nuevosErrores.email = "Ingresa un correo válido";
    if (password.length < 6) nuevosErrores.password = "Mínimo 6 caracteres";
    if (rol === "gestor" && !codigoGestor.trim()) {
      nuevosErrores.codigo = "Ingresa el código de gestor";
    }

    setErrores(nuevosErrores);
    setErrorGeneral(null);
    if (Object.keys(nuevosErrores).length > 0) return;

    setCargando(true);
    try {
      await registrarCuenta({
        nombre: nombre.trim(),
        email,
        password,
        rol,
        depto: rol === "gestor" ? "Gestor externo" : "",
        codigoRolUsado: rol === "gestor" ? codigoGestor.trim() : undefined,
      });
      // App.tsx detecta la sesión y lleva a vincular torre (o al panel del gestor).
    } catch (error) {
      const codigo = (error as { code?: string })?.code;
      setErrorGeneral(
        rol === "gestor" && codigo === "permission-denied"
          ? "Código de gestor incorrecto."
          : mensajeError(error)
      );
    } finally {
      setCargando(false);
    }
  }

  const limpiar = (campo: keyof Errores) => () =>
    setErrores((e) => ({ ...e, [campo]: undefined }));

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={alVolver}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="absolute top-4 left-0"
          >
            <Text className="text-green-700 text-2xl">←</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-green-700 mb-1">Crear cuenta</Text>
          <Text className="text-base text-gray-500 mb-6">Paso 1 de 2 · datos personales</Text>

          {errorGeneral ? (
            <View className="mb-4">
              <Aviso texto={errorGeneral} />
            </View>
          ) : null}

          <Text className="text-gray-500 text-xs mb-2 ml-1">Tipo de cuenta</Text>
          <View className="mb-2">
            <Segmentado
              valor={rol}
              alCambiar={setRol}
              opciones={ROLES_PUBLICOS.map((r) => ({ valor: r.valor, etiqueta: r.etiqueta }))}
            />
          </View>
          <Text className="text-gray-400 text-[11px] mb-5 ml-1">
            {rol === "gestor"
              ? "Necesitas el código de gestor que te entrega el equipo de EcoTrack."
              : "¿Eres administrador de una torre? Te vinculas como tal en el siguiente paso, con tu código."}
          </Text>

          <Campo
            etiqueta="Nombre completo"
            placeholder="Nombre y apellido"
            value={nombre}
            onChangeText={setNombre}
            onFocus={limpiar("nombre")}
            error={errores.nombre}
          />
          <Campo
            etiqueta="Correo electrónico"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            onFocus={limpiar("email")}
            error={errores.email}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Campo
            etiqueta="Contraseña"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={limpiar("password")}
            error={errores.password}
          />

          {rol === "gestor" ? (
            <Campo
              etiqueta="Código de gestor"
              placeholder="Te lo entrega el equipo de EcoTrack"
              autoCapitalize="characters"
              autoCorrect={false}
              value={codigoGestor}
              onChangeText={setCodigoGestor}
              onFocus={limpiar("codigo")}
              error={errores.codigo}
            />
          ) : null}

          <Boton
            titulo={cargando ? "Creando cuenta..." : "Continuar"}
            cargando={cargando}
            onPress={handleRegistrar}
            className="mt-3 mb-4"
          />

          <TouchableOpacity onPress={alVolver} accessibilityRole="button">
            <Text className="text-center text-green-700">
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
