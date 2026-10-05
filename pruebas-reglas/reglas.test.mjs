// Tests de firestore.rules contra el emulador de Firestore.
//
// Cada regla que protege la cadena de verificación tiene al menos un caso que
// debe permitirse (lo que hace la app normalmente) y uno que debe rechazarse
// (lo que intentaría alguien escribiendo directo a la base de datos). Correr
// con `npm test` desde esta carpeta; ver README.md.

import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import assert from "node:assert/strict";

// Los rechazos esperados llenarían la salida de PERMISSION_DENIED.
setLogLevel("silent");

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

let entorno;

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: "demo-ecotrack",
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

after(async () => {
  await entorno?.cleanup();
});

// ------------------------------------------------------------------ datos base
//
// Condominio con dos torres. En la A viven Ana y Eva (residentes) y Carla (su
// administradora); Beto recién creó su cuenta y aún no tiene torre; Diego
// administra la B y Gus es el gestor.

const PERFILES = {
  ana: {
    nombre: "Ana",
    email: "ana@test.cl",
    rol: "residente",
    depto: "Depto 305",
    torreId: "torre-a",
    torreNombre: "Torre A",
  },
  eva: {
    nombre: "Eva",
    email: "eva@test.cl",
    rol: "residente",
    depto: "Depto 101",
    torreId: "torre-a",
    torreNombre: "Torre A",
  },
  beto: {
    nombre: "Beto",
    email: "beto@test.cl",
    rol: "residente",
    depto: "",
    torreId: null,
    torreNombre: null,
  },
  carla: {
    nombre: "Carla",
    email: "carla@test.cl",
    rol: "administrador",
    depto: "Administración",
    torreId: "torre-a",
    torreNombre: "Torre A",
    codigoRolUsado: "ADM-A",
  },
  diego: {
    nombre: "Diego",
    email: "diego@test.cl",
    rol: "administrador",
    depto: "Administración",
    torreId: "torre-b",
    torreNombre: "Torre B",
    codigoRolUsado: "ADM-B",
  },
  gus: {
    nombre: "Recicla Sur",
    email: "gus@test.cl",
    rol: "gestor",
    depto: "Gestor externo",
    torreId: null,
    torreNombre: null,
    codigoRolUsado: "GES-1",
  },
};

/** Depósito tal como lo crea `crearRegistro` en app/src/services/registros.ts. */
function deposito(cambios = {}) {
  return {
    residenteId: "ana",
    residente: "Ana",
    depto: "Depto 305",
    torreId: "torre-a",
    torreNombre: "Torre A",
    material: "Plástico",
    talla: "M",
    kgDeclarado: 0.4,
    kgConfirmado: null,
    contenedor: "MIXTO1",
    estado: "pendiente",
    creadoEn: Date.now(),
    validadoEn: null,
    validadoPor: null,
    certificadoEn: null,
    certificadoPor: null,
    codigo: null,
    codigoRetiro: null,
    ...cambios,
  };
}

beforeEach(async () => {
  await entorno.clearFirestore();
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, "torres/torre-a"), {
      nombre: "Torre A",
      condominio: "Condominio Piloto",
      codigoInvitacion: "ECO-TORRE-A",
      metaKg: 200,
      deptosTotales: 24,
    });
    await setDoc(doc(db, "torres/torre-b"), {
      nombre: "Torre B",
      condominio: "Condominio Piloto",
      codigoInvitacion: "ECO-TORRE-B",
      metaKg: 150,
      deptosTotales: 19,
    });
    await setDoc(doc(db, "codigosRol/torre-a"), { administrador: "ADM-A" });
    await setDoc(doc(db, "codigosRol/torre-b"), { administrador: "ADM-B" });
    await setDoc(doc(db, "codigosRol/gestor"), { codigo: "GES-1" });

    for (const [uid, perfil] of Object.entries(PERFILES)) {
      await setDoc(doc(db, "usuarios", uid), { ...perfil, creadoEn: 1 });
    }

    const contenedor = (torreId, material, activo = true) => ({
      torreId,
      material,
      activo,
      creadoEn: 1,
    });
    await setDoc(doc(db, "contenedores/MIXTO1"), contenedor("torre-a", null));
    await setDoc(doc(db, "contenedores/VIDRI1"), contenedor("torre-a", "Vidrio"));
    await setDoc(doc(db, "contenedores/VIEJO1"), contenedor("torre-a", null, false));
    await setDoc(doc(db, "contenedores/BMIXT1"), contenedor("torre-b", null));

    await setDoc(doc(db, "registros/pendiente1"), deposito({ creadoEn: 1 }));
    await setDoc(
      doc(db, "registros/validado1"),
      deposito({ creadoEn: 1, estado: "validado", kgConfirmado: 0.4, validadoEn: 2, validadoPor: "carla" })
    );
  });
});

/** Firestore visto por un usuario con sesión iniciada. */
function como(uid) {
  return entorno.authenticatedContext(uid).firestore();
}

// ------------------------------------------------ registros: etapa 2 (gestor)

describe("registros: certificación del gestor", () => {
  const certificacion = (cambios = {}) => ({
    estado: "certificado",
    certificadoEn: Date.now(),
    certificadoPor: "gus",
    codigo: "ECO-AAAA-BBBB",
    codigoRetiro: "RET-CCCC",
    ...cambios,
  });

  test("certifica el lote validado en un writeBatch, como la app", async () => {
    const db = como("gus");
    const lote = writeBatch(db);
    lote.update(doc(db, "registros/validado1"), certificacion());
    await assertSucceeds(lote.commit());
  });

  test("no firma a nombre de otro", async () => {
    await assertFails(
      updateDoc(doc(como("gus"), "registros/validado1"), certificacion({ certificadoPor: "carla" }))
    );
  });

  test("no certifica un depósito pendiente", async () => {
    await assertFails(updateDoc(doc(como("gus"), "registros/pendiente1"), certificacion()));
  });

  test("no toca los kilos confirmados", async () => {
    await assertFails(
      updateDoc(doc(como("gus"), "registros/validado1"), certificacion({ kgConfirmado: 40 }))
    );
  });

  test("un administrador no certifica", async () => {
    await assertFails(
      updateDoc(doc(como("carla"), "registros/validado1"), certificacion({ certificadoPor: "carla" }))
    );
  });

  test("nadie borra un registro", async () => {
    await assertFails(deleteDoc(doc(como("gus"), "registros/validado1")));
  });
});
