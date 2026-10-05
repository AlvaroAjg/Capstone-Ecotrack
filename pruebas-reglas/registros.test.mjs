// Tests de las reglas de los depósitos: cómo los registra un colaborador,
// cómo los valida el validador (etapa 1) y quién puede leerlos.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  addDoc,
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
import { DIA, MINUTO, como, anonimo, deposito, sembrar, usarEntorno } from "./comun.mjs";

usarEntorno();

// ------------------------------------------------------------------- crear

describe("registros: crear depósito", () => {
  const crear = (uid, datos) => addDoc(collection(como(uid), "registros"), datos);

  test("un depósito tal como lo manda la app", async () => {
    await assertSucceeds(crear("ana", deposito()));
  });

  test("vidrio en el contenedor de vidrio", async () => {
    await assertSucceeds(
      crear("ana", deposito({ contenedor: "VIDRI1", material: "Vidrio", talla: "L", kgDeclarado: 8 }))
    );
  });

  test("no a nombre de otra persona", async () => {
    await assertFails(crear("eva", deposito()));
  });

  test("no en un área que no es la suya (inflar la participación de otra)", async () => {
    await assertFails(crear("ana", deposito({ areaId: "fermentacion" })));
  });

  test("no en otra planta", async () => {
    await assertFails(crear("ana", deposito({ plantaId: "planta-b", contenedor: "BMIXT1" })));
  });

  test("no con su nombre: el depósito no lo guarda", async () => {
    await assertFails(crear("ana", deposito({ colaborador: "Ana" })));
  });

  test("no con fecha atrasada (cumplir una misión pasada)", async () => {
    await assertFails(crear("ana", deposito({ creadoEn: Date.now() - 8 * DIA })));
  });

  test("no con fecha futura", async () => {
    await assertFails(crear("ana", deposito({ creadoEn: Date.now() + DIA })));
  });

  test("sí con unos minutos de desfase en el reloj del teléfono", async () => {
    await assertSucceeds(crear("ana", deposito({ creadoEn: Date.now() - 3 * MINUTO })));
  });

  test("no con campos de más", async () => {
    await assertFails(crear("ana", deposito({ puntos: 1000 })));
  });

  test("no nace validado", async () => {
    await assertFails(crear("ana", deposito({ estado: "validado" })));
  });

  test("no con kilos confirmados de antemano", async () => {
    await assertFails(crear("ana", deposito({ kgConfirmado: 0.4 })));
  });

  test("no con la etapa del retiro ya llena", async () => {
    await assertFails(crear("ana", deposito({ retiroId: "retiro-falso" })));
  });

  test("no con kilos inventados", async () => {
    await assertFails(crear("ana", deposito({ kgDeclarado: 50 })));
  });

  test("no con una talla que no existe", async () => {
    await assertFails(crear("ana", deposito({ talla: "XXL", kgDeclarado: 3 })));
  });

  test("no en un contenedor que no existe", async () => {
    await assertFails(crear("ana", deposito({ contenedor: "NOEXIS" })));
  });

  test("no en un contenedor desactivado", async () => {
    await assertFails(crear("ana", deposito({ contenedor: "VIEJO1" })));
  });

  test("no en un contenedor de otra planta", async () => {
    await assertFails(crear("ana", deposito({ contenedor: "BMIXT1" })));
  });

  test("no plástico en el contenedor de vidrio", async () => {
    await assertFails(crear("ana", deposito({ contenedor: "VIDRI1" })));
  });

  test("quien todavía no tiene área no deposita", async () => {
    await assertFails(crear("beto", deposito({ colaboradorId: "beto", plantaId: null, areaId: null })));
  });

  test("la validadora y la administradora no depositan (luego se validarían solas)", async () => {
    await assertFails(crear("vale", deposito({ colaboradorId: "vale" })));
    await assertFails(crear("carla", deposito({ colaboradorId: "carla", areaId: null })));
  });
});

// --------------------------------------------------------- etapa 1: validar

describe("registros: validación", () => {
  const validacion = (uid, cambios = {}) => ({
    estado: "validado",
    kgConfirmado: 0.4,
    validadoEn: Date.now(),
    validadoPor: uid,
    ...cambios,
  });
  const validar = (uid, cambios) => updateDoc(doc(como(uid), "registros/pendiente1"), cambios);

  test("la validadora valida confirmando los kilos declarados", async () => {
    await assertSucceeds(validar("vale", validacion("vale")));
  });

  test("la administradora también puede, si la reemplaza", async () => {
    await assertSucceeds(validar("carla", validacion("carla")));
  });

  test("no puede inflar los kilos al validar", async () => {
    await assertFails(validar("vale", validacion("vale", { kgConfirmado: 40 })));
  });

  test("rechaza sin tocar los kilos", async () => {
    await assertSucceeds(validar("vale", { estado: "rechazado", validadoEn: Date.now(), validadoPor: "vale" }));
  });

  test("no rechaza y a la vez cambia los kilos", async () => {
    await assertFails(
      validar("vale", { estado: "rechazado", kgConfirmado: 40, validadoEn: Date.now(), validadoPor: "vale" })
    );
  });

  test("no firma a nombre de otro", async () => {
    await assertFails(validar("vale", validacion("carla")));
  });

  test("no cambia el material ni el área", async () => {
    await assertFails(validar("vale", validacion("vale", { material: "Vidrio" })));
    await assertFails(validar("vale", validacion("vale", { areaId: "fermentacion" })));
  });

  test("el administrador de otra planta no valida", async () => {
    await assertFails(validar("diego", validacion("diego")));
  });

  test("no se salta el retiro certificando", async () => {
    await assertFails(
      validar("vale", { estado: "certificado", certificadoEn: Date.now(), certificadoPor: "vale" })
    );
  });

  test("no vuelve a validar uno ya validado", async () => {
    await assertFails(
      updateDoc(doc(como("vale"), "registros/validado1"), {
        estado: "rechazado",
        validadoEn: Date.now(),
        validadoPor: "vale",
      })
    );
  });

  test("una colaboradora no valida su propio depósito", async () => {
    await assertFails(validar("ana", validacion("ana")));
  });

  test("nadie borra un registro", async () => {
    await assertFails(deleteDoc(doc(como("carla"), "registros/pendiente1")));
  });
});

// ----------------------------------------------------------------- lectura

describe("registros: quién los lee", () => {
  const registros = (uid) => collection(como(uid), "registros");

  test("la colaboradora lee todos los suyos", async () => {
    await assertSucceeds(getDocs(query(registros("ana"), where("colaboradorId", "==", "ana"))));
    await assertSucceeds(getDoc(doc(como("ana"), "registros/pendiente1")));
  });

  test("no los de una compañera", async () => {
    await assertFails(getDoc(doc(como("eva"), "registros/pendiente1")));
    await assertFails(getDocs(query(registros("eva"), where("colaboradorId", "==", "ana"))));
  });

  test("no todos los de la planta ni los del mes (el ranking sale del resumen)", async () => {
    await assertFails(getDocs(query(registros("eva"), where("plantaId", "==", "planta-a"))));
    await assertFails(getDocs(query(registros("eva"), where("creadoEn", ">=", 0))));
  });

  test("la validadora lee los pendientes de su planta", async () => {
    const q = query(registros("vale"), where("plantaId", "==", "planta-a"), where("estado", "==", "pendiente"));
    await assertSucceeds(getDocs(q));
  });

  test("la administradora lee todos los de su planta (retiros y reporte)", async () => {
    await assertSucceeds(getDocs(query(registros("carla"), where("plantaId", "==", "planta-a"))));
  });

  test("no los de otra planta", async () => {
    await assertFails(getDocs(query(registros("diego"), where("plantaId", "==", "planta-a"))));
    await assertFails(getDoc(doc(como("diego"), "registros/pendiente1")));
  });

  test("sin sesión no se lee ninguno", async () => {
    await assertFails(getDoc(doc(anonimo(), "registros/pendiente1")));
  });
});

// ---------------------------------------------------- lotes de la validadora

describe("registros: lotes de la validadora", () => {
  // Como validarRegistros en app/src/services/registros.ts: toda la tanda en
  // un writeBatch, que Firestore aplica completo o no aplica.
  async function sembrarPendientes(cantidad, cambios = {}) {
    const ids = [];
    await sembrar(async (db) => {
      const lote = writeBatch(db);
      for (let i = 0; i < cantidad; i++) {
        const id = `tanda${i}`;
        ids.push(id);
        lote.set(doc(db, "registros", id), deposito({ creadoEn: 1, ...cambios }));
      }
      await lote.commit();
    });
    return ids;
  }

  const validacion = () => ({
    estado: "validado",
    kgConfirmado: 0.4,
    validadoEn: Date.now(),
    validadoPor: "vale",
  });

  const reporte = (cambios = {}) => ({
    plantaId: "planta-a",
    contenedor: "MIXTO1",
    contenedorNombre: "Contenedor mixto",
    contaminante: "Vidrio",
    reportadoEn: Date.now(),
    reportadoPor: "vale",
    atendida: false,
    atendidaEn: null,
    retiroId: null,
    ...cambios,
  });

  async function estadoDe(id) {
    let estado;
    await sembrar(async (db) => {
      estado = (await getDoc(doc(db, "registros", id))).data().estado;
    });
    return estado;
  }

  test("valida una tanda de 100 depósitos en un solo lote", async () => {
    const ids = await sembrarPendientes(100);
    const db = como("vale");
    const lote = writeBatch(db);
    for (const id of ids) lote.update(doc(db, "registros", id), validacion());
    await assertSucceeds(lote.commit());
    assert.equal(await estadoDe("tanda99"), "validado");
  });

  test("rechaza un contenedor completo en un solo lote", async () => {
    const ids = await sembrarPendientes(5);
    const db = como("vale");
    const lote = writeBatch(db);
    for (const id of ids) {
      lote.update(doc(db, "registros", id), { estado: "rechazado", validadoEn: Date.now(), validadoPor: "vale" });
    }
    await assertSucceeds(lote.commit());
  });

  test("reporta la contaminación y valida sus depósitos en el mismo lote", async () => {
    const ids = await sembrarPendientes(3);
    const db = como("vale");
    const lote = writeBatch(db);
    for (const id of ids) lote.update(doc(db, "registros", id), validacion());
    lote.set(doc(collection(db, "incidencias")), reporte());
    await assertSucceeds(lote.commit());
  });

  test("si un depósito del lote no se puede validar, no se valida ninguno", async () => {
    const ids = await sembrarPendientes(3);
    await sembrar((db) =>
      setDoc(
        doc(db, "registros/deOtraPlanta"),
        deposito({ creadoEn: 1, colaboradorId: "fran", plantaId: "planta-b", areaId: "bodega-b", contenedor: "BMIXT1" })
      )
    );
    const db = como("vale");
    const lote = writeBatch(db);
    for (const id of [...ids, "deOtraPlanta"]) lote.update(doc(db, "registros", id), validacion());
    await assertFails(lote.commit());
    // Los de su planta, que sí podía validar, siguen pendientes: no quedó a medias.
    for (const id of ids) assert.equal(await estadoDe(id), "pendiente");
  });

  test("si el reporte de contaminación es inválido, tampoco se validan los depósitos", async () => {
    const ids = await sembrarPendientes(2);
    const db = como("vale");
    const lote = writeBatch(db);
    for (const id of ids) lote.update(doc(db, "registros", id), validacion());
    lote.set(doc(collection(db, "incidencias")), reporte({ contaminante: "Algo que no está en la lista" }));
    await assertFails(lote.commit());
    for (const id of ids) assert.equal(await estadoDe(id), "pendiente");
  });
});
