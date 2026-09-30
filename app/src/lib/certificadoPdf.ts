import type { CertificadoMensual } from "./certificadoMensual";
import type { ResultadoDescarga } from "./pdfComun";

/**
 * Versión para el teléfono nativo (Expo Go): el PDF se genera solo en la web
 * instalada (ver certificadoPdf.web.ts). Se declara igual la interfaz para que
 * las pantallas no dependan de la plataforma.
 */

export const certificadoPdfDisponible = false;

export type { ResultadoDescarga };

export async function descargarCertificado(_certificado: CertificadoMensual): Promise<ResultadoDescarga> {
  throw new Error("La descarga del PDF está disponible en la versión web instalada de RecyTrack.");
}
