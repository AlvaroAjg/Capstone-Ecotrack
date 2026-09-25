import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { CODIGO_GESTOR_DEMO, CODIGOS_ADMIN_DEMO, CUENTAS_DEMO } from "../lib/demo";
import { promoverAAdministrador } from "./auth";
import { crearContenedor } from "./contenedores";
import { sembrarTorres } from "./torres";

export interface ResultadoPreparacion {
  torres: number;
  cuentasCreadas: number;
  cuentasExistentes: number;
}

/**
 * Deja el proyecto listo para demostrar en un solo paso: crea las torres del
 * condominio piloto (con sus códigos de rol) y las tres cuentas, ya vinculadas
 * a su torre.
 *
 * Administrador y gestor pasan por el mismo camino que seguiría cualquier
 * persona real: nadie nace con esos roles. El gestor los presenta el código al
 * crearse; el administrador nace residente y se promueve aparte con el código
 * de su torre, igual que en JoinTorreScreen. Si los códigos no coincidieran
 * con lo que sembró `sembrarTorres`, esto fallaría igual que le fallaría a
 * cualquiera: no hay un atajo especial para la demo.
 *
 * `createUserWithEmailAndPassword` deja la sesión iniciada como cada cuenta
 * recién creada, lo que es justo lo que se necesita para escribir su propio
 * documento de perfil (las reglas solo permiten crear el perfil propio). Al
 * terminar se cierra la sesión para volver al login.
 *
 * Es idempotente: si una cuenta ya existe, se salta y sigue con la siguiente.
 */
export async function prepararDemo(
  alAvanzar?: (mensaje: string) => void
): Promise<ResultadoPreparacion> {
  alAvanzar?.("Creando las torres del condominio...");
  const torres = await sembrarTorres();

  let cuentasCreadas = 0;
  let cuentasExistentes = 0;

  for (const cuenta of CUENTAS_DEMO) {
    alAvanzar?.(`Creando la cuenta de ${cuenta.rol}...`);
    try {
      const credencial = await createUserWithEmailAndPassword(
        auth,
        cuenta.email,
        cuenta.password
      );

      // Nace residente (o gestor, si presenta el código correcto). El
      // administrador se promueve en un segundo paso, más abajo.
      const rolInicial = cuenta.rol === "administrador" ? "residente" : cuenta.rol;
      const datosDoc: Record<string, unknown> = {
        nombre: cuenta.nombre,
        email: cuenta.email,
        rol: rolInicial,
        depto: rolInicial === "gestor" ? cuenta.depto : "",
        torreId: rolInicial === "residente" ? cuenta.torreId : null,
        torreNombre: rolInicial === "residente" ? cuenta.torreNombre : null,
        creadoEn: Date.now(),
      };
      if (rolInicial === "gestor") datosDoc.codigoRolUsado = CODIGO_GESTOR_DEMO;

      await setDoc(doc(db, "usuarios", credencial.user.uid), datosDoc);

      if (cuenta.rol === "administrador" && cuenta.torreId) {
        await promoverAAdministrador(
          credencial.user.uid,
          cuenta.torreId,
          cuenta.torreNombre ?? cuenta.torreId,
          CODIGOS_ADMIN_DEMO[cuenta.torreId] ?? `ADM-${cuenta.torreId.toUpperCase()}`
        );
        // Ya como administrador, un contenedor mixto para su torre: sin
        // contenedores nadie puede registrar depósitos. Los demás (uno por
        // material, si el punto los tiene separados) se agregan en su panel.
        await crearContenedor(cuenta.torreId, null);
      }

      cuentasCreadas++;
    } catch (error) {
      if ((error as { code?: string })?.code === "auth/email-already-in-use") {
        cuentasExistentes++;
      } else {
        throw error;
      }
    }
  }

  await signOut(auth);
  return { torres, cuentasCreadas, cuentasExistentes };
}
