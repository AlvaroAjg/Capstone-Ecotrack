import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { generarCodigoRetiro, generarCodigoVerificacion, sumaKg } from "../lib/formato";
import {
  kgEfectivo,
  type ContenedorPorRetirar,
  type Incidencia,
  type Retiro,
} from "../lib/tipos";

function aRetiro(id: string, d: any): Retiro {
  return {
    id,
    plantaId: d.plantaId ?? "",
    fecha: d.fecha ?? 0,
    quienRetira: d.quienRetira ?? "",
    guia: d.guia ?? null,
    contenedores: d.contenedores ?? [],
    pesoKg: d.pesoKg ?? null,
    depositos: d.depositos ?? 0,
    kgEstimado: d.kgEstimado ?? 0,
    registradoPor: d.registradoPor ?? "",
    registradoEn: d.registradoEn ?? 0,
  };
}

/** Los retiros de una planta, en vivo, del más reciente al más antiguo. */
export function escucharRetiros(plantaId: string, callback: (retiros: Retiro[]) => void) {
  const consulta = query(collection(db, "retiros"), where("plantaId", "==", plantaId));
  return onSnapshot(consulta, (snap) => {
    callback(
      snap.docs.map((d) => aRetiro(d.id, d.data())).sort((a, b) => b.fecha - a.fecha)
    );
  });
}

export interface DatosRetiro {
  fecha: number;
  quienRetira: string;
  guia: string | null;
  pesoKg: number | null;
}

/** Un writeBatch admite hasta 500 escrituras, contando el retiro y las incidencias. */
const MAXIMO_POR_LOTE = 500;

/**
 * El id del retiro es su código (`RET-K7QM`), que es lo que se ve en el
 * certificado y el reporte. Se compara con los retiros de la planta que la app
 * ya tiene, y no con un getDoc: las reglas solo dejan leer un retiro de la
 * propia planta, así que leer uno que todavía no existe se rechaza. Si el
 * código coincidiera con el de otra planta, el lote falla igual (escribir
 * sobre un retiro existente sería editarlo) y no queda nada a medias.
 */
function codigoLibre(usados: string[]): string {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoRetiro();
    if (!usados.includes(codigo)) return codigo;
  }
  throw new Error("No se pudo generar un código de retiro. Intenta de nuevo.");
}

/**
 * Etapa 2 de la cadena: el administrador registra que se fue el material de
 * unos contenedores. En un solo writeBatch atómico crea el retiro, certifica
 * todos los depósitos validados de esos contenedores y marca como atendidas
 * sus incidencias: o queda todo, o nada. Las reglas comprueban que cada
 * depósito certificado apunte a un retiro que existe al terminar el lote y
 * que incluye su contenedor.
 *
 * Cada colaborador recibe su propio código de certificado, y todos comparten
 * el del retiro en que salió su material. Devuelve el código del retiro.
 */
export async function registrarRetiro(
  plantaId: string,
  adminUid: string,
  datos: DatosRetiro,
  porRetirar: ContenedorPorRetirar[],
  incidencias: Incidencia[],
  /** Códigos de los retiros que la planta ya tiene, para no repetir uno. */
  codigosUsados: string[]
): Promise<string> {
  const registros = porRetirar.flatMap((c) => c.registros);
  if (registros.length === 0) {
    throw new Error("No hay depósitos validados en esos contenedores.");
  }

  const contenedores = porRetirar.map((c) => c.contenedor);
  const atendidas = incidencias.filter(
    (i) => !i.atendida && contenedores.includes(i.contenedor)
  );
  if (1 + registros.length + atendidas.length > MAXIMO_POR_LOTE) {
    throw new Error(
      `Son ${registros.length} depósitos y no caben en un solo retiro. Regístralo por menos contenedores.`
    );
  }

  const codigo = codigoLibre(codigosUsados);
  const ahora = Date.now();
  const lote = writeBatch(db);

  lote.set(doc(db, "retiros", codigo), {
    plantaId,
    fecha: datos.fecha,
    quienRetira: datos.quienRetira,
    guia: datos.guia,
    contenedores,
    pesoKg: datos.pesoKg,
    depositos: registros.length,
    kgEstimado: sumaKg(registros.map(kgEfectivo)),
    registradoPor: adminUid,
    registradoEn: ahora,
  });

  for (const registro of registros) {
    lote.update(doc(db, "registros", registro.id), {
      estado: "certificado",
      certificadoEn: ahora,
      certificadoPor: adminUid,
      codigo: generarCodigoVerificacion(),
      retiroId: codigo,
    });
  }

  for (const incidencia of atendidas) {
    lote.update(doc(db, "incidencias", incidencia.id), {
      atendida: true,
      atendidaEn: ahora,
      retiroId: codigo,
    });
  }

  await lote.commit();
  return codigo;
}
