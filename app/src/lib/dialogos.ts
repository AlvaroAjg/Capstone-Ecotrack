import { Alert, Platform } from "react-native";
import { mensajeError } from "./errores";

/**
 * Diálogos que funcionan en el teléfono y en la web instalada.
 *
 * `Alert.alert` de React Native no hace nada en la web (react-native-web lo deja
 * como función vacía), así que un mensaje de error o una confirmación
 * desaparecían sin que el usuario se enterara. En web los dibuja
 * components/Dialogos.tsx dentro de la app: los del navegador muestran la
 * dirección del sitio como título y siempre dicen "Aceptar", aunque la acción
 * sea retirar o quitar. Si ese componente no está montado, se usan los del
 * navegador, que también funcionan dentro de una PWA en iOS.
 */

export interface Dialogo {
  titulo: string;
  mensaje: string;
  /** Texto del botón que acepta; sin él es un aviso con un solo botón. */
  textoConfirmar?: string;
  responder: (acepta: boolean) => void;
}

let mostrarEnLaApp: ((dialogo: Dialogo) => void) | null = null;

/** Lo llama components/Dialogos.tsx al montarse, y con null al desmontarse. */
export function registrarDialogos(mostrar: ((dialogo: Dialogo) => void) | null): void {
  mostrarEnLaApp = mostrar;
}

export function avisar(titulo: string, mensaje: string): void {
  if (Platform.OS === "web") {
    if (mostrarEnLaApp) mostrarEnLaApp({ titulo, mensaje, responder: () => undefined });
    else window.alert(`${titulo}\n\n${mensaje}`);
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
    const mostrar = mostrarEnLaApp;
    if (mostrar) return new Promise((responder) => mostrar({ titulo, mensaje, textoConfirmar, responder }));
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

/**
 * Texto legible de un error cualquiera, sin el prefijo "Error: ". Los de
 * Firebase llegaban en inglés ("Missing or insufficient permissions"): se
 * traducen con la misma tabla que el login.
 */
export function textoDeError(error: unknown): string {
  return mensajeError(error);
}
