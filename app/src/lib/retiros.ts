// Cálculos de la sección Retiros del panel: leer el formulario del retiro y
// el historial del mes. Son funciones puras para poder probarlas; el lote que
// registra el retiro está en services/retiros.ts.

import { leerFechaTermino } from "./incentivo";
import type { Retiro } from "./tipos";

const DIA = 24 * 60 * 60 * 1000;

export interface DatosRetiroValidos {
  fecha: number;
  quienRetira: string;
  guia: string | null;
  pesoKg: number | null;
}

/**
 * Revisa el formulario del retiro con los mismos límites que la regla de
 * Firestore. La fecha puede ser anterior a hoy (se registra después de que se
 * llevaron el material), pero no futura. Si es hoy, vale la hora actual; si
 * es un día anterior, el final de ese día. El peso y la guía son opcionales:
 * sin peso, el retiro queda como estimado.
 */
export function validarRetiro(
  formulario: { fecha: string; quienRetira: string; guia: string; peso: string },
  contenedoresElegidos: number,
  ahora: number = Date.now()
): { ok: true; datos: DatosRetiroValidos } | { ok: false; error: string } {
  if (contenedoresElegidos === 0) {
    return { ok: false, error: "Elige al menos un contenedor con depósitos validados." };
  }
  const fin = leerFechaTermino(formulario.fecha);
  if (fin === null) return { ok: false, error: "Escribe la fecha del retiro como 06-10-2026." };
  if (fin - DIA + 1 > ahora) return { ok: false, error: "La fecha del retiro no puede ser futura." };

  const quienRetira = formulario.quienRetira.trim();
  if (!quienRetira || quienRetira.length > 80) {
    return {
      ok: false,
      error: "Escribe quién retiró el material (empresa o persona), en hasta 80 caracteres.",
    };
  }
  const guia = formulario.guia.trim();
  if (guia.length > 40) return { ok: false, error: "El N° de guía tiene hasta 40 caracteres." };

  const textoPeso = formulario.peso.trim().replace(",", ".");
  const pesoKg = textoPeso ? Number(textoPeso) : null;
  if (pesoKg !== null && !(pesoKg > 0)) {
    return { ok: false, error: "El peso informado es un número de kilos mayor que 0, o se deja vacío." };
  }

  return {
    ok: true,
    datos: { fecha: Math.min(fin, ahora), quienRetira, guia: guia || null, pesoKg },
  };
}

/**
 * Los retiros del mes de `ahora`, del más reciente al más antiguo. Un retiro
 * es «verificado» si quien retiró informó el peso, y «estimado» si solo se
 * conocen los kilos estimados por la talla de cada depósito.
 */
export function retirosDelMes(
  retiros: Retiro[],
  ahora: number = Date.now()
): (Retiro & { verificado: boolean })[] {
  const hoy = new Date(ahora);
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
  return retiros
    .filter((r) => r.fecha >= desde && r.fecha <= ahora)
    .sort((a, b) => b.fecha - a.fecha)
    .map((r) => ({ ...r, verificado: r.pesoKg !== null }));
}
