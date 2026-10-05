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

// ----------------------------------------------------------- registros: crear

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

  test("no a nombre de otro residente", async () => {
    await assertFails(crear("eva", deposito({ residente: "Eva", depto: "Depto 101" })));
  });

  test("no con un departamento que no es el suyo (inflar participación)", async () => {
    await assertFails(crear("ana", deposito({ depto: "Depto 999" })));
  });

  test("no con otro nombre", async () => {
    await assertFails(crear("ana", deposito({ residente: "Otra persona" })));
  });

  test("no con otra torre en el nombre", async () => {
    await assertFails(crear("ana", deposito({ torreNombre: "Torre B" })));
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
    await assertFails(crear("ana", deposito({ ecoPuntos: 1000 })));
  });

  test("no nace validado", async () => {
    await assertFails(crear("ana", deposito({ estado: "validado" })));
  });

  test("no con kilos confirmados de antemano", async () => {
    await assertFails(crear("ana", deposito({ kgConfirmado: 0.4 })));
  });

  test("no con la etapa del gestor ya llena", async () => {
    await assertFails(crear("ana", deposito({ codigoRetiro: "RET-FAKE" })));
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

  test("no en un contenedor de otra torre", async () => {
    await assertFails(crear("ana", deposito({ contenedor: "BMIXT1" })));
  });

  test("no plástico en el contenedor de vidrio", async () => {
    await assertFails(crear("ana", deposito({ contenedor: "VIDRI1" })));
  });

  test("un residente sin torre no deposita", async () => {
    await assertFails(
      crear("beto", deposito({ residenteId: "beto", residente: "Beto", depto: "", torreId: null, torreNombre: null }))
    );
  });

  test("un administrador no registra depósitos (luego los validaría él mismo)", async () => {
    await assertFails(
      crear(
        "carla",
        deposito({ residenteId: "carla", residente: "Carla", depto: "Administración" })
      )
    );
  });
});

// ------------------------------------------------- registros: etapa 1 (admin)

describe("registros: validación del administrador", () => {
  const validar = (uid, cambios) => updateDoc(doc(como(uid), "registros/pendiente1"), cambios);

  test("valida confirmando los kilos declarados", async () => {
    await assertSucceeds(
      validar("carla", { estado: "validado", kgConfirmado: 0.4, validadoEn: Date.now(), validadoPor: "carla" })
    );
  });

  test("no puede inflar los kilos al validar", async () => {
    await assertFails(
      validar("carla", { estado: "validado", kgConfirmado: 40, validadoEn: Date.now(), validadoPor: "carla" })
    );
  });

  test("rechaza sin tocar los kilos", async () => {
    await assertSucceeds(
      validar("carla", { estado: "rechazado", validadoEn: Date.now(), validadoPor: "carla" })
    );
  });

  test("no rechaza y a la vez cambia los kilos", async () => {
    await assertFails(
      validar("carla", { estado: "rechazado", kgConfirmado: 40, validadoEn: Date.now(), validadoPor: "carla" })
    );
  });

  test("no firma a nombre de otro", async () => {
    await assertFails(
      validar("carla", { estado: "validado", kgConfirmado: 0.4, validadoEn: Date.now(), validadoPor: "diego" })
    );
  });

  test("no cambia el material", async () => {
    await assertFails(
      validar("carla", {
        estado: "validado",
        kgConfirmado: 0.4,
        validadoEn: Date.now(),
        validadoPor: "carla",
        material: "Vidrio",
      })
    );
  });

  test("el administrador de otra torre no valida", async () => {
    await assertFails(
      validar("diego", { estado: "validado", kgConfirmado: 0.4, validadoEn: Date.now(), validadoPor: "diego" })
    );
  });

  test("no se salta al gestor certificando", async () => {
    await assertFails(
      validar("carla", { estado: "certificado", certificadoEn: Date.now(), certificadoPor: "carla" })
    );
  });

  test("no vuelve a validar uno ya validado", async () => {
    await assertFails(
      updateDoc(doc(como("carla"), "registros/validado1"), {
        estado: "rechazado",
        validadoEn: Date.now(),
        validadoPor: "carla",
      })
    );
  });

  test("un residente no valida su propio depósito", async () => {
    await assertFails(
      validar("ana", { estado: "validado", kgConfirmado: 0.4, validadoEn: Date.now(), validadoPor: "ana" })
    );
  });
});

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

// ------------------------------------------------- registros: lo que lee la app

describe("registros: consultas de la app", () => {
  // Equivalentes a consultasPara en app/src/services/registros.ts (allá el mes
  // parte el lunes de su primera semana; aquí basta una semana antes):
  // si cambian allá, cambian aquí.
  const inicioMes = () => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
  };
  const comunes = (db) => [
    query(collection(db, "registros"), where("creadoEn", ">=", inicioMes() - 7 * DIA)),
    query(collection(db, "registros"), where("certificadoEn", ">=", inicioMes())),
  ];

  test("el residente lee las del mes y todas las suyas", async () => {
    const db = como("ana");
    for (const q of [...comunes(db), query(collection(db, "registros"), where("residenteId", "==", "ana"))]) {
      await assertSucceeds(getDocs(q));
    }
  });

  test("el administrador lee todos los de su torre (pendientes y reporte mensual)", async () => {
    const db = como("carla");
    const deSuTorre = query(collection(db, "registros"), where("torreId", "==", "torre-a"));
    for (const q of [...comunes(db), deSuTorre]) await assertSucceeds(getDocs(q));
  });

  test("sin sesión no se lee ninguna", async () => {
    const anonimo = entorno.unauthenticatedContext().firestore();
    await assertFails(getDocs(comunes(anonimo)[0]));
  });

  test("con más de 300 depósitos, el gestor igual ve un validado antiguo", async () => {
    // Antes la app leía solo los últimos 300 de todo el sistema: este
    // depósito, validado hace dos meses, nunca le habría llegado al gestor.
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      const db = contexto.firestore();
      const lote = writeBatch(db);
      for (let i = 0; i < 350; i++) {
        lote.set(doc(db, "registros", `reciente${i}`), deposito({ creadoEn: Date.now() - i * MINUTO }));
      }
      lote.set(
        doc(db, "registros/antiguo"),
        deposito({ creadoEn: Date.now() - 60 * DIA, estado: "validado", kgConfirmado: 0.4, validadoEn: 1, validadoPor: "carla" })
      );
      await lote.commit();
    });

    const validados = await assertSucceeds(
      getDocs(query(collection(como("gus"), "registros"), where("estado", "==", "validado")))
    );
    assert.ok(validados.docs.some((d) => d.id === "antiguo"));
  });
});

// -------------------------------------------- registros: lotes del administrador

describe("registros: lotes del administrador", () => {
  // Como validarRegistros en app/src/services/registros.ts: toda la tanda en
  // un writeBatch, que Firestore aplica completo o no aplica.
  async function sembrarPendientes(cantidad, cambios = {}) {
    const ids = [];
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      const db = contexto.firestore();
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
    validadoPor: "carla",
  });

  async function estadoDe(id) {
    let estado;
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      estado = (await getDoc(doc(contexto.firestore(), "registros", id))).data().estado;
    });
    return estado;
  }

  test("valida una tanda de 100 depósitos en un solo lote", async () => {
    const ids = await sembrarPendientes(100);
    const db = como("carla");
    const lote = writeBatch(db);
    for (const id of ids) lote.update(doc(db, "registros", id), validacion());
    await assertSucceeds(lote.commit());
    assert.equal(await estadoDe("tanda99"), "validado");
  });

  test("rechaza un contenedor completo en un solo lote", async () => {
    const ids = await sembrarPendientes(5);
    const db = como("carla");
    const lote = writeBatch(db);
    for (const id of ids) {
      lote.update(doc(db, "registros", id), { estado: "rechazado", validadoEn: Date.now(), validadoPor: "carla" });
    }
    await assertSucceeds(lote.commit());
  });

  test("reporta la contaminación y valida sus depósitos en el mismo lote", async () => {
    const ids = await sembrarPendientes(3);
    const db = como("carla");
    const lote = writeBatch(db);
    for (const id of ids) lote.update(doc(db, "registros", id), validacion());
    lote.set(doc(collection(db, "incidencias")), {
      torreId: "torre-a",
      torreNombre: "Torre A",
      contenedor: "MIXTO1",
      contenedorNombre: "Contenedor mixto",
      contaminante: "Vidrio",
      reportadoEn: Date.now(),
      reportadoPor: "carla",
      atendida: false,
      atendidaEn: null,
      codigoRetiro: null,
    });
    await assertSucceeds(lote.commit());
  });

  test("si un depósito del lote no se puede validar, no se valida ninguno", async () => {
    const ids = await sembrarPendientes(3);
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(doc(contexto.firestore(), "registros/deOtraTorre"), deposito({ creadoEn: 1, torreId: "torre-b" }));
    });
    const db = como("carla");
    const lote = writeBatch(db);
    for (const id of [...ids, "deOtraTorre"]) lote.update(doc(db, "registros", id), validacion());
    await assertFails(lote.commit());
    // Los de su torre, que sí podía validar, siguen pendientes: no quedó a medias.
    for (const id of ids) assert.equal(await estadoDe(id), "pendiente");
  });

  test("si el reporte de contaminación es inválido, tampoco se validan los depósitos", async () => {
    const ids = await sembrarPendientes(2);
    const db = como("carla");
    const lote = writeBatch(db);
    for (const id of ids) lote.update(doc(db, "registros", id), validacion());
    lote.set(doc(collection(db, "incidencias")), {
      torreId: "torre-a",
      reportadoPor: "carla",
      atendida: false,
      contaminante: "Algo que no está en la lista",
    });
    await assertFails(lote.commit());
    for (const id of ids) assert.equal(await estadoDe(id), "pendiente");
  });
});
