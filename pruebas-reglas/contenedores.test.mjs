// Tests de las reglas de los contenedores del punto limpio y de los reportes
// de contaminación (incidencias).

import { describe, test } from "node:test";
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
} from "firebase/firestore";
import { como, sembrar, usarEntorno } from "./comun.mjs";

usarEntorno();

// -------------------------------------------------------------- contenedores

describe("contenedores", () => {
  const nuevo = (cambios = {}) => ({
    plantaId: "planta-a",
    punto: "Punto limpio central",
    material: "Papel/cartón",
    activo: true,
    creadoEn: Date.now(),
    ...cambios,
  });
  const deLaPlanta = (uid, plantaId) =>
    query(collection(como(uid), "contenedores"), where("plantaId", "==", plantaId));

  test("cualquiera con sesión lee un contenedor si conoce su código (lo escaneó)", async () => {
    await assertSucceeds(getDoc(doc(como("ana"), "contenedores/MIXTO1")));
  });

  test("un colaborador no lista los contenedores para sacar sus códigos", async () => {
    await assertFails(getDocs(deLaPlanta("ana", "planta-a")));
  });

  test("la validadora y la administradora listan los de su planta", async () => {
    await assertSucceeds(getDocs(deLaPlanta("vale", "planta-a")));
    await assertSucceeds(getDocs(deLaPlanta("carla", "planta-a")));
  });

  test("no los de otra planta", async () => {
    await assertFails(getDocs(deLaPlanta("carla", "planta-b")));
  });

  test("la administradora crea un contenedor de un material", async () => {
    await assertSucceeds(setDoc(doc(como("carla"), "contenedores/PAPEL1"), nuevo()));
  });

  test("y uno mixto", async () => {
    await assertSucceeds(setDoc(doc(como("carla"), "contenedores/MIXTO2"), nuevo({ material: null })));
  });

  test("no sin el nombre de su punto limpio", async () => {
    await assertFails(setDoc(doc(como("carla"), "contenedores/PAPEL1"), nuevo({ punto: "" })));
  });

  test("no de un material que no está en la tabla", async () => {
    await assertFails(setDoc(doc(como("carla"), "contenedores/PAPEL1"), nuevo({ material: "Electrónicos" })));
  });

  test("no ya desactivado ni con campos de más", async () => {
    await assertFails(setDoc(doc(como("carla"), "contenedores/PAPEL1"), nuevo({ activo: false })));
    await assertFails(setDoc(doc(como("carla"), "contenedores/PAPEL1"), nuevo({ torreId: "x" })));
  });

  test("no en otra planta", async () => {
    await assertFails(setDoc(doc(como("carla"), "contenedores/PAPEL1"), nuevo({ plantaId: "planta-b" })));
  });

  test("la validadora y los colaboradores no crean contenedores", async () => {
    await assertFails(setDoc(doc(como("vale"), "contenedores/PAPEL1"), nuevo()));
    await assertFails(setDoc(doc(como("ana"), "contenedores/PAPEL1"), nuevo()));
  });

  test("la administradora desactiva un contenedor (al cambiarle el código)", async () => {
    await assertSucceeds(updateDoc(doc(como("carla"), "contenedores/MIXTO1"), { activo: false }));
  });

  test("no lo reactiva ni le cambia el material", async () => {
    await assertFails(updateDoc(doc(como("carla"), "contenedores/VIEJO1"), { activo: true }));
    await assertFails(updateDoc(doc(como("carla"), "contenedores/MIXTO1"), { material: "Vidrio" }));
  });

  test("no desactiva los de otra planta", async () => {
    await assertFails(updateDoc(doc(como("diego"), "contenedores/MIXTO1"), { activo: false }));
  });

  test("nadie borra un contenedor", async () => {
    await assertFails(deleteDoc(doc(como("carla"), "contenedores/MIXTO1")));
  });
});

// --------------------------------------------------------------- incidencias

describe("incidencias", () => {
  const reporte = (uid, cambios = {}) => ({
    plantaId: "planta-a",
    contenedor: "MIXTO1",
    contenedorNombre: "Contenedor mixto",
    contaminante: "Vidrio",
    reportadoEn: Date.now(),
    reportadoPor: uid,
    atendida: false,
    atendidaEn: null,
    retiroId: null,
    ...cambios,
  });
  const reportar = (uid, cambios) => addDoc(collection(como(uid), "incidencias"), reporte(uid, cambios));

  test("la validadora reporta un contenedor contaminado", async () => {
    await assertSucceeds(reportar("vale"));
  });

  test("la administradora también", async () => {
    await assertSucceeds(reportar("carla"));
  });

  test("un colaborador no reporta", async () => {
    await assertFails(reportar("ana"));
  });

  test("no a nombre de otra persona", async () => {
    await assertFails(reportar("vale", { reportadoPor: "carla" }));
  });

  test("no con un contaminante que no está en la lista", async () => {
    await assertFails(reportar("vale", { contaminante: "Algo que no está en la lista" }));
  });

  test("no ya atendido", async () => {
    await assertFails(reportar("vale", { atendida: true, atendidaEn: Date.now() }));
  });

  test("no sobre un contenedor de otra planta ni en otra planta", async () => {
    await assertFails(reportar("vale", { contenedor: "BMIXT1" }));
    await assertFails(reportar("vale", { plantaId: "planta-b", contenedor: "BMIXT1" }));
  });

  test("no sobre un contenedor que no existe", async () => {
    await assertFails(reportar("vale", { contenedor: "NOEXIS" }));
  });

  test("las personas de la planta leen sus incidencias; las de otra planta, no", async () => {
    await sembrar((db) => setDoc(doc(db, "incidencias/inc1"), reporte("vale")));
    const de = (uid, plantaId) => query(collection(como(uid), "incidencias"), where("plantaId", "==", plantaId));
    await assertSucceeds(getDocs(de("ana", "planta-a")));
    await assertFails(getDocs(de("fran", "planta-a")));
    await assertFails(getDoc(doc(como("diego"), "incidencias/inc1")));
  });

  test("nadie la edita a mano ni la borra (se atiende al registrar el retiro)", async () => {
    await sembrar((db) => setDoc(doc(db, "incidencias/inc1"), reporte("vale")));
    await assertFails(updateDoc(doc(como("vale"), "incidencias/inc1"), { contaminante: "Metal" }));
    await assertFails(deleteDoc(doc(como("carla"), "incidencias/inc1")));
  });
});
