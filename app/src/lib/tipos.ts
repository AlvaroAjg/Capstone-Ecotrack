// Tipos compartidos de RecyTrack. Reflejan el modelo de datos en Firestore
// (ver firestore.rules): una planta con áreas, y tres roles.

export type Material = "Papel/cartón" | "Plástico" | "Vidrio" | "Metal";
/**
 * - colaborador: recicla desde el teléfono.
 * - validador: recorre el punto limpio una vez al día y valida los depósitos.
 * - administrador: trabaja en el panel web; registra los retiros, que
 *   certifican los depósitos validados.
 */
export type Rol = "colaborador" | "validador" | "administrador";
export type EstadoRegistro = "pendiente" | "validado" | "certificado" | "rechazado";

export const MATERIALES: { nombre: Material; emoji: string }[] = [
  { nombre: "Papel/cartón", emoji: "📄" },
  { nombre: "Plástico", emoji: "🥤" },
  { nombre: "Vidrio", emoji: "🍾" },
  { nombre: "Metal", emoji: "🥫" },
];

/**
 * Nadie pesa lo que recicla: el colaborador declara cuánto trae según el tamaño
 * de la bolsa en que lo trajo, y la app estima los kilos. La bolsa es solo una
 * referencia de volumen: el material se vacía suelto en el contenedor y la
 * bolsa se guarda, porque una bolsa plástica dentro del reciclaje lo contamina. Las reglas de Firestore solo aceptan los
 * kilos de esta tabla, así que no se pueden inventar a mano. El validador
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
  { valor: "colaborador", etiqueta: "♻️ Colaborador" },
  { valor: "validador", etiqueta: "🔎 Validador" },
  { valor: "administrador", etiqueta: "🛡️ Admin." },
];

/** Colección `plantas/{plantaId}`. Se crea en la consola de Firebase. */
export interface Planta {
  id: string;
  nombre: string;
  empresa: string;
}

/**
 * Colección `areas/{areaId}`: reemplaza a la torre y al departamento. Cada
 * colaborador pertenece a un área y la competencia es entre áreas.
 */
export interface Area {
  id: string;
  plantaId: string;
  nombre: string;
  /** Código para unirse al área, p. ej. `EMB-4821`. */
  codigo: string;
  /** Personas que trabajan en el área: el denominador de la participación. */
  dotacion: number;
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
  plantaId: string;
  /**
   * Nombre del punto limpio donde está. Todavía no se sabe cuántos tiene la
   * planta, así que cada contenedor lleva el suyo: sirve con uno o con varios.
   */
  punto: string;
  /** Material que recibe; null si es mixto (el colaborador elige el material). */
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
 * Lo que el validador puede encontrar donde no corresponde. La misma lista
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
 * Colección `incidencias/{id}`: un contenedor que el validador encontró
 * contaminado (p. ej. vidrio picado en el de papel/cartón). No se sabe quién
 * fue, así que no castiga a nadie: los depósitos declarados se validan igual.
 * Sirve para advertir al administrador antes de registrar el retiro
 * (seguridad), avisar a toda la planta (educación) y medir la calidad de
 * separación del mes.
 */
export interface Incidencia {
  id: string;
  plantaId: string;
  contenedor: string;
  contenedorNombre: string;
  contaminante: Contaminante;
  reportadoEn: number;
  reportadoPor: string;
  /** El contenedor ya se retiró: la advertencia deja de mostrarse. */
  atendida: boolean;
  atendidaEn: number | null;
  retiroId: string | null;
}

/** Colección `usuarios/{uid}` — el id es el uid de Firebase Auth. */
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  plantaId: string | null;
  /** null hasta que se une a un área con su código. */
  areaId: string | null;
  areaNombre: string | null;
  /** Hasta cuándo vio sus avisos: los posteriores se marcan como nuevos. */
  avisosVistosHasta: number;
}

/**
 * Colección `registros/{id}`. No guarda el nombre de la persona: así nadie ve
 * qué recicla cada compañero. El panel cruza `colaboradorId` con los perfiles,
 * que solo lee el administrador.
 */
export interface Registro {
  id: string;
  colaboradorId: string;
  plantaId: string;
  areaId: string;
  material: Material;
  /** Talla de bolsa declarada por el colaborador. */
  talla: Talla | null;
  /** Kilos declarados: la estimación de `talla`. */
  kgDeclarado: number;
  /** Kilos con que el validador validó el depósito. */
  kgConfirmado: number | null;
  contenedor: string;
  estado: EstadoRegistro;
  creadoEn: number;
  validadoEn: number | null;
  validadoPor: string | null;
  certificadoEn: number | null;
  certificadoPor: string | null;
  /** Código del certificado individual del colaborador. */
  codigo: string | null;
  /** Retiro (`retiros/{id}`) en el que salió físicamente de la planta. */
  retiroId: string | null;
}

/**
 * Colección `retiros/{id}`: el administrador confirma que se fue el material
 * de unos contenedores. Es la etapa 2 de la cadena: en el mismo lote se
 * certifican los depósitos validados de esos contenedores. No se edita ni se
 * borra.
 */
export interface Retiro {
  id: string;
  plantaId: string;
  /** Cuándo se retiró el material (puede ser anterior a cuando se registró). */
  fecha: number;
  quienRetira: string;
  /** N° de guía o comprobante, si lo hubo. */
  guia: string | null;
  /** Códigos de los contenedores retirados. */
  contenedores: string[];
  /** Peso informado por quien retira; null si no se pesó (retiro estimado). */
  pesoKg: number | null;
  depositos: number;
  kgEstimado: number;
  registradoPor: string;
  registradoEn: number;
}

/**
 * Colección `campanas/{plantaId}`: el incentivo vigente de la planta. La meta
 * es de participación (% de personas del área que reciclaron en el mes), no
 * de kilos: los kilos son estimados y premiarlos invita a inflarlos.
 */
export interface Campana {
  plantaId: string;
  nombre: string;
  /** De 1 a 100. */
  metaParticipacion: number;
  incentivo: string;
  terminaEn: number;
  actualizadaEn: number;
  actualizadaPor: string;
}

/** Lo que lleva un área en el mes, dentro de `ResumenMes`. */
export interface ConteoArea {
  /** Depósitos registrados, también los que después se rechazan. */
  depositos: number;
  /** Personas distintas con al menos un depósito en el mes. */
  participantes: number;
}

/**
 * Colección `resumenes/{plantaId}_{AAAA-MM}`: lo que lleva cada área en el
 * mes. Permite mostrar el ranking sin descargar los depósitos de los demás.
 * Lo suma cada colaborador en el mismo lote en que crea su depósito.
 */
export interface ResumenMes {
  plantaId: string;
  /** "2026-10". */
  mes: string;
  areas: Record<string, ConteoArea>;
  /** Último depósito que sumó: las reglas lo usan para comprobar cada suma. */
  ultimoRegistro: string;
}

/**
 * Lo que espera retiro en un contenedor: sus depósitos validados. El
 * administrador elige qué contenedores salieron y se certifica todo lo
 * validado en ellos. Nunca expone quién hizo cada depósito.
 */
export interface ContenedorPorRetirar {
  contenedor: string;
  /** Punto limpio del contenedor ("" si no se encontró). */
  punto: string;
  material: Material | null;
  /** Depósitos que se certifican al retirarlo. Solo se usa para escribir, no para mostrar. */
  registros: Registro[];
  depositos: number;
  kgEstimado: number;
  /** Validación más antigua: cuánto lleva esperando el retiro. */
  esperandoDesde: number;
}

/**
 * Peso que cuenta para métricas y certificados: el confirmado por el
 * validador si existe, si no el declarado por el colaborador.
 */
export function kgEfectivo(r: Registro): number {
  return r.kgConfirmado ?? r.kgDeclarado;
}

/** Una fila del ranking de áreas del mes. */
export interface FilaRanking {
  areaId: string;
  nombre: string;
  dotacion: number;
  participantes: number;
  depositos: number;
  /** % de la dotación que reciclaron en el mes (participantes ÷ dotación). */
  participacion: number;
  esMiArea: boolean;
}
