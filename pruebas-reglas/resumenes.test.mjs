// Tests de las reglas del resumen del mes por área: con él el colaborador ve
// el ranking de áreas sin leer depósitos ajenos, y las reglas impiden que
// alguien infle los números de su área.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { como, deposito, sembrar, usarEntorno } from "./comun.mjs";

usarEntorno();

/** "AAAA-MM" de ahora en Chile (UTC-3), como lo calcula la app. */
function mesActual() {
  const ahora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MES = mesActual();

/**
 * Como lo hará crearRegistro en la app: el depósito, la suma en el resumen y,
 * si es el primero del mes, la marca de participación, en un solo lote.
 * `ajustes` permite estropear una parte para probar que se rechaza.
 */
function depositar(uid, { primero = true, areaId, mes = MES, plantaId = "planta-a", suma = {}, ...ajustes } = {}) {
  const db = como(uid);
  const lote = writeBatch(db);
  const registro = doc(collection(db, "registros"));
  const area = areaId ?? (uid === "eva" ? "fermentacion" : "embotellado");
  lote.set(registro, deposito({ colaboradorId: uid, areaId: uid === "eva" ? "fermentacion" : "embotellado" }));
  lote.set(
    doc(db, "resumenes", `${plantaId}_${mes}`),
    {
      plantaId,
      mes,
      areas: {
        [area]: {
          depositos: increment(suma.depositos ?? 1),
          participantes: increment(suma.participantes ?? (primero ? 1 : 0)),
        },
        ...(ajustes.otrasAreas ?? {}),
      },
      ultimoRegistro: ajustes.ultimoRegistro ?? registro.id,
    },
    { merge: true }
  );
  if (primero) lote.set(doc(db, "participaciones", `${mes}_${uid}`), { uid, mes });
  return lote.commit();
}

async function resumen() {
  let datos;
  await sembrar(async (db) => {
    datos = (await getDoc(doc(db, "resumenes", `planta-a_${MES}`))).data();
  });
  return datos;
}

// ---------------------------------------------------------------- sumar

describe("resúmenes: cada depósito suma a su área", () => {
  test("el primer depósito del mes crea el resumen y cuenta a la persona", async () => {
    await assertSucceeds(depositar("ana"));
    assert.deepEqual((await resumen()).areas, { embotellado: { depositos: 1, participantes: 1 } });
  });

  test("el segundo depósito suma un depósito, pero no otro participante", async () => {
    await depositar("ana");
    await assertSucceeds(depositar("ana", { primero: false }));
    assert.deepEqual((await resumen()).areas.embotellado, { depositos: 2, participantes: 1 });
  });

  test("otra persona suma a su propia área", async () => {
    await depositar("ana");
    await assertSucceeds(depositar("eva"));
    const { areas } = await resumen();
    assert.deepEqual(areas.fermentacion, { depositos: 1, participantes: 1 });
    assert.deepEqual(areas.embotellado, { depositos: 1, participantes: 1 });
  });

  test("nadie se cuenta dos veces como participante en el mes", async () => {
    await depositar("ana");
    await assertFails(depositar("ana", { primero: false, suma: { participantes: 1 } }));
    await assertFails(depositar("ana", { primero: true }));
  });

  test("no se cuenta como participante sin crear su marca", async () => {
    await assertFails(depositar("ana", { primero: false, suma: { participantes: 1 } }));
  });

  test("no suma más de un depósito por depósito", async () => {
    await assertFails(depositar("ana", { suma: { depositos: 2 } }));
  });

  test("no suma a otra área que la suya", async () => {
    await assertFails(depositar("ana", { areaId: "fermentacion" }));
  });

  test("no toca los números de otra área", async () => {
    await depositar("eva");
    await assertFails(
      depositar("ana", { otrasAreas: { fermentacion: { depositos: increment(-1), participantes: increment(0) } } })
    );
  });

  test("no suma sin un depósito nuevo en el mismo lote", async () => {
    await assertFails(depositar("ana", { ultimoRegistro: "pendiente1" }));
    await assertFails(
      setDoc(
        doc(como("ana"), "resumenes", `planta-a_${MES}`),
        { plantaId: "planta-a", mes: MES, areas: { embotellado: { depositos: 5, participantes: 5 } }, ultimoRegistro: "pendiente1" }
      )
    );
  });

  test("no vuelve a sumar un depósito anterior del mismo mes", async () => {
    // Un depósito de hoy que ya sumó: apuntar a él de nuevo inflaría el área.
    await sembrar((db) => setDoc(doc(db, "registros/deHoy"), deposito()));
    await assertFails(
      setDoc(
        doc(como("ana"), "resumenes", `planta-a_${MES}`),
        { plantaId: "planta-a", mes: MES, areas: { embotellado: { depositos: 1, participantes: 0 } }, ultimoRegistro: "deHoy" }
      )
    );
  });

  test("no suma a otro mes", async () => {
    await assertFails(depositar("ana", { mes: "2020-01" }));
  });

  test("no suma al resumen de otra planta", async () => {
    await assertFails(depositar("ana", { plantaId: "planta-b" }));
  });

  test("la validadora y la administradora no tocan el resumen", async () => {
    const intentar = (uid) =>
      setDoc(
        doc(como(uid), "resumenes", `planta-a_${MES}`),
        { plantaId: "planta-a", mes: MES, areas: { embotellado: { depositos: 1, participantes: 1 } }, ultimoRegistro: "pendiente1" }
      );
    await assertFails(intentar("vale"));
    await assertFails(intentar("carla"));
  });
});

// ---------------------------------------------------------------- leer

describe("resúmenes y participaciones: quién los lee", () => {
  test("las personas de la planta leen su resumen, aunque todavía no exista", async () => {
    await assertSucceeds(getDoc(doc(como("ana"), "resumenes", `planta-a_${MES}`)));
    await depositar("ana");
    await assertSucceeds(getDoc(doc(como("eva"), "resumenes", `planta-a_${MES}`)));
    const q = query(collection(como("carla"), "resumenes"), where("plantaId", "==", "planta-a"));
    await assertSucceeds(getDocs(q));
  });

  test("las de otra planta, no", async () => {
    await depositar("ana");
    await assertFails(getDoc(doc(como("fran"), "resumenes", `planta-a_${MES}`)));
    await assertFails(getDocs(query(collection(como("fran"), "resumenes"), where("plantaId", "==", "planta-a"))));
  });

  test("cada quien lee su propia marca de participación, aunque no exista", async () => {
    await assertSucceeds(getDoc(doc(como("ana"), "participaciones", `${MES}_ana`)));
  });

  test("no la de otra persona", async () => {
    await assertFails(getDoc(doc(como("eva"), "participaciones", `${MES}_ana`)));
  });

  test("nadie crea la marca de otra persona", async () => {
    await assertFails(setDoc(doc(como("eva"), "participaciones", `${MES}_ana`), { uid: "ana", mes: MES }));
    await assertFails(setDoc(doc(como("eva"), "participaciones", `${MES}_ana`), { uid: "eva", mes: MES }));
  });
});
