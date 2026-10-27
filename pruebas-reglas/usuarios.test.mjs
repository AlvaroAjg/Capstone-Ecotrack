// Tests de las reglas de los perfiles: quién los lee, cómo nace una cuenta,
// cómo se une alguien a un área y cómo cambian los roles.

import { describe, test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { anonimo, como, comoCon, usarEntorno } from "./comun.mjs";

usarEntorno();

const unirse = (areaId, areaNombre, plantaId = "planta-a") => ({ plantaId, areaId, areaNombre });

// ------------------------------------------------------------------ lectura

describe("usuarios: lectura", () => {
  test("cada quien lee su propio perfil", async () => {
    await assertSucceeds(getDoc(doc(como("ana"), "usuarios/ana")));
  });

  test("un colaborador no lee el perfil de un compañero", async () => {
    await assertFails(getDoc(doc(como("ana"), "usuarios/eva")));
  });

  test("ni el de la administradora, que trae su código", async () => {
    await assertFails(getDoc(doc(como("ana"), "usuarios/carla")));
  });

  test("la validadora no lee perfiles ajenos", async () => {
    await assertFails(getDoc(doc(como("vale"), "usuarios/ana")));
  });

  test("la administradora lee a las personas de su planta (panel)", async () => {
    await assertSucceeds(getDoc(doc(como("carla"), "usuarios/ana")));
    const q = query(collection(como("carla"), "usuarios"), where("plantaId", "==", "planta-a"));
    await assertSucceeds(getDocs(q));
  });

  test("no las de otra planta", async () => {
    await assertFails(getDoc(doc(como("carla"), "usuarios/fran")));
    const q = query(collection(como("carla"), "usuarios"), where("plantaId", "==", "planta-b"));
    await assertFails(getDocs(q));
  });

  test("nadie lista todos los perfiles", async () => {
    await assertFails(getDocs(collection(como("carla"), "usuarios")));
  });

  test("sin sesión no se lee nada", async () => {
    await assertFails(getDoc(doc(anonimo(), "usuarios/ana")));
  });
});

// ------------------------------------------------------------------ creación

describe("usuarios: creación", () => {
  const nuevo = (cambios = {}) => ({
    nombre: "Nueva",
    email: "nueva@test.cl",
    rol: "colaborador",
    plantaId: null,
    areaId: null,
    areaNombre: null,
    avisosVistosHasta: 0,
    creadoEn: Date.now(),
    ...cambios,
  });
  const crear = (datos) => setDoc(doc(como("nueva"), "usuarios/nueva"), datos);

  test("un colaborador sin área (registro, Google o Microsoft)", async () => {
    await assertSucceeds(crear(nuevo()));
  });

  test("un colaborador que nace ya unido a un área real", async () => {
    await assertSucceeds(crear(nuevo(unirse("embotellado", "Embotellado"))));
  });

  test("no con un área que no existe", async () => {
    await assertFails(crear(nuevo(unirse("inventada", "Inventada"))));
  });

  test("no con el nombre equivocado del área", async () => {
    await assertFails(crear(nuevo(unirse("embotellado", "Fermentación"))));
  });

  test("no con un área en otra planta que la suya", async () => {
    await assertFails(crear(nuevo(unirse("embotellado", "Embotellado", "planta-b"))));
  });

  test("no con planta pero sin área", async () => {
    await assertFails(crear(nuevo({ plantaId: "planta-a" })));
  });

  test("nadie nace validador", async () => {
    await assertFails(crear(nuevo({ rol: "validador" })));
  });

  test("nadie nace suplente", async () => {
    await assertFails(crear(nuevo({ suplente: true })));
  });

  test("nadie nace administrador, ni con el código de la planta", async () => {
    await assertFails(crear(nuevo({ rol: "administrador", plantaId: "planta-a", codigoRolUsado: "ADM-A" })));
  });

  test("ya no existe el rol de gestor", async () => {
    await assertFails(crear(nuevo({ rol: "gestor" })));
  });

  test("nadie crea el perfil de otro", async () => {
    await assertFails(setDoc(doc(como("ana"), "usuarios/nueva"), nuevo()));
  });
});

// ----------------------------------------------------- edición de uno mismo

describe("usuarios: edición propia y unirse a un área", () => {
  test("editar su nombre (Mi cuenta)", async () => {
    await assertSucceeds(updateDoc(doc(como("ana"), "usuarios/ana"), { nombre: "Ana María" }));
  });

  test("marcar los avisos como vistos", async () => {
    await assertSucceeds(updateDoc(doc(como("vale"), "usuarios/vale"), { avisosVistosHasta: Date.now() }));
  });

  test("nadie edita el perfil de otro", async () => {
    await assertFails(updateDoc(doc(como("ana"), "usuarios/eva"), { nombre: "Otra" }));
  });

  test("un colaborador sin área se une a una con su código", async () => {
    await assertSucceeds(
      updateDoc(doc(como("beto"), "usuarios/beto"), unirse("fermentacion", "Fermentación"))
    );
  });

  test("no a un área que no existe", async () => {
    await assertFails(updateDoc(doc(como("beto"), "usuarios/beto"), unirse("inventada", "Inventada")));
  });

  test("no con el nombre de otra área", async () => {
    await assertFails(updateDoc(doc(como("beto"), "usuarios/beto"), unirse("fermentacion", "Embotellado")));
  });

  test("quien ya tiene área no se cambia solo (inflar la participación de otra)", async () => {
    await assertFails(updateDoc(doc(como("ana"), "usuarios/ana"), unirse("fermentacion", "Fermentación")));
  });

  test("ni se sale de su área", async () => {
    await assertFails(updateDoc(doc(como("ana"), "usuarios/ana"), { plantaId: null, areaId: null, areaNombre: null }));
  });

  test("nadie cambia su propio rol editando el perfil", async () => {
    await assertFails(updateDoc(doc(como("ana"), "usuarios/ana"), { rol: "validador" }));
    await assertFails(updateDoc(doc(como("vale"), "usuarios/vale"), { rol: "administrador" }));
  });

  test("nadie borra su perfil", async () => {
    await assertFails(deleteDoc(doc(como("ana"), "usuarios/ana")));
  });
});

// --------------------------------------------- promoción a administrador

describe("usuarios: promoción a administrador", () => {
  const promover = (uid, cambios = {}) =>
    updateDoc(doc(como(uid), "usuarios", uid), {
      rol: "administrador",
      plantaId: "planta-a",
      areaId: null,
      areaNombre: null,
      codigoRolUsado: "ADM-A",
      ...cambios,
    });

  test("un colaborador se promueve con el código de la planta", async () => {
    await assertSucceeds(promover("beto"));
  });

  test("también si ya estaba en un área (queda sin área)", async () => {
    await assertSucceeds(promover("ana"));
  });

  test("no con un código incorrecto", async () => {
    await assertFails(promover("beto", { codigoRolUsado: "ADIVINO" }));
  });

  test("no con el código de otra planta", async () => {
    await assertFails(promover("beto", { codigoRolUsado: "ADM-B" }));
  });

  test("no quedándose con su área", async () => {
    await assertFails(promover("ana", { areaId: "embotellado", areaNombre: "Embotellado" }));
  });

  test("la validadora no se promueve sola", async () => {
    await assertFails(promover("vale"));
  });
});

// ------------------------------------------------------- correo confirmado

describe("usuarios: correo confirmado", () => {
  const conContrasena = (uid, confirmado) => comoCon(uid, "password", confirmado);
  const nueva = (cambios = {}) => ({
    nombre: "Nueva",
    email: "nueva@test.cl",
    rol: "colaborador",
    plantaId: null,
    areaId: null,
    areaNombre: null,
    avisosVistosHasta: 0,
    creadoEn: Date.now(),
    ...cambios,
  });
  const promocion = {
    rol: "administrador",
    plantaId: "planta-a",
    areaId: null,
    areaNombre: null,
    codigoRolUsado: "ADM-A",
  };

  test("se registra sin confirmar: el enlace llega después del registro", async () => {
    await assertSucceeds(setDoc(doc(conContrasena("nueva", false), "usuarios/nueva"), nueva()));
  });

  test("sin confirmar no nace unida a un área", async () => {
    await assertFails(
      setDoc(doc(conContrasena("nueva", false), "usuarios/nueva"), nueva(unirse("embotellado", "Embotellado")))
    );
  });

  test("sin confirmar no se une a un área", async () => {
    await assertFails(
      updateDoc(doc(conContrasena("beto", false), "usuarios/beto"), unirse("fermentacion", "Fermentación"))
    );
  });

  test("con el correo confirmado sí se une", async () => {
    await assertSucceeds(
      updateDoc(doc(conContrasena("beto", true), "usuarios/beto"), unirse("fermentacion", "Fermentación"))
    );
  });

  test("sin confirmar no se promueve a administrador, ni con el código", async () => {
    await assertFails(updateDoc(doc(conContrasena("beto", false), "usuarios/beto"), promocion));
  });

  test("con el correo confirmado sí se promueve", async () => {
    await assertSucceeds(updateDoc(doc(conContrasena("beto", true), "usuarios/beto"), promocion));
  });

  test("con Google o Microsoft no se pide: el proveedor ya comprobó el correo", async () => {
    await assertSucceeds(
      updateDoc(doc(comoCon("beto", "microsoft.com", false), "usuarios/beto"), unirse("fermentacion", "Fermentación"))
    );
  });

  test("a quien ya está en un área no se le bloquea nada", async () => {
    await assertSucceeds(updateDoc(doc(conContrasena("ana", false), "usuarios/ana"), { nombre: "Ana María" }));
  });
});

// ------------------------------------------ edición por la administradora

describe("usuarios: la administradora gestiona a las personas", () => {
  test("cambia a una colaboradora de área", async () => {
    await assertSucceeds(
      updateDoc(doc(como("carla"), "usuarios/ana"), { areaId: "fermentacion", areaNombre: "Fermentación" })
    );
  });

  test("no a un área de otra planta", async () => {
    await assertFails(
      updateDoc(doc(como("carla"), "usuarios/ana"), { areaId: "bodega-b", areaNombre: "Bodega" })
    );
  });

  test("no a un área que no existe", async () => {
    await assertFails(
      updateDoc(doc(como("carla"), "usuarios/ana"), { areaId: "inventada", areaNombre: "Inventada" })
    );
  });

  test("nombra validadora a una colaboradora", async () => {
    await assertSucceeds(updateDoc(doc(como("carla"), "usuarios/eva"), { rol: "validador" }));
  });

  test("devuelve a la validadora a colaboradora", async () => {
    await assertSucceeds(updateDoc(doc(como("carla"), "usuarios/vale"), { rol: "colaborador" }));
  });

  test("nombra suplente a una colaboradora", async () => {
    await assertSucceeds(updateDoc(doc(como("carla"), "usuarios/eva"), { rol: "validador", suplente: true }));
  });

  test("pasa a la validadora de titular a suplente", async () => {
    await assertSucceeds(updateDoc(doc(como("carla"), "usuarios/vale"), { suplente: true }));
  });

  test("devuelve a la suplente a colaboradora, sin la marca", async () => {
    await updateDoc(doc(como("carla"), "usuarios/vale"), { suplente: true });
    await assertSucceeds(updateDoc(doc(como("carla"), "usuarios/vale"), { rol: "colaborador", suplente: false }));
  });

  test("una colaboradora no queda marcada como suplente", async () => {
    await assertFails(updateDoc(doc(como("carla"), "usuarios/ana"), { suplente: true }));
    await updateDoc(doc(como("carla"), "usuarios/vale"), { suplente: true });
    await assertFails(updateDoc(doc(como("carla"), "usuarios/vale"), { rol: "colaborador" }));
  });

  test("la marca de suplente es sí o no", async () => {
    await assertFails(updateDoc(doc(como("carla"), "usuarios/vale"), { suplente: "sí" }));
  });

  test("no hace administrador a nadie", async () => {
    await assertFails(updateDoc(doc(como("carla"), "usuarios/eva"), { rol: "administrador" }));
  });

  test("no saca a nadie de la planta", async () => {
    await assertFails(
      updateDoc(doc(como("carla"), "usuarios/eva"), { plantaId: "planta-b", areaId: "bodega-b", areaNombre: "Bodega" })
    );
  });

  test("no cambia el nombre ni el correo de otra persona", async () => {
    await assertFails(updateDoc(doc(como("carla"), "usuarios/ana"), { nombre: "Otra" }));
  });

  test("no toca a las personas de otra planta", async () => {
    await assertFails(updateDoc(doc(como("diego"), "usuarios/eva"), { rol: "validador" }));
  });

  test("no a quien todavía no tiene planta", async () => {
    await assertFails(
      updateDoc(doc(como("carla"), "usuarios/beto"), {
        plantaId: "planta-a",
        areaId: "embotellado",
        areaNombre: "Embotellado",
      })
    );
  });

  test("la validadora no nombra validadores", async () => {
    await assertFails(updateDoc(doc(como("vale"), "usuarios/eva"), { rol: "validador" }));
  });

  test("ni se marca suplente a sí misma", async () => {
    await assertFails(updateDoc(doc(como("vale"), "usuarios/vale"), { suplente: true }));
  });
});
