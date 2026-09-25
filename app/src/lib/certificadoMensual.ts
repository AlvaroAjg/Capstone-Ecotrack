// Certificado mensual del residente.
//
// Antes se emitía un certificado por depósito, lo que no tenía sentido para
// una botella suelta: nadie descarga un documento oficial por 0,1 kg. Ahora
// cada residente tiene un certificado por mes, que suma lo que reciclaste y
// detalla cada depósito con las fechas de su paso por la cadena.
//
// Un depósito pertenece al mes en que se hizo (creadoEn). El total certificado
// cuenta solo los que completaron la cadena; los que siguen en proceso o
// fueron rechazados aparecen en el detalle, pero no suman.

import { MATERIALES, kgEfectivo, type Material, type Registro } from "./tipos";

export interface CertificadoMensual {
  /** "2026-09" */
  mes: string;
  /** "septiembre de 2026" */
  etiqueta: string;
  residente: string;
  torreNombre: string;
  depto: string;
  /** Todos los depósitos del mes, del más antiguo al más reciente. */
  registros: Registro[];
  /** Los que completaron la cadena: son los que suman al total. */
  certificados: Registro[];
  kgCertificados: number;
  porMaterial: { material: Material; kg: number; depositos: number }[];
  /** Código del certificado del mes, estable para ese residente y ese mes. */
  codigo: string;
  /** El mes todavía no termina: el certificado se sigue completando. */
  enCurso: boolean;
}

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Mes local de un instante, como "2026-09". */
export function mesDe(timestamp: number): string {
  const f = new Date(timestamp);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
}

export function etiquetaMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return `${NOMBRES_MES[numero - 1]} de ${anio}`;
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Código del certificado: "ECO-2609-K7QM". Se deriva del residente y del mes
 * (hash FNV-1a), así que es siempre el mismo para ese mes sin guardarlo en
 * ninguna parte. Cada depósito conserva además su propio código y el del
 * retiro en que salió, que son los que se ven en el detalle.
 */
function codigoMensual(residenteId: string, mes: string): string {
  let hash = 0x811c9dc5;
  for (const caracter of `${residenteId}|${mes}`) {
    hash ^= caracter.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let sufijo = "";
  for (let i = 0; i < 4; i++) {
    sufijo += ALFABETO[hash % ALFABETO.length];
    hash = Math.floor(hash / ALFABETO.length);
  }
  const [anio, numero] = mes.split("-");
  return `ECO-${anio.slice(2)}${numero}-${sufijo}`;
}

/** Meses en que el residente tiene al menos un depósito certificado, del más reciente al más antiguo. */
export function mesesConCertificado(misRegistros: Registro[]): string[] {
  const meses = new Set(
    misRegistros.filter((r) => r.estado === "certificado").map((r) => mesDe(r.creadoEn))
  );
  return Array.from(meses).sort().reverse();
}

export function certificadoDelMes(
  misRegistros: Registro[],
  mes: string
): CertificadoMensual | null {
  const registros = misRegistros
    .filter((r) => mesDe(r.creadoEn) === mes)
    .sort((a, b) => a.creadoEn - b.creadoEn);
  const certificados = registros.filter((r) => r.estado === "certificado");
  if (certificados.length === 0) return null;

  // Nombre, torre y depto del depósito más reciente: si cambió de departamento
  // durante el mes, vale el último.
  const ultimo = registros[registros.length - 1];

  const porMaterial = MATERIALES.map(({ nombre }) => {
    const deEste = certificados.filter((r) => r.material === nombre);
    return {
      material: nombre,
      kg: Math.round(deEste.reduce((t, r) => t + kgEfectivo(r), 0) * 10) / 10,
      depositos: deEste.length,
    };
  }).filter((m) => m.depositos > 0);

  return {
    mes,
    etiqueta: etiquetaMes(mes),
    residente: ultimo.residente,
    torreNombre: ultimo.torreNombre,
    depto: ultimo.depto,
    registros,
    certificados,
    kgCertificados:
      Math.round(certificados.reduce((t, r) => t + kgEfectivo(r), 0) * 10) / 10,
    porMaterial,
    codigo: codigoMensual(ultimo.residenteId, mes),
    enCurso: mes === mesDe(Date.now()),
  };
}

/** true si algún depósito certificado del mes se declaró por talla (sus kilos son estimados). */
export function tieneEstimados(c: CertificadoMensual): boolean {
  return c.certificados.some((r) => r.talla !== null);
}
