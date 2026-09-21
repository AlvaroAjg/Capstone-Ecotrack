import { Alert, Platform } from "react-native";

/**
 * Diálogos que funcionan en el teléfono y en la web instalada.
 *
 * `Alert.alert` de React Native no hace nada en la web (react-native-web lo deja
 * como función vacía), así que un mensaje de error o una confirmación
 * desaparecían sin que el usuario se enterara. En web se usan los diálogos del
 * navegador, que también funcionan dentro de una PWA en iOS.
 */

export function avisar(titulo: string, mensaje: string): void {
  if (Platform.OS === "web") {
    window.alert(`${titulo}\n\n${mensaje}`);
    return;
  }
  Alert.alert(titulo, mensaje, [{ text: "Entendido" }]);
}

/** Pide confirmación. Resuelve `true` solo si el usuario acepta. */
export function confirmar(
  titulo: string,
  mensaje: string,
  textoConfirmar = "Aceptar"
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }
  return new Promise((resolver) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
        { text: textoConfirmar, onPress: () => resolver(true) },
      ],
      { cancelable: true, onDismiss: () => resolver(false) }
    );
  });
}

/** Texto legible de un error cualquiera, sin el prefijo "Error: ". */
export function textoDeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
