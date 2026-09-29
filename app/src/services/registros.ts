import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type Query,
} from "firebase/firestore";
import { unirRegistros } from "../lib/derivados";
import { db } from "../lib/firebase";
import { generarCodigoRetiro, generarCodigoVerificacion } from "../lib/formato";
import { inicioDeSemana } from "../lib/misionesSistema";
import {
  kgEstimado,
  type Material,
  type Registro,
  type Rol,
  type Talla,
  type Usuario,
} from "../lib/tipos";

function aRegistro(id: string, d: any): Registro {
  return {
    id,
    residenteId: d.residenteId ?? "",
    residente: d.residente ?? "",
    depto: d.depto ?? "",
    torreId: d.torreId ?? "",
    torreNombre: d.torreNombre ?? "",
    material: d.material as Material,
    talla: d.talla ?? null,
    kgDeclarado: d.kgDeclarado ?? 0,
    kgConfirmado: d.kgConfirmado ?? null,
    contenedor: d.contenedor ?? "",
    estado: d.estado ?? "pendiente",
    creadoEn: d.creadoEn ?? 0,
    validadoEn: d.validadoEn ?? null,
    validadoPor: d.validadoPor ?? null,
    certificadoEn: d.certificadoEn ?? null,
    certificadoPor: d.certificadoPor ?? null,
    codigo: d.codigo ?? null,
    codigoRetiro: d.codigoRetiro ?? null,
  };
}

/**
 * Las consultas que necesita cada rol. Nada queda afuera por antigüedad: antes
 * se escuchaban los últimos 300 de todo el sistema, y al pasar de ahí los más
 * viejos desaparecían sin aviso (del certificado, del ranking y, lo peor, de
 * la cola del gestor, que nunca los retiraba).
 *
 * - Todos: los depósitos desde el lunes de la primera semana del mes, para la
 *   participación, los EcoPuntos de cada torre (su misión semanal puede empezar
 *   el mes anterior) y los avisos; y los certificados del mes, para los kilos
 *   del ranking (un depósito del mes pasado puede certificarse en este).
 * - Residente: todos los suyos, para su historial, sus certificados de meses
 *   anteriores y su misión semanal.
 * - Administrador: los pendientes de su torre, aunque sean de otro mes.
 * - Gestor: todos los validados, de cualquier fecha, que son su cola de retiro.
 *
 * Ninguna necesita índice compuesto: son rangos sobre un campo o igualdades.
 * Las fechas se fijan al suscribirse; si la app queda abierta al cambiar de
 * mes, las consultas traen de más, no de menos, y los cálculos filtran igual
 * por mes.
 */
function consultasPara(uid: string, rol: Rol, torreId: string | null): Query[] {
  const registros = collection(db, "registros");
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const desdeSemana = inicioDeSemana(inicioMes).getTime();

  const consultas: Query[] = [
    query(registros, where("creadoEn", ">=", desdeSemana)),
    query(registros, where("certificadoEn", ">=", inicioMes.getTime())),
  ];
  if (rol === "residente") {
    consultas.push(query(registros, where("residenteId", "==", uid)));
  }
  if (rol === "administrador" && torreId) {
    consultas.push(
      query(registros, where("torreId", "==", torreId), where("estado", "==", "pendiente"))
    );
  }
  if (rol === "gestor") {
    consultas.push(query(registros, where("estado", "==", "validado")));
  }
  return consultas;
}

/**
 * Escucha en vivo los registros que el usuario necesita (ver consultasPara) y
 * entrega la unión, sin repetidos, del más reciente al más antiguo. Espera a
 * que respondan todas las consultas antes del primer aviso, para no mostrar
 * un ranking o una cola a medio cargar.
 */
export function escucharRegistros(
  usuario: { id: string; rol: Rol; torreId: string | null },
  callback: (registros: Registro[]) => void,
  alFallar?: (error: Error) => void
) {
  const consultas = consultasPara(usuario.id, usuario.rol, usuario.torreId);
  const resultados: (Registro[] | undefined)[] = consultas.map(() => undefined);

  function entregar() {
    if (resultados.some((r) => r === undefined)) return;
    callback(unirRegistros(resultados as Registro[][]));
  }

  const dejar = consultas.map((consulta, i) =>
    onSnapshot(
      consulta,
      (snap) => {
        resultados[i] = snap.docs.map((d) => aRegistro(d.id, d.data()));
        entregar();
      },
      (error) => alFallar?.(error)
    )
  );
  return () => dejar.forEach((d) => d());
}

export async function crearRegistro(
  usuario: Usuario,
  material: Material,
  talla: Talla,
  contenedor: string
): Promise<string> {
  if (!usuario.torreId) {
    throw new Error("Tu cuenta no está vinculada a una torre.");
  }

  // Nombre, depto y torre van tal cual están en el perfil: las reglas exigen
  // que coincidan con él.
  const referencia = await addDoc(collection(db, "registros"), {
    residenteId: usuario.id,
    residente: usuario.nombre,
    depto: usuario.depto,
    torreId: usuario.torreId,
    torreNombre: usuario.torreNombre,
    material,
    talla,
    // Los kilos salen de la tabla, nunca de lo que escriba el usuario: las
    // reglas de Firestore rechazan cualquier otro valor.
    kgDeclarado: kgEstimado(material, talla),
    kgConfirmado: null,
    contenedor,
    estado: "pendiente",
    creadoEn: Date.now(),
    validadoEn: null,
    validadoPor: null,
    certificadoEn: null,
    certificadoPor: null,
    codigo: null,
    codigoRetiro: null,
  });

  return referencia.id;
}

/**
 * Etapa 1 de la cadena: el administrador confirma que el depósito está en el
 * contenedor. Valida la tanda completa, no bolsa por bolsa, así que se
 * confirman los kilos estimados por la talla declarada.
 */
export async function validarRegistro(registro: Registro, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "registros", registro.id), {
    estado: "validado",
    kgConfirmado: registro.kgDeclarado,
    validadoEn: Date.now(),
    validadoPor: adminUid,
  });
}

export async function rechazarRegistro(id: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "registros", id), {
    estado: "rechazado",
    validadoEn: Date.now(),
    validadoPor: adminUid,
  });
}

/**
 * Etapa 2 de la cadena: el gestor confirma el retiro del contenedor de una
 * torre. Lo que se retira es el lote completo, no un depósito suelto, así que
 * todos los depósitos validados de esa torre se certifican juntos.
 *
 * Se usa un `writeBatch` para que la operación sea atómica: o se certifica todo
 * el lote, o no se certifica nada. Cada residente recibe igualmente su propio
 * código de certificado, y todos comparten el código del retiro en el que
 * salieron físicamente.
 */
export async function confirmarRetiroDeTorre(
  registros: Registro[],
  gestorUid: string
): Promise<string> {
  if (registros.length === 0) {
    throw new Error("No hay depósitos validados en ese lote.");
  }

  const codigoRetiro = generarCodigoRetiro();
  const ahora = Date.now();
  const lote = writeBatch(db);

  for (const registro of registros) {
    lote.update(doc(db, "registros", registro.id), {
      estado: "certificado",
      certificadoEn: ahora,
      certificadoPor: gestorUid,
      codigo: generarCodigoVerificacion(),
      codigoRetiro,
    });
  }

  await lote.commit();
  return codigoRetiro;
}
