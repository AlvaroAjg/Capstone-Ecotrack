import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { generarCodigoContenedor } from "../lib/qr";
import type { Contenedor, Material } from "../lib/tipos";

function aContenedor(codigo: string, d: any): Contenedor {
  return {
    codigo,
    torreId: d.torreId ?? "",
    material: (d.material ?? null) as Material | null,
    activo: d.activo ?? false,
    creadoEn: d.creadoEn ?? 0,
  };
}

/**
 * Contenedores de una torre, en vivo, incluidos los inactivos (un depósito
 * pendiente puede estar en un contenedor al que después le cambiaron el
 * código). Solo lo usa el administrador de esa torre: las reglas no dejan
 * listar los de otra, ni a un residente listar ninguno (así nadie descubre los
 * códigos sin estar frente al contenedor).
 */
export function escucharContenedores(
  torreId: string,
  callback: (contenedores: Contenedor[]) => void
) {
  const consulta = query(collection(db, "contenedores"), where("torreId", "==", torreId));
  return onSnapshot(consulta, (snap) => {
    callback(
      snap.docs
        .map((d) => aContenedor(d.id, d.data()))
        .sort((a, b) => a.creadoEn - b.creadoEn)
    );
  });
}

/** El contenedor de un código escaneado, o null si no existe. */
export async function obtenerContenedor(codigo: string): Promise<Contenedor | null> {
  const snap = await getDoc(doc(db, "contenedores", codigo));
  return snap.exists() ? aContenedor(snap.id, snap.data()) : null;
}

/**
 * Un código que todavía no exista. Con 32^6 combinaciones un choque es casi
 * imposible, pero se comprueba igual: crear sobre un código existente lo
 * pisaría, y las reglas lo rechazarían como edición.
 */
async function codigoLibre(): Promise<string> {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoContenedor();
    if (!(await getDoc(doc(db, "contenedores", codigo))).exists()) return codigo;
  }
  throw new Error("No se pudo generar un código de contenedor. Intenta de nuevo.");
}

/** Agrega un contenedor a la torre. `material` null = mixto. */
export async function crearContenedor(
  torreId: string,
  material: Material | null
): Promise<string> {
  const codigo = await codigoLibre();
  await setDoc(doc(db, "contenedores", codigo), {
    torreId,
    material,
    activo: true,
    creadoEn: Date.now(),
  });
  return codigo;
}

/** Quita un contenedor: su QR deja de servir, pero los depósitos hechos en él se conservan. */
export async function desactivarContenedor(codigo: string): Promise<void> {
  await updateDoc(doc(db, "contenedores", codigo), { activo: false });
}

/**
 * Cambia el código de un contenedor, por ejemplo si alguien sacó foto al QR y
 * lo compartió: se crea uno nuevo con el mismo material y el anterior queda
 * inactivo, en una sola escritura. Hay que imprimir el QR nuevo.
 */
export async function cambiarCodigo(contenedor: Contenedor): Promise<string> {
  const codigo = await codigoLibre();
  const lote = writeBatch(db);
  lote.set(doc(db, "contenedores", codigo), {
    torreId: contenedor.torreId,
    material: contenedor.material,
    activo: true,
    creadoEn: Date.now(),
  });
  lote.update(doc(db, "contenedores", contenedor.codigo), { activo: false });
  await lote.commit();
  return codigo;
}
