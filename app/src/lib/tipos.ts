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

/**
 * Nadie pesa lo que recicla: el residente declara cuánto trae según el tamaño
 * de la bolsa en que lo trajo, y la app estima los kilos. La bolsa es solo una
 * referencia de volumen: el material se vacía suelto en el contenedor y la
 * bolsa se guarda, porque una bolsa plástica dentro del reciclaje lo contamina. Las reglas de Firestore solo aceptan los
 * kilos de esta tabla, así que no se pueden inventar a mano. El administrador
 * no revisa bolsa por bolsa: valida la tanda del contenedor completa.
 */
export type Talla = "S" | "M" | "L" | "XL";

export const TALLAS: { valor: Talla; referencia: string; litros: number }[] = [
  { valor: "S", referencia: "Una botella, unas latas o una bolsa de pan", litros: 5 },
  { valor: "M", referencia: "Bolsa de supermercado llena", litros: 15 },
  { valor: "L", referencia: "Bolsa de basura de cocina", litros: 30 },
  { valor: "XL", referencia: "Bolsa de basura grande", litros: 60 },
];

/**
 * Kilos estimados por talla y material, con densidades típicas de material
 * suelto sin compactar. Son referenciales: conviene calibrarlos pesando unas
 * pocas bolsas reales. Si se cambian, hay que cambiarlos también en
 * firestore.rules (función kgPorTalla), que los exige tal cual.
 */
export const KG_POR_TALLA: Record<Material, Record<Talla, number>> = {
  "Plástico": { S: 0.1, M: 0.4, L: 0.8, XL: 1.5 },
  "Papel/cartón": { S: 0.4, M: 1.2, L: 2.5, XL: 5 },
  // Promedio entre latas de aluminio (bebidas) y de acero (conservas): según
  // los factores de la EPA, las de acero pesan más del doble por volumen.
  "Metal": { S: 0.3, M: 0.8, L: 1.5, XL: 3 },
  "Vidrio": { S: 1.5, M: 4, L: 8, XL: 12 },
};

export function kgEstimado(material: Material, talla: Talla): number {
  return KG_POR_TALLA[material][talla];
}

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

/**
 * Colección `contenedores/{codigo}`: un documento por contenedor físico, con
 * su QR. El id es un código aleatorio y no adivinable (p. ej. `K7QM9X`): para
 * conocerlo hay que estar frente al contenedor y escanearlo (o leerlo bajo el
 * QR impreso). Si el contenedor es de un material, ese depósito queda fijado a
 * ese material: las reglas de Firestore no aceptan vidrio en el de plástico.
 */
export interface Contenedor {
  codigo: string;
  torreId: string;
  /** Material que recibe; null si es mixto (el residente elige el material). */
  material: Material | null;
  /** Al cambiar el código de un contenedor, el anterior queda inactivo. */
  activo: boolean;
  creadoEn: number;
}

/** "Contenedor de vidrio" o "Contenedor mixto". */
export function nombreContenedor(c: Pick<Contenedor, "material">): string {
  return c.material ? `Contenedor de ${c.material.toLowerCase()}` : "Contenedor mixto";
}

/**
 * Lo que el administrador puede encontrar donde no corresponde. La misma lista
 * está en firestore.rules (incidencias): si se cambia una, se cambia la otra.
 */
export const CONTAMINANTES = [
  "Vidrio",
  "Plástico",
  "Papel/cartón",
  "Metal",
  "Orgánico",
  "Basura común",
] as const;
export type Contaminante = (typeof CONTAMINANTES)[number];

/**
 * Colección `incidencias/{id}`: un contenedor que el administrador encontró
 * contaminado (p. ej. vidrio picado en el de papel/cartón). No se sabe quién
 * fue, así que no castiga a nadie: los depósitos declarados se validan igual.
 * Sirve para advertir al gestor antes de retirar (seguridad), avisar a toda la
 * torre (educación) y medir la calidad de separación del mes.
 */
export interface Incidencia {
  id: string;
  torreId: string;
  torreNombre: string;
  contenedor: string;
  contenedorNombre: string;
  contaminante: Contaminante;
  reportadoEn: number;
  reportadoPor: string;
  /** El gestor ya retiró ese contenedor: la advertencia deja de mostrarse. */
  atendida: boolean;
  atendidaEn: number | null;
  codigoRetiro: string | null;
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
  /** Hasta cuándo vio sus avisos: los posteriores se marcan como nuevos. */
  avisosVistosHasta: number;
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
  /** Talla de bolsa declarada por el residente. null en depósitos antiguos, registrados en kilos. */
  talla: Talla | null;
  /** Kilos declarados: la estimación de `talla`, o el peso escrito en depósitos antiguos. */
  kgDeclarado: number;
  /** Kilos con que el administrador validó el depósito. */
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
  /** Suma de los EcoPuntos del mes de todos los residentes de la torre. */
  ecoPuntos: number;
  esMiTorre: boolean;
}
