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

export function sumaKg(kgs: number[]): number {
  return Math.round(kgs.reduce((total, kg) => total + kg, 0) * 10) / 10;
}

export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((parte / total) * 100)));
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generarCodigoVerificacion(): string {
  const bloque = () =>
    Array.from(
      { length: 4 },
      () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
    ).join("");
  return `ECO-${bloque()}-${bloque()}`;
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
