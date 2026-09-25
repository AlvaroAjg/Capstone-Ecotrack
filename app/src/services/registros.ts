import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { generarCodigoRetiro, generarCodigoVerificacion } from "../lib/formato";
import { kgEstimado, type Material, type Registro, type Talla, type Usuario } from "../lib/tipos";

/**
 * Se escucha la colección completa (acotada) y se filtra en memoria por rol.
 * Para el piloto (2 torres, decenas de registros) es lo más simple y evita
 * índices compuestos. Al escalar, conviene una consulta por torre y estado.
 */
const LIMITE = 300;

function aRegistro(id: string, d: any): Registro {
  return {
    id,
    residenteId: d.residenteId ?? "",
    residente: d.residente ?? "",
    depto: d.depto ?? "",
    torreId: d.torreId ?? "",
    torreNombre: d.torreNombre ?? "",
    material: d.material as Material,
    talla: d.talla ?? null,
    kgDeclarado: d.kgDeclarado ?? 0,
    kgConfirmado: d.kgConfirmado ?? null,
    contenedor: d.contenedor ?? "",
    estado: d.estado ?? "pendiente",
    creadoEn: d.creadoEn ?? 0,
    validadoEn: d.validadoEn ?? null,
    validadoPor: d.validadoPor ?? null,
    certificadoEn: d.certificadoEn ?? null,
    certificadoPor: d.certificadoPor ?? null,
    codigo: d.codigo ?? null,
    codigoRetiro: d.codigoRetiro ?? null,
  };
}

export function escucharRegistros(
  callback: (registros: Registro[]) => void,
  alFallar?: (error: Error) => void
) {
  const consulta = query(
    collection(db, "registros"),
    orderBy("creadoEn", "desc"),
    limit(LIMITE)
  );
  return onSnapshot(
    consulta,
    (snap) => callback(snap.docs.map((d) => aRegistro(d.id, d.data()))),
    (error) => alFallar?.(error)
  );
}

export async function crearRegistro(
  usuario: Usuario,
  material: Material,
  talla: Talla,
  contenedor: string
): Promise<string> {
  if (!usuario.torreId) {
    throw new Error("Tu cuenta no está vinculada a una torre.");
  }

  const referencia = await addDoc(collection(db, "registros"), {
    residenteId: usuario.id,
    residente: usuario.nombre,
    depto: usuario.depto,
    torreId: usuario.torreId,
    torreNombre: usuario.torreNombre ?? "",
    material,
    talla,
    // Los kilos salen de la tabla, nunca de lo que escriba el usuario: las
    // reglas de Firestore rechazan cualquier otro valor.
    kgDeclarado: kgEstimado(material, talla),
    kgConfirmado: null,
    contenedor,
    estado: "pendiente",
    creadoEn: Date.now(),
    validadoEn: null,
    validadoPor: null,
    certificadoEn: null,
    certificadoPor: null,
    codigo: null,
    codigoRetiro: null,
  });

  return referencia.id;
}

/**
 * Etapa 1 de la cadena: el administrador confirma que el depósito está en el
 * contenedor. Valida la tanda completa, no bolsa por bolsa, así que se
 * confirman los kilos estimados por la talla declarada.
 */
export async function validarRegistro(registro: Registro, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "registros", registro.id), {
    estado: "validado",
    kgConfirmado: registro.kgDeclarado,
    validadoEn: Date.now(),
    validadoPor: adminUid,
  });
}

export async function rechazarRegistro(id: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "registros", id), {
    estado: "rechazado",
    validadoEn: Date.now(),
    validadoPor: adminUid,
  });
}

/**
 * Etapa 2 de la cadena: el gestor confirma el retiro del contenedor de una
 * torre. Lo que se retira es el lote completo, no un depósito suelto, así que
 * todos los depósitos validados de esa torre se certifican juntos.
 *
 * Se usa un `writeBatch` para que la operación sea atómica: o se certifica todo
 * el lote, o no se certifica nada. Cada residente recibe igualmente su propio
 * código de certificado, y todos comparten el código del retiro en el que
 * salieron físicamente.
 */
export async function confirmarRetiroDeTorre(
  registros: Registro[],
  gestorUid: string
): Promise<string> {
  if (registros.length === 0) {
    throw new Error("No hay depósitos validados en ese lote.");
  }

  const codigoRetiro = generarCodigoRetiro();
  const ahora = Date.now();
  const lote = writeBatch(db);

  for (const registro of registros) {
    lote.update(doc(db, "registros", registro.id), {
      estado: "certificado",
      certificadoEn: ahora,
      certificadoPor: gestorUid,
      codigo: generarCodigoVerificacion(),
      codigoRetiro,
    });
  }

  await lote.commit();
  return codigoRetiro;
}
