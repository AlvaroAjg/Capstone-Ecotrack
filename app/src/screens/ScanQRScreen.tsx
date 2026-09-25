import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Navegacion } from "../../App";
import {
  MATERIALES,
  TALLAS,
  kgEstimado,
  useEcoTrack,
  type Material,
  type Registro,
  type Talla,
} from "../state/EcoTrack";
import { avisar, textoDeError } from "../lib/dialogos";
import { formatKg, formatKgEstimado } from "../lib/formato";
import { misionSemanal as calcularMision, type MisionSistema } from "../lib/misionesSistema";
import { interpretarContenedor } from "../lib/qr";
import { Boton, CadenaVerificacion } from "../components/ui";
import EscanerQR from "../components/EscanerQR";

type Paso = "escaneando" | "material" | "talla" | "listo";

/** Ancho y alto del cuerpo de la bolsa dibujada: crece con la talla. */
const TAMANO_BOLSA: Record<Talla, { ancho: number; alto: number }> = {
  S: { ancho: 20, alto: 22 },
  M: { ancho: 25, alto: 28 },
  L: { ancho: 30, alto: 34 },
  XL: { ancho: 36, alto: 40 },
};

/**
 * Bolsa dibujada con formas simples (nudo arriba y cuerpo redondeado) con la
 * letra de la talla adentro. Reemplaza al emoji 🛍️, que se ve distinto en cada
 * teléfono y agrandado queda tosco.
 */
function BolsaTalla({ talla, activa }: { talla: Talla; activa: boolean }) {
  const { ancho, alto } = TAMANO_BOLSA[talla];
  const relleno = activa ? "#FFFFFF" : "#BBF7D0";
  // Borde y nudo en verde intenso: sin ellos la bolsa casi no se ve sobre el fondo gris.
  const trazo = activa ? "#FFFFFF" : "#22C55E";
  const texto = activa ? "#15803D" : "#166534";
  return (
    <View style={{ alignItems: "center" }}>
      {/* Nudo: dos orejitas sobre un cuello angosto */}
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: trazo, marginRight: 1, transform: [{ rotate: "-30deg" }] }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: trazo, marginLeft: 1, transform: [{ rotate: "30deg" }] }} />
      </View>
      <View style={{ width: ancho * 0.35, height: 3, backgroundColor: trazo, borderRadius: 1.5 }} />
      <View
        style={{
          width: ancho,
          height: alto,
          backgroundColor: relleno,
          borderWidth: 1.5,
          borderColor: trazo,
          borderTopLeftRadius: ancho * 0.25,
          borderTopRightRadius: ancho * 0.25,
          borderBottomLeftRadius: ancho * 0.4,
          borderBottomRightRadius: ancho * 0.4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: texto, fontWeight: "700", fontSize: talla === "S" ? 10 : 12 }}>
          {talla}
        </Text>
      </View>
    </View>
  );
}

export default function ScanQRScreen({ nav }: { nav: Navegacion }) {
  const { usuario, crearRegistro, misRegistros, misionSemanal } = useEcoTrack();
  const [paso, setPaso] = useState<Paso>("escaneando");
  const [material, setMaterial] = useState<Material | null>(null);
  const [talla, setTalla] = useState<Talla | null>(null);
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
    if (!material || !talla) return;
    setGuardando(true);
    try {
      await crearRegistro(material, talla, contenedor);
      // Se calcula con el depósito recién creado agregado a mano, sin esperar a
      // que Firestore lo devuelva en la próxima lectura en vivo.
      if (!misionSemanal.completada) {
        const nuevo = {
          creadoEn: Date.now(),
          material,
          talla,
          kgDeclarado: kgEstimado(material, talla),
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
                  setTalla(null);
                  setPaso("talla");
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

      {paso === "talla" && material && (
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
          <View className="items-center mb-6">
            <View className="bg-green-100 rounded-full px-4 py-1 mb-3">
              <Text className="text-green-700 text-xs font-medium">{material}</Text>
            </View>
            <Text className="text-gray-800 text-xl font-bold">¿De qué tamaño es la bolsa?</Text>
            <Text className="text-gray-500 text-sm mt-1 text-center">
              No hace falta pesarla: la app estima los kilos
            </Text>
          </View>

          {TALLAS.map((t) => {
            const activo = t.valor === talla;
            const kg = kgEstimado(material, t.valor);
            return (
              <TouchableOpacity
                key={t.valor}
                onPress={() => setTalla(t.valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={`Talla ${t.valor}: ${t.referencia}, aproximadamente ${formatKg(kg)}`}
                className={`flex-row items-center rounded-2xl px-4 py-3 mb-3 border ${
                  activo ? "bg-green-700 border-green-700" : "bg-gray-50 border-gray-200"
                }`}
              >
                <View className="w-12 h-14 items-center justify-end mr-3">
                  <BolsaTalla talla={t.valor} activa={activo} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className={`font-bold ${activo ? "text-white" : "text-gray-800"}`}>
                    Talla {t.valor}
                  </Text>
                  <Text className={`text-xs mt-0.5 ${activo ? "text-green-100" : "text-gray-500"}`}>
                    {t.referencia}
                  </Text>
                </View>
                <Text className={`text-xs font-medium ${activo ? "text-white" : "text-gray-400"}`}>
                  {formatKgEstimado(kg)}
                </Text>
              </TouchableOpacity>
            );
          })}

          <Boton
            titulo={
              guardando
                ? "Guardando..."
                : talla
                  ? `Registrar bolsa ${talla} de ${material}`
                  : "Elige el tamaño de la bolsa"
            }
            cargando={guardando}
            deshabilitado={!talla}
            onPress={confirmar}
            className="mt-2"
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
            {material && talla
              ? `${material} · Bolsa ${talla} · ${formatKgEstimado(kgEstimado(material, talla))} · Contenedor ${contenedor}`
              : `Contenedor ${contenedor}`}
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
