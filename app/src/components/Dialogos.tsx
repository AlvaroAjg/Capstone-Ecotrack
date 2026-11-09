import React, { useCallback, useEffect, useState } from "react";
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from "react-native";
import { registrarDialogos, type Dialogo } from "../lib/dialogos";

/**
 * Dibuja en la web los avisos y confirmaciones de lib/dialogos.ts, con el
 * título y el botón propios de cada acción ("Retirar", "Quitar") en vez de
 * los diálogos del navegador. Se monta una vez, en App.tsx. Si llegan dos
 * seguidos, se muestran en orden.
 */
export default function Dialogos() {
  const [cola, setCola] = useState<Dialogo[]>([]);
  const actual = cola[0] ?? null;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    registrarDialogos((dialogo) => setCola((c) => [...c, dialogo]));
    return () => registrarDialogos(null);
  }, []);

  // Se quita por identidad: si Escape y el botón llegan juntos, no se salta el
  // diálogo siguiente.
  const cerrar = useCallback(
    (acepta: boolean) => {
      if (!actual) return;
      actual.responder(acepta);
      setCola((c) => c.filter((d) => d !== actual));
    },
    [actual]
  );

  // Enter acepta y Escape cancela, como en los diálogos del navegador.
  useEffect(() => {
    if (!actual || Platform.OS !== "web") return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        cerrar(true);
      } else if (evento.key === "Escape") {
        cerrar(false);
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [actual, cerrar]);

  if (!actual) return null;
  const esConfirmacion = actual.textoConfirmar !== undefined;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => cerrar(false)}>
      <Pressable
        onPress={() => cerrar(false)}
        accessibilityLabel="Cerrar"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(34, 28, 32, 0.45)" }}
      >
        {/* Tocar la tarjeta no la cierra: solo el fondo. */}
        <Pressable
          onPress={() => undefined}
          accessibilityRole="alert"
          className="w-full max-w-[420px] bg-white rounded-2xl p-6"
        >
          <Text className="text-tinta text-lg font-bold mb-2">{actual.titulo}</Text>
          <Text className="text-tinta-media text-sm leading-5">{actual.mensaje}</Text>
          <View className="flex-row justify-end mt-6">
            {esConfirmacion ? (
              <TouchableOpacity
                onPress={() => cerrar(false)}
                accessibilityRole="button"
                className="h-11 px-5 rounded-[10px] items-center justify-center border border-piedra-control mr-2.5"
              >
                <Text className="text-tinta text-sm font-semibold">Cancelar</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => cerrar(true)}
              accessibilityRole="button"
              className="h-11 px-5 rounded-[10px] items-center justify-center bg-tinta"
            >
              <Text className="text-white text-sm font-semibold">
                {esConfirmacion ? actual.textoConfirmar : "Entendido"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
