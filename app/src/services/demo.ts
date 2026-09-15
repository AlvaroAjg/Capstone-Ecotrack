import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { CUENTAS_DEMO } from "../lib/demo";
import { sembrarTorres } from "./torres";

export interface ResultadoPreparacion {
  torres: number;
  cuentasCreadas: number;
  cuentasExistentes: number;
}

/**
 * Deja el proyecto listo para demostrar en un solo paso: crea las torres del
 * condominio piloto y las tres cuentas (residente, administrador y gestor), ya
 * vinculadas a su torre.
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
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nombre: cuenta.nombre,
        email: cuenta.email,
        rol: cuenta.rol,
        depto: cuenta.depto,
        torreId: cuenta.torreId,
        torreNombre: cuenta.torreNombre,
        creadoEn: Date.now(),
      });
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
