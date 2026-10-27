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
    plantaId: d.plantaId ?? "",
    punto: d.punto ?? "",
    ubicacion: d.ubicacion ?? "",
    material: (d.material ?? null) as Material | null,
    activo: d.activo ?? false,
    creadoEn: d.creadoEn ?? 0,
  };
}

/**
 * Contenedores de una planta, en vivo, incluidos los inactivos (un depósito
 * pendiente puede estar en un contenedor al que después le cambiaron el
 * código). Solo lo usan el validador y el administrador de esa planta: las
 * reglas no dejan listar los de otra, ni a un colaborador listar ninguno (así
 * nadie descubre los códigos sin estar frente al contenedor).
 */
export function escucharContenedores(
  plantaId: string,
  callback: (contenedores: Contenedor[]) => void
) {
  const consulta = query(collection(db, "contenedores"), where("plantaId", "==", plantaId));
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

/**
 * Agrega un contenedor a un punto limpio de la planta. `material` null =
 * mixto. Lleva la ubicación del punto, como los demás contenedores de él.
 */
export async function crearContenedor(
  plantaId: string,
  punto: string,
  material: Material | null,
  ubicacion = ""
): Promise<string> {
  const codigo = await codigoLibre();
  await setDoc(doc(db, "contenedores", codigo), {
    plantaId,
    punto,
    ubicacion,
    material,
    activo: true,
    creadoEn: Date.now(),
  });
  return codigo;
}

/**
 * Un punto limpio nuevo con sus contenedores, en una sola escritura: o se
 * crean todos, o ninguno. Devuelve los códigos, en el orden de `materiales`.
 */
export async function crearPunto(
  plantaId: string,
  punto: string,
  ubicacion: string,
  materiales: (Material | null)[]
): Promise<string[]> {
  const codigos: string[] = [];
  for (const _ of materiales) {
    let codigo = await codigoLibre();
    // Dos códigos al azar iguales en el mismo lote son casi imposibles, pero
    // el segundo pisaría al primero.
    while (codigos.includes(codigo)) codigo = await codigoLibre();
    codigos.push(codigo);
  }
  const lote = writeBatch(db);
  const ahora = Date.now();
  materiales.forEach((material, i) =>
    lote.set(doc(db, "contenedores", codigos[i]), {
      plantaId,
      punto,
      ubicacion,
      material,
      activo: true,
      creadoEn: ahora,
    })
  );
  await lote.commit();
  return codigos;
}

/**
 * Cambia el nombre o la ubicación de un punto limpio. Se hace en todos sus
 * contenedores, también en los desactivados, para que su historial siga
 * apareciendo en el mismo punto. Va en un lote: o cambian todos, o ninguno.
 */
export async function editarPunto(
  contenedores: Contenedor[],
  datos: { punto: string; ubicacion: string }
): Promise<void> {
  const lote = writeBatch(db);
  for (const c of contenedores) {
    lote.update(doc(db, "contenedores", c.codigo), { punto: datos.punto, ubicacion: datos.ubicacion });
  }
  await lote.commit();
}

/** Quita un contenedor: su QR deja de servir, pero los depósitos hechos en él se conservan. */
export async function desactivarContenedor(codigo: string): Promise<void> {
  await updateDoc(doc(db, "contenedores", codigo), { activo: false });
}

/**
 * Cambia el código de un contenedor, por ejemplo si alguien sacó foto al QR y
 * lo compartió: se crea uno nuevo con el mismo material y el anterior queda
 * inactivo, en una sola escritura. Queda en el mismo punto limpio. Hay que
 * imprimir el QR nuevo.
 */
export async function cambiarCodigo(contenedor: Contenedor): Promise<string> {
  const codigo = await codigoLibre();
  const lote = writeBatch(db);
  lote.set(doc(db, "contenedores", codigo), {
    plantaId: contenedor.plantaId,
    punto: contenedor.punto,
    ubicacion: contenedor.ubicacion,
    material: contenedor.material,
    activo: true,
    creadoEn: Date.now(),
  });
  lote.update(doc(db, "contenedores", contenedor.codigo), { activo: false });
  await lote.commit();
  return codigo;
}
