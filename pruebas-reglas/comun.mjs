// Base común de los tests de firestore.rules: el entorno del emulador y los
// datos con que parte cada test. Cada archivo *.test.mjs llama a usarEntorno()
// y trabaja sobre esta misma planta, así los casos se leen igual en todos.

import { after, before, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, setLogLevel } from "firebase/firestore";

// Los rechazos esperados llenarían la salida de PERMISSION_DENIED.
setLogLevel("silent");

export const MINUTO = 60 * 1000;
export const DIA = 24 * 60 * MINUTO;

// ------------------------------------------------------------------ datos base
//
// La planta A tiene dos áreas: en Embotellado trabaja Ana y en Fermentación
// Eva, las dos colaboradoras. Vale es la validadora y Carla la administradora.
// Beto recién creó su cuenta y aún no se une a un área. La planta B es de otra
// empresa: Diego la administra y Fran trabaja en su bodega.

export const PLANTAS = {
  "planta-a": { nombre: "Planta A", empresa: "Viña de prueba" },
  "planta-b": { nombre: "Planta B", empresa: "Otra viña" },
};

export const AREAS = {
  embotellado: { plantaId: "planta-a", nombre: "Embotellado", codigo: "EMB-1111", dotacion: 10 },
  fermentacion: { plantaId: "planta-a", nombre: "Fermentación", codigo: "FER-2222", dotacion: 8 },
  "bodega-b": { plantaId: "planta-b", nombre: "Bodega", codigo: "BOD-3333", dotacion: 6 },
};

const perfil = (nombre, rol, plantaId, areaId, extra = {}) => ({
  nombre,
  email: `${nombre.toLowerCase()}@test.cl`,
  rol,
  plantaId,
  areaId,
  areaNombre: areaId ? AREAS[areaId].nombre : null,
  avisosVistosHasta: 0,
  creadoEn: 1,
  ...extra,
});

export const PERFILES = {
  ana: perfil("Ana", "colaborador", "planta-a", "embotellado"),
  eva: perfil("Eva", "colaborador", "planta-a", "fermentacion"),
  beto: perfil("Beto", "colaborador", null, null),
  vale: perfil("Vale", "validador", "planta-a", "embotellado"),
  carla: perfil("Carla", "administrador", "planta-a", null, { codigoRolUsado: "ADM-A" }),
  diego: perfil("Diego", "administrador", "planta-b", null, { codigoRolUsado: "ADM-B" }),
  fran: perfil("Fran", "colaborador", "planta-b", "bodega-b"),
};

export const CODIGOS_ROL = {
  "planta-a": { administrador: "ADM-A" },
  "planta-b": { administrador: "ADM-B" },
};

const contenedor = (plantaId, punto, material, activo = true) => ({
  plantaId,
  punto,
  material,
  activo,
  creadoEn: 1,
});

export const CONTENEDORES = {
  MIXTO1: contenedor("planta-a", "Punto limpio central", null),
  VIDRI1: contenedor("planta-a", "Punto limpio central", "Vidrio"),
  VIEJO1: contenedor("planta-a", "Punto limpio central", null, false),
  BMIXT1: contenedor("planta-b", "Punto limpio", null),
};

/** Depósito tal como lo crea `crearRegistro` en app/src/services/registros.ts. */
export function deposito(cambios = {}) {
  return {
    colaboradorId: "ana",
    plantaId: "planta-a",
    areaId: "embotellado",
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
    retiroId: null,
    ...cambios,
  };
}

/** El mismo depósito, ya validado por Vale. */
export function depositoValidado(cambios = {}) {
  return deposito({
    creadoEn: 1,
    estado: "validado",
    kgConfirmado: 0.4,
    validadoEn: 2,
    validadoPor: "vale",
    ...cambios,
  });
}

// --------------------------------------------------------------------- entorno

let entorno;

/**
 * Registra los hooks del archivo de tests: levanta el entorno con las reglas
 * actuales y, antes de cada test, deja la base de datos con los datos de
 * arriba más dos depósitos de Ana (uno pendiente y uno validado).
 */
export function usarEntorno() {
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

  beforeEach(async () => {
    await entorno.clearFirestore();
    await sembrar(async (db) => {
      const colecciones = {
        plantas: PLANTAS,
        areas: AREAS,
        usuarios: PERFILES,
        codigosRol: CODIGOS_ROL,
        contenedores: CONTENEDORES,
      };
      for (const [coleccion, docs] of Object.entries(colecciones)) {
        for (const [id, datos] of Object.entries(docs)) {
          await setDoc(doc(db, coleccion, id), datos);
        }
      }
      await setDoc(doc(db, "registros/pendiente1"), deposito({ creadoEn: 1 }));
      await setDoc(doc(db, "registros/validado1"), depositoValidado());
    });
  });
}

/** Firestore visto por un usuario con sesión iniciada. */
export function como(uid) {
  return entorno.authenticatedContext(uid).firestore();
}

/** Firestore visto por alguien sin sesión. */
export function anonimo() {
  return entorno.unauthenticatedContext().firestore();
}

/** Escribe o lee datos saltándose las reglas, para preparar o revisar un caso. */
export async function sembrar(funcion) {
  await entorno.withSecurityRulesDisabled((contexto) => funcion(contexto.firestore()));
}
