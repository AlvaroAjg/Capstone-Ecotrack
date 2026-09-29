import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
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
