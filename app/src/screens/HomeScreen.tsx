import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Navegacion } from "../../App";
import { kgEfectivo, useEcoTrack, type Registro } from "../state/EcoTrack";
import { formatKg, tiempoRelativo } from "../lib/formato";
import {
  ASPECTO_ESTADO,
  AvatarPerfil,
  Aviso,
  Barra,
  Boton,
  CadenaVerificacion,
  Cuerpo,
  Encabezado,
  FilaMetricas,
  Insignia,
  Seccion,
  Tarjeta,
  Vacio,
} from "../components/ui";

/** Cuántos depósitos se muestran antes de pedir "Ver anteriores". */
const REGISTROS_VISIBLES = 3;

export default function HomeScreen({ nav }: { nav: Navegacion }) {
  const {
    usuario,
    miTorre,
    errorDatos,
    misRegistros,
    misKgDelMes,
    misCertificados,
    miPosicionRanking,
    resumenTorre,
  } = useEcoTrack();

  const [verTodos, setVerTodos] = useState(false);

  const nombre = usuario?.nombre ?? "Residente";
  const resumen = resumenTorre(usuario?.torreId ?? null);

  // Por defecto solo los más recientes: el historial largo empujaba todo hacia abajo.
  const visibles = verTodos ? misRegistros : misRegistros.slice(0, REGISTROS_VISIBLES);
  const anteriores = misRegistros.length - REGISTROS_VISIBLES;

  return (
    <Cuerpo>
      <Encabezado>
        {/* Tocar el nombre o el avatar abre "Mi cuenta". */}
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => nav.ir("perfil")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Abrir mi cuenta"
            className="flex-1 pr-3"
          >
            <Text className="text-green-100 text-sm">Bienvenido de vuelta</Text>
            <Text className="text-white text-2xl font-bold mt-1" numberOfLines={1}>
              {nombre}
            </Text>
            <Text className="text-green-200 text-sm mt-1">
              {miTorre?.nombre ?? "Sin torre"} · {usuario?.depto ?? ""} ·{" "}
              {miTorre?.condominio ?? ""}
            </Text>
          </TouchableOpacity>
          <AvatarPerfil nombre={nombre} alPresionar={() => nav.ir("perfil")} />
        </View>
      </Encabezado>

      <FilaMetricas
        color="text-green-700"
        metricas={[
          { valor: formatKg(misKgDelMes), etiqueta: "Certificado este mes" },
          { valor: `${miPosicionRanking}°`, etiqueta: "Ranking de tu torre" },
          { valor: `${misCertificados.length}`, etiqueta: "Certificados" },
        ]}
      />

      {errorDatos ? (
        <View className="px-6 mt-6">
          <Aviso texto={errorDatos} />
        </View>
      ) : null}

      <View className="px-6 mt-6">
        <Boton
          titulo="Escanear código QR"
          icono="📷"
          onPress={() => nav.ir("escanear")}
          className="py-5"
        />
      </View>

      <View className="px-6 mt-4 flex-row">
        <TouchableOpacity
          onPress={() => nav.ir("ranking")}
          accessibilityRole="button"
          className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm mr-2"
        >
          <Text className="text-2xl mb-1">🏆</Text>
          <Text className="text-gray-700 text-xs font-medium">Ranking de torres</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            misCertificados[0] && nav.ir("certificado", { registroId: misCertificados[0].id })
          }
          disabled={misCertificados.length === 0}
          accessibilityRole="button"
          className={`flex-1 bg-white rounded-2xl p-4 items-center shadow-sm ml-2 ${
            misCertificados.length === 0 ? "opacity-40" : ""
          }`}
        >
          <Text className="text-2xl mb-1">📄</Text>
          <Text className="text-gray-700 text-xs font-medium">Último certificado</Text>
        </TouchableOpacity>
      </View>

      <Seccion titulo="Misión de la torre">
        <Tarjeta>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-800 font-medium flex-1 pr-2">
              Alcanzar {resumen.metaKg} kg como torre este mes
            </Text>
            <Text className="text-green-700 font-semibold text-sm">
              {resumen.avanceMeta}%
            </Text>
          </View>
          <Barra avance={resumen.avanceMeta} />
          <Text className="text-gray-400 text-xs mt-2">
            {formatKg(resumen.kgMes)} de {resumen.metaKg} kg ·{" "}
            {resumen.deptosActivos} de {resumen.deptosTotales} departamentos participando
          </Text>
        </Tarjeta>
      </Seccion>

      <Seccion
        titulo="Mi actividad"
        etiqueta={`${misRegistros.length} registro${misRegistros.length === 1 ? "" : "s"}`}
      >
        {misRegistros.length === 0 ? (
          <Vacio
            emoji="♻️"
            texto="Aún no registras reciclaje. Escanea el QR del contenedor para empezar."
          />
        ) : (
          <>
            {visibles.map((r) => (
              <TarjetaActividad
                key={r.id}
                registro={r}
                alAbrir={
                  r.estado === "certificado"
                    ? () => nav.ir("certificado", { registroId: r.id })
                    : undefined
                }
              />
            ))}
            {anteriores > 0 ? (
              <TouchableOpacity
                onPress={() => setVerTodos((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: verTodos }}
                className="py-3 items-center"
              >
                <Text className="text-green-700 text-sm font-medium">
                  {verTodos
                    ? "Ocultar los anteriores ▲"
                    : `Ver ${anteriores} anterior${anteriores === 1 ? "" : "es"} ▼`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </Seccion>
    </Cuerpo>
  );
}

function TarjetaActividad({
  registro,
  alAbrir,
}: {
  registro: Registro;
  alAbrir?: () => void;
}) {
  const aspecto = ASPECTO_ESTADO[registro.estado];
  const pesoCorregido =
    registro.kgConfirmado !== null &&
    Math.abs(registro.kgConfirmado - registro.kgDeclarado) > 0.01;

  const contenido = (
    <Tarjeta className="mb-3">
      {/* La insignia va bajo el texto y no a su lado: en pantallas angostas
          competía por el ancho y estrangulaba el título hasta una letra
          por línea. */}
      <View className="flex-row items-start mb-3">
        <View
          className={`w-10 h-10 ${aspecto.fondo} rounded-full items-center justify-center mr-3`}
        >
          <Text>{aspecto.emoji}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-gray-800 font-medium">
            {registro.material} · {formatKg(kgEfectivo(registro))}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            Contenedor {registro.contenedor} · {tiempoRelativo(registro.creadoEn)}
          </Text>
          {pesoCorregido ? (
            <Text className="text-amber-600 text-[10px] mt-1">
              Peso ajustado por el administrador (declaraste{" "}
              {formatKg(registro.kgDeclarado)})
            </Text>
          ) : null}
          <View className="flex-row mt-2">
            <Insignia estado={registro.estado} />
          </View>
        </View>
      </View>

      <CadenaVerificacion estado={registro.estado} />

      {registro.codigo ? (
        <Text className="text-green-700 text-xs font-medium mt-3">
          Código {registro.codigo} · toca para ver el certificado
        </Text>
      ) : null}
    </Tarjeta>
  );

  if (!alAbrir) return contenido;

  return (
    <TouchableOpacity onPress={alAbrir} activeOpacity={0.85} accessibilityRole="button">
      {contenido}
    </TouchableOpacity>
  );
}
