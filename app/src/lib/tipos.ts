// Tipos compartidos de EcoTrack. Reflejan el modelo de datos en Firestore.

export type Material = "Papel/cartón" | "Plástico" | "Vidrio" | "Metal";
export type Rol = "residente" | "administrador" | "gestor";
export type EstadoRegistro = "pendiente" | "validado" | "certificado" | "rechazado";

export const MATERIALES: { nombre: Material; emoji: string }[] = [
  { nombre: "Papel/cartón", emoji: "📄" },
  { nombre: "Plástico", emoji: "🥤" },
  { nombre: "Vidrio", emoji: "🍾" },
  { nombre: "Metal", emoji: "🥫" },
];

export const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: "residente", etiqueta: "🏠 Residente" },
  { valor: "administrador", etiqueta: "🛡️ Admin." },
  { valor: "gestor", etiqueta: "🚛 Gestor" },
];

/** Colección `torres/{torreId}` */
export interface Torre {
  id: string;
  nombre: string;
  condominio: string;
  codigoInvitacion: string;
  metaKg: number;
  deptosTotales: number;
}

/** Colección `usuarios/{uid}` — el id es el uid de Firebase Auth. */
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  depto: string;
  rol: Rol;
  torreId: string | null;
  torreNombre: string | null;
}

/** Colección `registros/{id}` */
export interface Registro {
  id: string;
  residenteId: string;
  residente: string;
  depto: string;
  torreId: string;
  torreNombre: string;
  material: Material;
  /** Peso estimado por el residente al depositar. */
  kgDeclarado: number;
  /** Peso confirmado visualmente por el administrador al validar. */
  kgConfirmado: number | null;
  contenedor: string;
  estado: EstadoRegistro;
  creadoEn: number;
  validadoEn: number | null;
  validadoPor: string | null;
  certificadoEn: number | null;
  certificadoPor: string | null;
  /** Código del certificado individual del residente. */
  codigo: string | null;
  /** Código del retiro (lote) en el que salió físicamente de la torre. */
  codigoRetiro: string | null;
}

/**
 * Lo que el gestor realmente retira: el contenedor de una torre, no depósitos
 * sueltos. Agrupa todos los depósitos validados de una misma torre y nunca
 * expone quién los hizo.
 */
export interface LoteRetiro {
  torreId: string;
  torreNombre: string;
  condominio: string;
  /** Depósitos que componen el lote. Solo se usa para escribir, no para mostrar. */
  registros: Registro[];
  kgTotal: number;
  depositos: number;
  porMaterial: { material: Material; kg: number }[];
  /** Validación más antigua del lote: cuánto lleva esperando el retiro. */
  esperandoDesde: number;
}

/**
 * Peso que cuenta para métricas y certificados: el confirmado por el
 * administrador si existe, si no el declarado por el residente.
 */
export function kgEfectivo(r: Registro): number {
  return r.kgConfirmado ?? r.kgDeclarado;
}

export interface ResumenTorre {
  torre: Torre | null;
  deptosActivos: number;
  deptosTotales: number;
  kgMes: number;
  participacion: number;
  metaKg: number;
  avanceMeta: number;
  pendientes: Registro[];
}

/**
 * Misión activa de una torre: la meta del mes y el incentivo que definió el
 * administrador. Colección `misiones/{torreId}`, un documento por torre; si no
 * existe, la torre todavía no tiene misión propia (se usa la meta base de
 * `Torre.metaKg`, sin incentivo).
 */
export interface Mision {
  torreId: string;
  metaKg: number;
  incentivo: string;
  actualizadaEn: number;
  actualizadaPor: string;
}

export interface FilaRanking {
  torreId: string;
  nombre: string;
  condominio: string;
  kg: number;
  participacion: number;
  esMiTorre: boolean;
}
