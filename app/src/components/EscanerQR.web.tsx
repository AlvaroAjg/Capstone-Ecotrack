import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import jsQR from "jsqr";

/**
 * Escáner de QR para la web instalada (PWA).
 *
 * Abre la cámara trasera con getUserMedia y decodifica cuadros con jsQR. No usa
 * `BarcodeDetector` porque Safari en iPhone no lo tiene. En iOS la cámara solo
 * está disponible en HTTPS, que es como se publica la app en Firebase Hosting.
 */

interface Props {
  /** Se llama con el texto de cada QR leído. La pantalla decide si es válido. */
  alLeer: (texto: string) => void;
}

type Estado = "iniciando" | "escaneando" | "error";

/** Ancho máximo al que se reduce cada cuadro antes de decodificar: más rápido y suficiente. */
const ANCHO_MAX = 640;
const PAUSA_ENTRE_CUADROS_MS = 120;
/** Un mismo QR no se vuelve a reportar antes de este tiempo. */
const REPETICION_MS = 2500;

function mensajeDeError(error: unknown): string {
  const nombre = (error as { name?: string })?.name;
  if (nombre === "NotAllowedError" || nombre === "SecurityError") {
    return "Permiso de cámara denegado. Actívalo en los ajustes del navegador o escribe el código a mano.";
  }
  if (nombre === "NotFoundError" || nombre === "OverconstrainedError") {
    return "No encontré una cámara en este dispositivo. Escribe el código a mano.";
  }
  if (nombre === "NotReadableError") {
    return "La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.";
  }
  return "No se pudo abrir la cámara. Escribe el código a mano.";
}

export default function EscanerQR({ alLeer }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const alLeerRef = useRef(alLeer);
  alLeerRef.current = alLeer;

  const [estado, setEstado] = useState<Estado>("iniciando");
  const [detalle, setDetalle] = useState<string>("");

  useEffect(() => {
    let detenido = false;
    let flujo: MediaStream | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let ultimo = { texto: "", momento: 0 };

    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });

    function fallar(mensaje: string) {
      if (detenido) return;
      setDetalle(mensaje);
      setEstado("error");
    }

    function leerCuadro() {
      if (detenido) return;
      const video = videoRef.current;

      if (video && ctx && video.readyState >= 2 && video.videoWidth > 0) {
        const escala = Math.min(1, ANCHO_MAX / video.videoWidth);
        const ancho = Math.round(video.videoWidth * escala);
        const alto = Math.round(video.videoHeight * escala);
        lienzo.width = ancho;
        lienzo.height = alto;
        ctx.drawImage(video, 0, 0, ancho, alto);

        const imagen = ctx.getImageData(0, 0, ancho, alto);
        const resultado = jsQR(imagen.data, ancho, alto, { inversionAttempts: "dontInvert" });

        if (resultado?.data) {
          const ahora = Date.now();
          if (resultado.data !== ultimo.texto || ahora - ultimo.momento > REPETICION_MS) {
            ultimo = { texto: resultado.data, momento: ahora };
            alLeerRef.current(resultado.data);
          }
        }
      }
      temporizador = setTimeout(leerCuadro, PAUSA_ENTRE_CUADROS_MS);
    }

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        fallar("Este navegador no permite usar la cámara (se necesita HTTPS). Escribe el código a mano.");
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (error) {
        fallar(mensajeDeError(error));
        return;
      }

      if (detenido) {
        flujo.getTracks().forEach((t) => t.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = flujo;
      try {
        await video.play();
      } catch (error) {
        fallar(mensajeDeError(error));
        return;
      }
      setEstado("escaneando");
      leerCuadro();
    }

    iniciar();

    return () => {
      detenido = true;
      if (temporizador) clearTimeout(temporizador);
      // Apagar la cámara al salir: si no, el indicador de cámara queda encendido.
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <View className="w-64 h-64 rounded-3xl overflow-hidden bg-black items-center justify-center">
      {/* playsInline y muted son obligatorios para que iOS reproduzca el video en la página. */}
      {React.createElement("video", {
        ref: videoRef,
        playsInline: true,
        muted: true,
        autoPlay: true,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: estado === "error" ? "none" : "block",
        },
      })}

      {estado === "escaneando" ? (
        <View
          pointerEvents="none"
          className="w-44 h-44 border-2 border-green-400 rounded-2xl"
          style={{ opacity: 0.9 }}
        />
      ) : null}

      {estado === "iniciando" ? (
        <Text className="text-gray-300 text-xs text-center px-6">Abriendo la cámara...</Text>
      ) : null}

      {estado === "error" ? (
        <Text className="text-amber-300 text-xs text-center px-5">{detalle}</Text>
      ) : null}
    </View>
  );
}
