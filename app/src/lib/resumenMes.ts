// Ids de los documentos que llevan la cuenta del mes por área (ver ResumenMes
// en tipos.ts). Las reglas de Firestore exigen estos mismos formatos, así que
// se arman en un solo lugar.

/** `resumenes/{plantaId}_{AAAA-MM}`: lo que lleva cada área de la planta en el mes. */
export function idResumen(plantaId: string, mes: string): string {
  return `${plantaId}_${mes}`;
}

/**
 * `participaciones/{AAAA-MM}_{uid}`: existe si la persona ya depositó ese mes.
 * Así se cuenta una sola vez como participante de su área, sin que la app
 * tenga que leer los depósitos de los demás.
 */
export function idParticipacion(mes: string, uid: string): string {
  return `${mes}_${uid}`;
}
