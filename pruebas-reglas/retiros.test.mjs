// Tests de las reglas de los retiros: el administrador registra que se llevaron
// el material y, en el mismo lote, certifica los depósitos validados de esos
// contenedores (etapa 2) y da por atendidas sus incidencias.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { anonimo, como, depositoValidado, sembrar, usarEntorno } from "./comun.mjs";

usarEntorno();

/** Retiro tal como lo registra el panel del administrador. */
function retiro(uid = "carla", cambios = {}) {
  return {
    plantaId: "planta-a",
    fecha: Date.now(),
    quienRetira: "Reciclador de prueba",
    guia: "004512",
    contenedores: ["MIXTO1"],
    pesoKg: null,
    depositos: 1,
    kgEstimado: 0.4,
    registradoPor: uid,
    registradoEn: Date.now(),
    ...cambios,
  };
}

/** Lo que el lote escribe en cada depósito certificado. */
function certificacion(uid = "carla", retiroId = "retiro1", cambios = {}) {
  return {
    estado: "certificado",
    certificadoEn: Date.now(),
    certificadoPor: uid,
    codigo: "RCY-AAAA-BBBB",
    retiroId,
    ...cambios,
  };
}

/**
 * Como lo hace la app: el retiro y las certificaciones en un solo lote. Recibe
 * la instancia de Firestore para poder sumarle otras escrituras al mismo lote.
 */
function loteDeRetiro(uid, { db = como(uid), datosRetiro = retiro(uid), registros = ["validado1"], cambios = {} } = {}) {
  const lote = writeBatch(db);
  lote.set(doc(db, "retiros/retiro1"), datosRetiro);
  for (const id of registros) lote.update(doc(db, "registros", id), certificacion(uid, "retiro1", cambios));
  return lote;
}

async function estadoDe(id) {
  let estado;
  await sembrar(async (db) => {
    estado = (await getDoc(doc(db, "registros", id))).data().estado;
  });
  return estado;
}

// ------------------------------------------------------------------ retiros

describe("retiros: registrar", () => {
  const registrar = (uid, datos) => setDoc(doc(como(uid), "retiros/retiro1"), datos);

  test("la administradora registra un retiro de su planta", async () => {
    await assertSucceeds(registrar("carla", retiro()));
  });

  test("con el peso informado y sin guía", async () => {
    await assertSucceeds(registrar("carla", retiro("carla", { pesoKg: 52.5, guia: null })));
  });

  test("no en otra planta", async () => {
    await assertFails(registrar("carla", retiro("carla", { plantaId: "planta-b" })));
  });

  test("la validadora y los colaboradores no registran retiros", async () => {
    await assertFails(registrar("vale", retiro("vale")));
    await assertFails(registrar("ana", retiro("ana")));
  });

  test("no a nombre de otra persona", async () => {
    await assertFails(registrar("carla", retiro("carla", { registradoPor: "vale" })));
  });

  test("no sin decir quién retiró", async () => {
    await assertFails(registrar("carla", retiro("carla", { quienRetira: "" })));
  });

  test("no sin contenedores", async () => {
    await assertFails(registrar("carla", retiro("carla", { contenedores: [] })));
  });

  test("no con un peso de cero o negativo", async () => {
    await assertFails(registrar("carla", retiro("carla", { pesoKg: 0 })));
    await assertFails(registrar("carla", retiro("carla", { pesoKg: -5 })));
  });

  test("no con fecha de registro atrasada ni campos de más", async () => {
    await assertFails(registrar("carla", retiro("carla", { registradoEn: 1 })));
    await assertFails(registrar("carla", retiro("carla", { verificado: true })));
  });

  test("nadie lo edita ni lo borra", async () => {
    await sembrar((db) => setDoc(doc(db, "retiros/retiro1"), retiro()));
    await assertFails(updateDoc(doc(como("carla"), "retiros/retiro1"), { pesoKg: 100 }));
    await assertFails(deleteDoc(doc(como("carla"), "retiros/retiro1")));
  });

  test("las personas de la planta lo leen; las de otra planta y sin sesión, no", async () => {
    await sembrar((db) => setDoc(doc(db, "retiros/retiro1"), retiro()));
    await assertSucceeds(getDoc(doc(como("ana"), "retiros/retiro1")));
    const deLaPlanta = (uid, plantaId) => query(collection(como(uid), "retiros"), where("plantaId", "==", plantaId));
    await assertSucceeds(getDocs(deLaPlanta("carla", "planta-a")));
    await assertFails(getDocs(deLaPlanta("diego", "planta-a")));
    await assertFails(getDoc(doc(anonimo(), "retiros/retiro1")));
  });
});

// ------------------------------------------------------- etapa 2: certificar

describe("retiros: certificación de los depósitos", () => {
  test("registra el retiro y certifica sus depósitos en un solo lote, como la app", async () => {
    await assertSucceeds(loteDeRetiro("carla").commit());
    assert.equal(await estadoDe("validado1"), "certificado");
  });

  test("certifica 100 depósitos en el mismo lote", async () => {
    const ids = [];
    await sembrar(async (db) => {
      const lote = writeBatch(db);
      for (let i = 0; i < 100; i++) {
        ids.push(`validado-${i}`);
        lote.set(doc(db, "registros", `validado-${i}`), depositoValidado());
      }
      await lote.commit();
    });
    await assertSucceeds(loteDeRetiro("carla", { registros: ids }).commit());
  });

  test("no sin registrar el retiro", async () => {
    await assertFails(updateDoc(doc(como("carla"), "registros/validado1"), certificacion()));
  });

  test("no de un contenedor que el retiro no incluye", async () => {
    await sembrar((db) => setDoc(doc(db, "registros/vidrio1"), depositoValidado({ contenedor: "VIDRI1" })));
    await assertFails(loteDeRetiro("carla", { registros: ["vidrio1"] }).commit());
  });

  test("no con el retiro de otra planta", async () => {
    await sembrar((db) =>
      setDoc(doc(db, "retiros/retiroB"), retiro("diego", { plantaId: "planta-b", contenedores: ["MIXTO1"] }))
    );
    await assertFails(updateDoc(doc(como("carla"), "registros/validado1"), certificacion("carla", "retiroB")));
  });

  test("no un depósito pendiente (se saltaría la validación)", async () => {
    await assertFails(loteDeRetiro("carla", { registros: ["pendiente1"] }).commit());
  });

  test("no toca los kilos confirmados", async () => {
    await assertFails(loteDeRetiro("carla", { cambios: { kgConfirmado: 40 } }).commit());
  });

  test("no firma a nombre de otro", async () => {
    await assertFails(loteDeRetiro("carla", { cambios: { certificadoPor: "vale" } }).commit());
  });

  test("la validadora no certifica, aunque el retiro exista", async () => {
    await sembrar((db) => setDoc(doc(db, "retiros/retiro1"), retiro()));
    await assertFails(updateDoc(doc(como("vale"), "registros/validado1"), certificacion("vale")));
  });

  test("el administrador de otra planta no certifica", async () => {
    await sembrar((db) => setDoc(doc(db, "retiros/retiro1"), retiro()));
    await assertFails(updateDoc(doc(como("diego"), "registros/validado1"), certificacion("diego")));
  });

  test("si un depósito del lote no se puede certificar, no queda nada registrado", async () => {
    await assertFails(loteDeRetiro("carla", { registros: ["validado1", "pendiente1"] }).commit());
    assert.equal(await estadoDe("validado1"), "validado");
    let existe;
    await sembrar(async (db) => {
      existe = (await getDoc(doc(db, "retiros/retiro1"))).exists();
    });
    assert.equal(existe, false);
  });
});

// ------------------------------------------- incidencias que quedan atendidas

describe("retiros: incidencias atendidas", () => {
  const incidencia = (contenedor = "MIXTO1") => ({
    plantaId: "planta-a",
    contenedor,
    contenedorNombre: "Contenedor mixto",
    contaminante: "Vidrio",
    reportadoEn: 1,
    reportadoPor: "vale",
    atendida: false,
    atendidaEn: null,
    retiroId: null,
  });
  const atencion = { atendida: true, atendidaEn: Date.now(), retiroId: "retiro1" };

  test("se dan por atendidas en el mismo lote del retiro", async () => {
    await sembrar((db) => setDoc(doc(db, "incidencias/inc1"), incidencia()));
    const db = como("carla");
    const lote = loteDeRetiro("carla", { db });
    lote.update(doc(db, "incidencias/inc1"), atencion);
    await assertSucceeds(lote.commit());
  });

  test("no sin un retiro de ese contenedor", async () => {
    await sembrar((db) => setDoc(doc(db, "incidencias/inc1"), incidencia("VIDRI1")));
    const db = como("carla");
    const lote = loteDeRetiro("carla", { db });
    lote.update(doc(db, "incidencias/inc1"), atencion);
    await assertFails(lote.commit());
  });

  test("la validadora no las da por atendidas", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "incidencias/inc1"), incidencia());
      await setDoc(doc(db, "retiros/retiro1"), retiro());
    });
    await assertFails(updateDoc(doc(como("vale"), "incidencias/inc1"), atencion));
  });
});
