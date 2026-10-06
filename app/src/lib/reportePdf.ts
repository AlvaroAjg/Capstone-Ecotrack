import type { ResultadoDescarga } from "./pdfComun";
import type { ReportePlanta } from "./reportePlanta";

/**
 * Versión para el teléfono nativo (Expo Go): el PDF se genera solo en la web
 * instalada (ver reportePdf.web.ts). Se declara igual la interfaz para que
 * las pantallas no dependan de la plataforma.
 */

export const reportePdfDisponible = false;

export type { ResultadoDescarga };

export async function descargarReporte(_reporte: ReportePlanta): Promise<ResultadoDescarga> {
  throw new Error("La descarga del PDF está disponible en la versión web instalada de RecyTrack.");
}
