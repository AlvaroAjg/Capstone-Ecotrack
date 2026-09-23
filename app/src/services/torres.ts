import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CODIGO_GESTOR_DEMO, CODIGOS_ADMIN_DEMO } from "../lib/demo";
import type { Torre } from "../lib/tipos";

function aTorre(id: string, datos: any): Torre {
  return {
    id,
    nombre: datos.nombre ?? id,
    condominio: datos.condominio ?? "",
    codigoInvitacion: datos.codigoInvitacion ?? "",
    metaKg: datos.metaKg ?? 0,
    deptosTotales: datos.deptosTotales ?? 0,
  };
}

export function escucharTorres(callback: (torres: Torre[]) => void) {
  return onSnapshot(collection(db, "torres"), (snap) => {
    const torres = snap.docs
      .map((d) => aTorre(d.id, d.data()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    callback(torres);
  });
}

export async function buscarTorrePorCodigo(codigo: string): Promise<Torre | null> {
  const consulta = query(
    collection(db, "torres"),
    where("codigoInvitacion", "==", codigo.trim().toUpperCase())
  );
  const snap = await getDocs(consulta);
  if (snap.empty) return null;
  const primera = snap.docs[0];
  return aTorre(primera.id, primera.data());
}

/**
 * Torres del condominio piloto. Se crean una sola vez desde la pantalla de
 * login (botón visible solo en desarrollo) para no depender de carga manual.
 */
export const TORRES_SEMILLA: Torre[] = [
  {
    id: "torre-a",
    nombre: "Torre A",
    condominio: "Condominio Piloto",
    codigoInvitacion: "ECO-TORRE-A",
    metaKg: 200,
    deptosTotales: 24,
  },
  {
    id: "torre-b",
    nombre: "Torre B",
    condominio: "Condominio Piloto",
    codigoInvitacion: "ECO-TORRE-B",
    metaKg: 150,
    deptosTotales: 19,
  },
];

/**
 * Además de las torres, siembra los códigos que habilitan convertirse en
 * administrador de cada una (`codigosRol/{torreId}`) y el código de gestor
 * (`codigosRol/gestor`). Nadie los lee desde la app (las reglas los esconden
 * con `allow read: if false`); solo se comparan al crear o promover una cuenta.
 *
 * Al igual que las torres, esto solo funciona mientras el proyecto sigue en
 * modo de prueba: una vez publicadas las reglas de `firestore.rules`, escribir
 * aquí exige ya ser administrador. Si el proyecto ya está en producción y
 * necesitas sembrar torres nuevas, hazlo manualmente desde la consola de
 * Firebase.
 */
export async function sembrarTorres(): Promise<number> {
  for (const torre of TORRES_SEMILLA) {
    const { id, ...datos } = torre;
    await setDoc(doc(db, "torres", id), datos, { merge: true });
    await setDoc(
      doc(db, "codigosRol", id),
      { administrador: CODIGOS_ADMIN_DEMO[id] ?? `ADM-${id.toUpperCase()}` },
      { merge: true }
    );
  }
  await setDoc(doc(db, "codigosRol", "gestor"), { codigo: CODIGO_GESTOR_DEMO }, { merge: true });
  return TORRES_SEMILLA.length;
}
