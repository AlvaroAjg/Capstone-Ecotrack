import { useCallback, useState } from "react";
import { useEcoTrack } from "../state/EcoTrack";
import { certificadoDelMes, etiquetaMes } from "./certificadoMensual";
import { descargarCertificado } from "./certificadoPdf";
import { avisar, textoDeError } from "./dialogos";

/**
 * Descarga el certificado de un mes. El certificado no es una pantalla: es un
 * PDF que se genera y se descarga (o se comparte, en el teléfono) de una vez.
 * Hay que llamar a `descargar` directo desde el toque del usuario, porque iOS
 * rechaza compartir si pasó demasiado tiempo desde el gesto.
 */
export function useDescargaCertificado() {
  const { misRegistros } = useEcoTrack();
  /** Mes que se está generando, para mostrar "Generando..." solo en ese botón. */
  const [generando, setGenerando] = useState<string | null>(null);

  const descargar = useCallback(
    async (mes: string) => {
      const certificado = certificadoDelMes(misRegistros, mes);
      if (!certificado) {
        avisar(
          "Todavía no hay certificado",
          `En ${etiquetaMes(mes)} aún no tienes depósitos certificados. Se completan cuando el gestor retira el contenedor.`
        );
        return;
      }
      setGenerando(mes);
      try {
        const resultado = await descargarCertificado(certificado);
        if (resultado === "descargado") {
          avisar(
            "Certificado descargado",
            "El PDF quedó guardado en la carpeta de descargas de tu dispositivo."
          );
        }
      } catch (e) {
        avisar("No se pudo generar el PDF", textoDeError(e));
      } finally {
        setGenerando(null);
      }
    },
    [misRegistros]
  );

  return { descargar, generando };
}
