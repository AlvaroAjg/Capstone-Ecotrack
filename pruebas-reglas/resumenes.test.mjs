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
const DIA = 24 * 60 * 60 * 1000;

/** Lunes de la semana de ahora en Chile (UTC-3), en días desde 1970, como semanaDe en la app. */
function semanaActual() {
  const dia = Math.floor((Date.now() - 3 * 60 * 60 * 1000) / DIA);
  return dia - ((dia + 3) % 7);
}

const SEMANA = semanaActual();
const CLAVE = String(SEMANA);

/**
 * Como lo hará crearRegistro en la app: el depósito, la suma en el resumen, la
 * marca de participación del mes si es el primero y la constancia de la semana
 * con los gramos con tope, en un solo lote. `ajustes` permite estropear una
 * parte para probar que se rechaza.
 */
function depositar(
  uid,
  {
    primero = true,
    primeraSemana = true,
    gramosAntes = 0,
    areaId,
    mes = MES,
    plantaId = "planta-a",
    semana = SEMANA,
    registro: cambiosRegistro = {},
    suma = {},
    ...ajustes
  } = {}
) {
  const db = como(uid);
  const lote = writeBatch(db);
  const registro = doc(collection(db, "registros"));
  const area = areaId ?? (uid === "eva" ? "fermentacion" : "embotellado");
  const datosRegistro = deposito({ colaboradorId: uid, areaId: uid === "eva" ? "fermentacion" : "embotellado", ...cambiosRegistro });
  const gramos = ajustes.gramos ?? Math.min(5000, gramosAntes + Math.round(datosRegistro.kgDeclarado * 1000));
  lote.set(registro, datosRegistro);
  const conteo = {
    depositos: increment(suma.depositos ?? 1),
    participantes: increment(suma.participantes ?? (primero ? 1 : 0)),
    gramos: increment(suma.gramos ?? gramos - gramosAntes),
  };
  if (primeraSemana || suma.semana) conteo.semanas = { [String(semana)]: increment(suma.semana ?? 1) };
  lote.set(
    doc(db, "resumenes", `${plantaId}_${mes}`),
    {
      plantaId,
      mes,
      areas: { [area]: conteo, ...(ajustes.otrasAreas ?? {}) },
      ultimoRegistro: ajustes.ultimoRegistro ?? registro.id,
      ultimaSemana: semana,
    },
    { merge: true }
  );
  if (primero) lote.set(doc(db, "participaciones", `${mes}_${uid}`), { uid, mes });
  if (!ajustes.sinConstancia) {
    lote.set(doc(db, "constancias", `${mes}_${semana}_${uid}`), {
      uid,
      mes,
      semana,
      gramos,
      ultimoRegistro: ajustes.constanciaApuntaA ?? registro.id,
    });
  }
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
    assert.deepEqual((await resumen()).areas, {
      embotellado: { depositos: 1, participantes: 1, semanas: { [CLAVE]: 1 }, gramos: 400 },
    });
  });

  test("el segundo depósito suma un depósito, pero no otro participante", async () => {
    await depositar("ana");
    await assertSucceeds(depositar("ana", { primero: false, primeraSemana: false, gramosAntes: 400 }));
    assert.deepEqual((await resumen()).areas.embotellado, {
      depositos: 2,
      participantes: 1,
      semanas: { [CLAVE]: 1 },
      gramos: 800,
    });
  });

  test("otra persona suma a su propia área", async () => {
    await depositar("ana");
    await assertSucceeds(depositar("eva"));
    const { areas } = await resumen();
    assert.deepEqual(areas.fermentacion, { depositos: 1, participantes: 1, semanas: { [CLAVE]: 1 }, gramos: 400 });
    assert.deepEqual(areas.embotellado, { depositos: 1, participantes: 1, semanas: { [CLAVE]: 1 }, gramos: 400 });
  });

  test("nadie se cuenta dos veces como participante en el mes", async () => {
    await depositar("ana");
    await assertFails(depositar("ana", { primero: false, primeraSemana: false, gramosAntes: 400, suma: { participantes: 1 } }));
    await assertFails(depositar("ana", { primero: true, primeraSemana: false, gramosAntes: 400 }));
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
      depositar("ana", { otrasAreas: { fermentacion: { depositos: increment(-1), participantes: increment(0), gramos: increment(0) } } })
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

// ------------------------------------------------------- constancia y kilos

describe("resúmenes: constancia semanal y kilos con tope", () => {
  async function conSemanaAvanzada(gramos) {
    await sembrar(async (db) => {
      await setDoc(doc(db, "participaciones", `${MES}_ana`), { uid: "ana", mes: MES });
      await setDoc(doc(db, "constancias", `${MES}_${SEMANA}_ana`), { uid: "ana", mes: MES, semana: SEMANA, gramos, ultimoRegistro: "antes" });
      await setDoc(doc(db, "resumenes", `planta-a_${MES}`), {
        plantaId: "planta-a",
        mes: MES,
        areas: { embotellado: { depositos: 9, participantes: 1, semanas: { [CLAVE]: 1 }, gramos } },
        ultimoRegistro: "antes",
        ultimaSemana: SEMANA,
      });
    });
  }

  test("los kilos de una persona en la semana tienen tope de 5 kg", async () => {
    await conSemanaAvanzada(4800);
    await assertSucceeds(depositar("ana", { primero: false, primeraSemana: false, gramosAntes: 4800 }));
    assert.equal((await resumen()).areas.embotellado.gramos, 5000);
  });

  test("con el tope cumplido, el depósito cuenta pero no suma kilos", async () => {
    await conSemanaAvanzada(5000);
    await assertSucceeds(depositar("ana", { primero: false, primeraSemana: false, gramosAntes: 5000 }));
    assert.deepEqual((await resumen()).areas.embotellado, { depositos: 10, participantes: 1, semanas: { [CLAVE]: 1 }, gramos: 5000 });
  });

  test("una bolsa grande no pasa el tope de la semana", async () => {
    const vidrio = { material: "Vidrio", talla: "XL", kgDeclarado: 12, contenedor: "VIDRI1" };
    await assertFails(depositar("ana", { registro: vidrio, gramos: 12000 }));
    await assertSucceeds(depositar("ana", { registro: vidrio }));
    assert.equal((await resumen()).areas.embotellado.gramos, 5000);
  });

  test("no suma más kilos que los del depósito", async () => {
    await assertFails(depositar("ana", { suma: { gramos: 1000 } }));
    await assertFails(depositar("ana", { gramos: 1000 }));
  });

  test("nadie se cuenta dos veces en la misma semana", async () => {
    await depositar("ana");
    await assertFails(depositar("ana", { primero: false, primeraSemana: false, gramosAntes: 400, suma: { semana: 1 } }));
  });

  test("no se cuenta en la semana sin crear su constancia", async () => {
    await assertFails(depositar("ana", { sinConstancia: true }));
  });

  test("no suma a otra semana que la del depósito", async () => {
    await assertFails(depositar("ana", { semana: SEMANA - 7 }));
  });

  test("la constancia no sube sin un depósito nuevo en el mismo lote", async () => {
    await assertFails(depositar("ana", { constanciaApuntaA: "pendiente1" }));
    await assertFails(
      setDoc(doc(como("ana"), "constancias", `${MES}_${SEMANA}_ana`), {
        uid: "ana",
        mes: MES,
        semana: SEMANA,
        gramos: 400,
        ultimoRegistro: "pendiente1",
      })
    );
  });

  test("cada quien lee su constancia, no la de otra persona", async () => {
    await assertSucceeds(getDoc(doc(como("ana"), "constancias", `${MES}_${SEMANA}_ana`)));
    await assertFails(getDoc(doc(como("eva"), "constancias", `${MES}_${SEMANA}_ana`)));
  });

  test("nadie escribe la constancia de otra persona", async () => {
    await assertFails(
      setDoc(doc(como("eva"), "constancias", `${MES}_${SEMANA}_ana`), { uid: "ana", mes: MES, semana: SEMANA, gramos: 400, ultimoRegistro: "x" })
    );
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
