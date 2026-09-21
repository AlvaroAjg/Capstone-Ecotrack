import type { Registro } from "./tipos";

/**
 * Versión para el teléfono nativo (Expo Go): el PDF se genera solo en la web
 * instalada (ver certificadoPdf.web.ts). Se declara igual la interfaz para que
 * las pantallas no dependan de la plataforma.
 */

export const certificadoPdfDisponible = false;

export type ResultadoDescarga = "compartido" | "descargado" | "cancelado";

export async function descargarCertificado(_registro: Registro): Promise<ResultadoDescarga> {
  throw new Error("La descarga del PDF está disponible en la versión web instalada de EcoTrack.");
}
