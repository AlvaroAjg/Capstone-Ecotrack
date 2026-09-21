import React, { useMemo } from "react";
import { View } from "react-native";
import { matrizQr } from "../lib/qr";

/** Zona de silencio alrededor del QR, en módulos (el estándar pide 4). */
const MARGEN = 4;

/**
 * Dibuja un código QR con Views. Se hace así, y no con un canvas o una imagen,
 * para que funcione igual en la web instalada y en el teléfono.
 */
export default function CodigoQR({ texto, tamano = 220 }: { texto: string; tamano?: number }) {
  const matriz = useMemo(() => matrizQr(texto), [texto]);
  const total = matriz.length + MARGEN * 2;
  const celda = Math.floor(tamano / total);
  const lado = celda * total;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Código QR: ${texto}`}
      style={{ width: lado, height: lado, backgroundColor: "#FFFFFF", padding: MARGEN * celda }}
    >
      {matriz.map((fila, i) => (
        <View key={i} style={{ flexDirection: "row", height: celda }}>
          {fila.map((oscuro, j) => (
            <View
              key={j}
              style={{ width: celda, height: celda, backgroundColor: oscuro ? "#000000" : "#FFFFFF" }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
