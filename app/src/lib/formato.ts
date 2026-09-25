import { kgEfectivo, type Registro } from "./tipos";

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function haceMinutos(minutos: number): number {
  return Date.now() - minutos * MINUTO;
}

export function tiempoRelativo(timestamp: number): string {
  const delta = Date.now() - timestamp;

  if (delta < MINUTO) return "recién";
  if (delta < HORA) return `hace ${Math.floor(delta / MINUTO)} min`;
  if (delta < DIA) return `hace ${Math.floor(delta / HORA)} h`;
  if (delta < 2 * DIA) return "ayer";
  return `hace ${Math.floor(delta / DIA)} días`;
}

export function formatKg(kg: number): string {
  return `${kg.toFixed(1).replace(".", ",")} kg`;
}

/** Kilos estimados a partir de una talla de bolsa: se muestran con "≈". */
export function formatKgEstimado(kg: number): string {
  return `≈ ${formatKg(kg)}`;
}

/**
 * Cantidad de un depósito para mostrar: "Bolsa M · ≈ 1,2 kg" si se declaró por
 * talla, o "2,0 kg" en los depósitos antiguos, registrados en kilos.
 */
export function cantidadDeposito(r: Registro): string {
  if (!r.talla) return formatKg(kgEfectivo(r));
  return `Bolsa ${r.talla} · ${formatKgEstimado(kgEfectivo(r))}`;
}

export function sumaKg(kgs: number[]): number {
  return Math.round(kgs.reduce((total, kg) => total + kg, 0) * 10) / 10;
}

export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((parte / total) * 100)));
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bloque(): string {
  return Array.from(
    { length: 4 },
    () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  ).join("");
}

/** Código del certificado individual de un residente. */
export function generarCodigoVerificacion(): string {
  return `ECO-${bloque()}-${bloque()}`;
}

/** Código del retiro: lo comparten todos los depósitos que salieron juntos. */
export function generarCodigoRetiro(): string {
  return `RET-${bloque()}`;
}

export function fechaLarga(timestamp: number): string {
  return new Date(timestamp).toLocaleString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Las métricas de torre y ranking se calculan sobre el mes calendario en curso. */
export function esDelMesActual(timestamp: number | null): boolean {
  if (!timestamp) return false;
  const fecha = new Date(timestamp);
  const hoy = new Date();
  return (
    fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
  );
}

export function esDeHoy(timestamp: number | null): boolean {
  if (!timestamp) return false;
  const fecha = new Date(timestamp);
  const hoy = new Date();
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
}
