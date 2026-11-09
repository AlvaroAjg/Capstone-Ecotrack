// Cálculos de la sección Retiros del panel: leer el formulario del retiro y
// el historial del mes. Son funciones puras para poder probarlas; el lote que
// registra el retiro está en services/retiros.ts.

import { leerFechaTermino } from "./incentivo";
import { MATERIALES, type Contenedor, type Registro, type Retiro } from "./tipos";

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

/** "A", "A y B", "A, B y C". */
function enLista(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export interface DetalleRetiro {
  /** "Casino y Bodega", o "Los 4 puntos" si pasó por todos los de la planta. */
  puntos: string;
  /** "Plástico, papel/cartón y metal", "Todos" o "—" si no se sabe. */
  materiales: string;
}

/**
 * De dónde salió y qué se llevó un retiro, para la tabla del panel. Los
 * puntos salen de sus contenedores (también de los ya desactivados) y los
 * materiales, de los depósitos que certificó: en un contenedor mixto el
 * material lo declara cada persona.
 */
export function detalleRetiro(retiro: Retiro, contenedores: Contenedor[], registros: Registro[]): DetalleRetiro {
  const puntoDe = new Map(contenedores.map((c) => [c.codigo, c.punto || "Sin punto"]));
  const puntos = [...new Set(retiro.contenedores.map((codigo) => puntoDe.get(codigo) ?? "Sin punto"))];
  const puntosPlanta = new Set(contenedores.filter((c) => c.activo).map((c) => c.punto));
  const todosLosPuntos = puntos.length > 1 && puntos.length >= puntosPlanta.size && puntos.every((p) => puntosPlanta.has(p));

  const llevados = new Set(registros.filter((r) => r.retiroId === retiro.id).map((r) => r.material));
  const materiales = MATERIALES.map((m) => m.nombre).filter((m) => llevados.has(m));
  let textoMateriales = "—";
  if (materiales.length === MATERIALES.length) textoMateriales = "Todos";
  else if (materiales.length > 0) {
    const texto = enLista(materiales.map((m) => m.toLowerCase()));
    textoMateriales = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  return {
    puntos: todosLosPuntos ? `Los ${puntos.length} puntos` : enLista(puntos),
    materiales: textoMateriales,
  };
}

/**
 * Quiénes han retirado antes, del más reciente al más antiguo y sin repetir,
 * para elegirlos en el formulario sin volver a escribirlos.
 */
export function quienesRetiraron(retiros: Retiro[], maximo = 5): string[] {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  for (const r of [...retiros].sort((a, b) => b.fecha - a.fecha)) {
    const nombre = r.quienRetira.trim();
    const clave = nombre.toLowerCase();
    if (!nombre || vistos.has(clave)) continue;
    vistos.add(clave);
    nombres.push(nombre);
    if (nombres.length === maximo) break;
  }
  return nombres;
}
