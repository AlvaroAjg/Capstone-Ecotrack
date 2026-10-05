// Tests de las reglas de la planta: sus datos, sus áreas, su campaña y el
// código que habilita a su administrador.

import { describe, test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { AREAS, anonimo, como, usarEntorno } from "./comun.mjs";

usarEntorno();

// ---------------------------------------------------------------- codigosRol

describe("codigosRol", () => {
  test("nadie los lee, ni siquiera el administrador de la planta", async () => {
    await assertFails(getDoc(doc(como("carla"), "codigosRol/planta-a")));
  });

  test("un colaborador no lee el código para hacerse administrador", async () => {
    await assertFails(getDoc(doc(como("ana"), "codigosRol/planta-a")));
  });

  test("un administrador no cambia el código de su planta", async () => {
    await assertFails(setDoc(doc(como("carla"), "codigosRol/planta-a"), { administrador: "OTRO" }));
  });

  test("ni el de otra planta", async () => {
    await assertFails(setDoc(doc(como("carla"), "codigosRol/planta-b"), { administrador: "MIO" }));
  });
});

// ------------------------------------------------------------------- plantas

describe("plantas", () => {
  test("cualquiera con sesión lee su planta", async () => {
    await assertSucceeds(getDoc(doc(como("ana"), "plantas/planta-a")));
  });

  test("sin sesión no se lee", async () => {
    await assertFails(getDoc(doc(anonimo(), "plantas/planta-a")));
  });

  test("nadie crea una planta desde la app, ni un administrador", async () => {
    await assertFails(setDoc(doc(como("carla"), "plantas/planta-c"), { nombre: "Planta C", empresa: "X" }));
  });

  test("un administrador no edita su planta desde la app", async () => {
    await assertFails(updateDoc(doc(como("carla"), "plantas/planta-a"), { nombre: "Otro nombre" }));
  });
});

// --------------------------------------------------------------------- áreas

describe("áreas", () => {
  const nueva = (cambios = {}) => ({
    plantaId: "planta-a",
    nombre: "Laboratorio",
    codigo: "LAB-4444",
    dotacion: 4,
    ...cambios,
  });

  test("cualquiera con sesión busca su área por el código", async () => {
    const q = query(collection(como("beto"), "areas"), where("codigo", "==", "EMB-1111"));
    await assertSucceeds(getDocs(q));
  });

  test("sin sesión no se leen", async () => {
    await assertFails(getDocs(collection(anonimo(), "areas")));
  });

  test("el administrador crea un área de su planta", async () => {
    await assertSucceeds(setDoc(doc(como("carla"), "areas/laboratorio"), nueva()));
  });

  test("no en otra planta", async () => {
    await assertFails(setDoc(doc(como("carla"), "areas/laboratorio"), nueva({ plantaId: "planta-b" })));
  });

  test("no sin nombre", async () => {
    await assertFails(setDoc(doc(como("carla"), "areas/laboratorio"), nueva({ nombre: "" })));
  });

  test("no con una dotación negativa o con decimales", async () => {
    await assertFails(setDoc(doc(como("carla"), "areas/laboratorio"), nueva({ dotacion: -1 })));
    await assertFails(setDoc(doc(como("carla"), "areas/laboratorio"), nueva({ dotacion: 2.5 })));
  });

  test("no con campos de más", async () => {
    await assertFails(setDoc(doc(como("carla"), "areas/laboratorio"), nueva({ participacion: 100 })));
  });

  test("un colaborador o la validadora no crean áreas", async () => {
    await assertFails(setDoc(doc(como("ana"), "areas/laboratorio"), nueva()));
    await assertFails(setDoc(doc(como("vale"), "areas/laboratorio"), nueva()));
  });

  test("el administrador cambia la dotación de un área de su planta", async () => {
    await assertSucceeds(updateDoc(doc(como("carla"), "areas/embotellado"), { dotacion: 12 }));
  });

  test("el de otra planta no la cambia", async () => {
    await assertFails(updateDoc(doc(como("diego"), "areas/embotellado"), { dotacion: 12 }));
  });

  test("no la pasa a otra planta", async () => {
    await assertFails(updateDoc(doc(como("carla"), "areas/embotellado"), { plantaId: "planta-b" }));
  });

  test("un colaborador no infla la dotación ni el nombre de su área", async () => {
    await assertFails(updateDoc(doc(como("ana"), "areas/embotellado"), { dotacion: 1 }));
    await assertFails(
      updateDoc(doc(como("ana"), "areas/embotellado"), { ...AREAS.embotellado, nombre: "Ganadores" })
    );
  });

  test("nadie borra un área", async () => {
    await assertFails(deleteDoc(doc(como("carla"), "areas/embotellado")));
  });
});

// ------------------------------------------------------------------ campañas

describe("campañas", () => {
  const campana = (cambios = {}) => ({
    nombre: "Octubre sin PET en la basura común",
    metaParticipacion: 60,
    incentivo: "Desayuno para el área con mayor participación",
    terminaEn: Date.now() + 30 * 24 * 60 * 60 * 1000,
    actualizadaEn: Date.now(),
    actualizadaPor: "carla",
    ...cambios,
  });
  const guardar = (uid, datos, plantaId = "planta-a") => setDoc(doc(como(uid), "campanas", plantaId), datos);

  test("la administradora define la campaña de su planta", async () => {
    await assertSucceeds(guardar("carla", campana()));
  });

  test("y la cambia", async () => {
    await guardar("carla", campana());
    await assertSucceeds(
      updateDoc(doc(como("carla"), "campanas/planta-a"), { incentivo: "Almuerzo especial", actualizadaEn: Date.now() })
    );
  });

  test("y la termina", async () => {
    await guardar("carla", campana());
    await assertSucceeds(deleteDoc(doc(como("carla"), "campanas/planta-a")));
  });

  test("no la de otra planta", async () => {
    await assertFails(guardar("carla", campana(), "planta-b"));
  });

  test("la validadora y los colaboradores no la cambian", async () => {
    await assertFails(guardar("vale", campana({ actualizadaPor: "vale" })));
    await assertFails(guardar("ana", campana({ actualizadaPor: "ana" })));
  });

  test("la meta es un % de participación entre 1 y 100", async () => {
    await assertFails(guardar("carla", campana({ metaParticipacion: 0 })));
    await assertFails(guardar("carla", campana({ metaParticipacion: 120 })));
    await assertFails(guardar("carla", campana({ metaParticipacion: 55.5 })));
  });

  test("no con una meta en kilos", async () => {
    await assertFails(guardar("carla", campana({ metaKg: 200 })));
  });

  test("no sin nombre ni a nombre de otra persona", async () => {
    await assertFails(guardar("carla", campana({ nombre: "" })));
    await assertFails(guardar("carla", campana({ actualizadaPor: "diego" })));
  });

  test("cualquiera con sesión la lee (se muestra en el inicio)", async () => {
    await guardar("carla", campana());
    await assertSucceeds(getDoc(doc(como("ana"), "campanas/planta-a")));
    await assertFails(getDoc(doc(anonimo(), "campanas/planta-a")));
  });
});
