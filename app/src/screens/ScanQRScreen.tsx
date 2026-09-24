import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Navegacion } from "../../App";
import { MATERIALES, useEcoTrack, type Material, type Registro } from "../state/EcoTrack";
import { avisar, textoDeError } from "../lib/dialogos";
import { formatKg } from "../lib/formato";
import { misionSemanal as calcularMision, type MisionSistema } from "../lib/misionesSistema";
import { interpretarContenedor } from "../lib/qr";
import { Boton, CadenaVerificacion } from "../components/ui";
import EscanerQR from "../components/EscanerQR";

type Paso = "escaneando" | "material" | "peso" | "listo";

const PESOS_SUGERIDOS = [0.5, 1, 1.5, 2, 3, 4];

export default function ScanQRScreen({ nav }: { nav: Navegacion }) {
  const { usuario, crearRegistro, misRegistros, misionSemanal } = useEcoTrack();
  const [paso, setPaso] = useState<Paso>("escaneando");
  const [material, setMaterial] = useState<Material | null>(null);
  const [kg, setKg] = useState<number>(1);
  const [segundos, setSegundos] = useState(0);

  const [guardando, setGuardando] = useState(false);
  /** La misión semanal, si este depósito fue justo el que la completó. */
  const [misionCumplida, setMisionCumplida] = useState<MisionSistema | null>(null);

  // Contenedor leído del QR (o escrito a mano). Se valida contra la torre del
  // usuario antes de avanzar: no se puede depositar en el contenedor de otra torre.
  const [contenedor, setContenedor] = useState("");
  const [codigoManual, setCodigoManual] = useState("");
  const [errorLectura, setErrorLectura] = useState<string | null>(null);

  function procesarCodigo(texto: string) {
    const lectura = interpretarContenedor(texto, usuario?.torreId ?? null);
    if (!lectura.ok) {
      setErrorLectura(lectura.error);
      return;
    }
    setErrorLectura(null);
    setContenedor(lectura.contenedor);
    setPaso((actual) => (actual === "escaneando" ? "material" : actual));
  }

  useEffect(() => {
    if (paso === "listo") return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paso]);

  async function confirmar() {
    if (!material) return;
    setGuardando(true);
    try {
      await crearRegistro(material, kg, contenedor);
      // Se calcula con el depósito recién creado agregado a mano, sin esperar a
      // que Firestore lo devuelva en la próxima lectura en vivo.
      if (!misionSemanal.completada) {
        const nuevo = {
          creadoEn: Date.now(),
          material,
          kgDeclarado: kg,
          kgConfirmado: null,
          estado: "pendiente",
        } as Registro;
        const despues = calcularMision([...misRegistros, nuevo]);
        if (despues.completada) setMisionCumplida(despues);
      }
      setPaso("listo");
    } catch (e) {
      avisar("No se pudo registrar", textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
      <View className="px-6 pb-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={nav.volver}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text className="text-white text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-base">Registrar reciclaje</Text>
        <View className="w-8 items-end">
          {paso !== "listo" && (
            <Text className="text-gray-400 text-xs">{segundos}s</Text>
          )}
        </View>
      </View>

      {paso === "escaneando" && (
        <View className="flex-1 items-center justify-center px-6">
          <View className="border-2 border-green-500 rounded-[28px] p-1 mb-6">
            <EscanerQR alLeer={procesarCodigo} />
          </View>
          <Text className="text-white text-base font-medium mb-1">Escanea el código QR</Text>
          <Text className="text-gray-400 text-sm text-center mb-4">
            Apunta la cámara al código del contenedor de tu torre
          </Text>

          {errorLectura ? (
            <View className="bg-red-500/15 border border-red-400/40 rounded-xl px-4 py-3 mb-4 w-full">
              <Text className="text-red-300 text-xs text-center">{errorLectura}</Text>
            </View>
          ) : null}

          <Text className="text-gray-500 text-xs mb-2">¿No lee? Escribe el código del contenedor</Text>
          <View className="flex-row w-full">
            <TextInput
              value={codigoManual}
              onChangeText={setCodigoManual}
              onSubmitEditing={() => procesarCodigo(codigoManual)}
              placeholder="T-A-01"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Código del contenedor"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center tracking-widest mr-2"
            />
            <TouchableOpacity
              onPress={() => procesarCodigo(codigoManual)}
              accessibilityRole="button"
              className="bg-green-600 rounded-xl px-5 items-center justify-center"
            >
              <Text className="text-white font-semibold">Usar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {paso === "material" && (
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
          <View className="items-center mb-6">
            <View className="bg-green-100 rounded-full px-4 py-1 mb-3">
              <Text className="text-green-700 text-xs font-medium">
                ✓ Código detectado · Contenedor {contenedor}
              </Text>
            </View>
            <Text className="text-gray-800 text-xl font-bold">¿Qué material depositaste?</Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {MATERIALES.map((m) => (
              <TouchableOpacity
                key={m.nombre}
                onPress={() => {
                  setMaterial(m.nombre);
                  setPaso("peso");
                }}
                accessibilityRole="button"
                className="w-[48%] bg-gray-50 border border-gray-200 rounded-2xl py-6 items-center mb-4"
              >
                <Text className="text-4xl mb-2">{m.emoji}</Text>
                <Text className="text-gray-700 font-medium text-sm">{m.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {paso === "peso" && (
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
          <View className="items-center mb-6">
            <View className="bg-green-100 rounded-full px-4 py-1 mb-3">
              <Text className="text-green-700 text-xs font-medium">{material}</Text>
            </View>
            <Text className="text-gray-800 text-xl font-bold">¿Cuánto pesa aproximadamente?</Text>
            <Text className="text-gray-500 text-sm mt-1 text-center">
              El administrador confirmará el peso al validar
            </Text>
          </View>

          <View className="flex-row flex-wrap justify-between mb-6">
            {PESOS_SUGERIDOS.map((valor) => {
              const activo = valor === kg;
              return (
                <TouchableOpacity
                  key={valor}
                  onPress={() => setKg(valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  className={`w-[31%] rounded-2xl py-5 items-center mb-3 border ${
                    activo ? "bg-green-700 border-green-700" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-semibold ${activo ? "text-white" : "text-gray-700"}`}
                  >
                    {formatKg(valor)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Boton
            titulo={
              guardando ? "Guardando..." : `Registrar ${formatKg(kg)} de ${material}`
            }
            cargando={guardando}
            onPress={confirmar}
          />
          <TouchableOpacity
            onPress={() => setPaso("material")}
            accessibilityRole="button"
            className="py-4 items-center"
          >
            <Text className="text-gray-500">Cambiar material</Text>
          </TouchableOpacity>
        </View>
      )}

      {paso === "listo" && (
        <View className="flex-1 bg-white rounded-t-3xl px-6 items-center justify-center">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-5">
            <Text className="text-4xl">✅</Text>
          </View>
          <Text className="text-gray-800 text-xl font-bold mb-1">¡Registro enviado!</Text>
          <Text className="text-gray-500 text-sm text-center mb-1">
            {material} · {formatKg(kg)} · Contenedor {contenedor}
          </Text>
          <Text className="text-gray-400 text-xs text-center mb-8">
            Registrado en {segundos} segundos. Tu depósito ya está en la cola del administrador.
          </Text>

          {misionCumplida ? (
            <View
              accessible
              accessibilityLabel={`Misión de la semana cumplida: ${misionCumplida.titulo}. Ganaste ${misionCumplida.puntos} EcoPuntos.`}
              className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 items-center"
            >
              <Text className="text-amber-800 font-bold">🎉 ¡Misión de la semana cumplida!</Text>
              <Text className="text-amber-700 text-xs mt-1 text-center">
                {misionCumplida.titulo} · +{misionCumplida.puntos} EcoPuntos
              </Text>
            </View>
          ) : null}

          <View className="w-full bg-gray-50 rounded-2xl p-4 mb-8">
            <CadenaVerificacion estado="pendiente" />
          </View>

          <Boton titulo="Volver al inicio" onPress={nav.volver} className="px-8 w-full" />
        </View>
      )}
    </SafeAreaView>
  );
}
