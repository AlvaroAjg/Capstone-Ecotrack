// Avisos dentro de la app: el avance de la cadena de verificación, para cada rol.
//
// No se guarda ningún aviso en Firestore: se arman en vivo a partir de los
// depósitos que la app ya escucha en tiempo real. Lo único que se guarda es
// hasta cuándo vio los avisos cada persona (`Usuario.avisosVistosHasta`), para
// saber cuáles son nuevos. No suenan con el teléfono bloqueado (eso exigiría
// notificaciones push con un servidor); se ven al abrir la app.

import { cantidadDeposito, formatKg } from "./formato";
import {
  nombreContenedor,
  type ContenedorPorRetirar,
  type Incidencia,
  type Registro,
  type Usuario,
} from "./tipos";

export interface Aviso {
  id: string;
  emoji: string;
  titulo: string;
  detalle: string;
  fecha: number;
  /** Depósito que abre el aviso al tocarlo, si corresponde. */
  registroId?: string;
  /** "alerta": se muestra en rojo (contaminación, precaución). */
  tono?: "alerta";
}

const DIA = 24 * 60 * 60 * 1000;
/** El colaborador ve el avance de sus depósitos del último mes. */
const VENTANA_COLABORADOR = 30 * DIA;
/** Tope de la lista, para que no se vuelva eterna con mucho historial. */
const MAXIMO = 30;
/**
 * Solo se destaca como nuevo lo de la última semana. Así, quien abre los
 * avisos por primera vez no ve todo su historial marcado como nuevo.
 */
const VENTANA_NUEVOS = 7 * DIA;

/** true si el aviso es posterior a la última vez que se vieron y es reciente. */
export function esNuevo(aviso: Aviso, vistosHasta: number, ahora: number = Date.now()): boolean {
  return aviso.fecha > vistosHasta && aviso.fecha > ahora - VENTANA_NUEVOS;
}

function descripcion(r: Registro): string {
  return `${r.material} · ${cantidadDeposito(r)}`;
}

/** Colaborador: cada paso de la cadena de sus propios depósitos. */
function avisosColaborador(usuario: Usuario, registros: Registro[]): Aviso[] {
  const desde = Date.now() - VENTANA_COLABORADOR;
  const avisos: Aviso[] = [];

  for (const r of registros) {
    if (r.colaboradorId !== usuario.id) continue;

    if (r.estado === "rechazado" && r.validadoEn && r.validadoEn >= desde) {
      avisos.push({
        id: `${r.id}-rechazado`,
        emoji: "❌",
        titulo: "Depósito rechazado",
        detalle: `${descripcion(r)} · el validador no lo encontró en el contenedor`,
        fecha: r.validadoEn,
        registroId: r.id,
      });
    }
    if ((r.estado === "validado" || r.estado === "certificado") && r.validadoEn && r.validadoEn >= desde) {
      avisos.push({
        id: `${r.id}-validado`,
        emoji: "🛡️",
        titulo: "Depósito validado",
        detalle: `${descripcion(r)} · ahora espera el retiro del contenedor`,
        fecha: r.validadoEn,
        registroId: r.id,
      });
    }
    if (r.estado === "certificado" && r.certificadoEn && r.certificadoEn >= desde) {
      avisos.push({
        id: `${r.id}-certificado`,
        emoji: "📄",
        titulo: "Reciclaje certificado",
        detalle: `${descripcion(r)} · ya suma a tu certificado del mes`,
        fecha: r.certificadoEn,
        registroId: r.id,
      });
    }
  }
  return avisos;
}

/**
 * Validador: los depósitos de su planta que esperan validación. Al validar o
 * rechazar uno, su aviso desaparece: la lista es lo que queda por hacer. No
 * dice de quién es cada depósito: el validador revisa contenedores, no
 * personas.
 */
function avisosValidador(usuario: Usuario, registros: Registro[]): Aviso[] {
  return registros
    .filter((r) => r.plantaId === usuario.plantaId && r.estado === "pendiente")
    .map((r) => ({
      id: `${r.id}-pendiente`,
      emoji: "📥",
      titulo: "Nuevo depósito por validar",
      detalle: `${descripcion(r)} · contenedor ${r.contenedor}`,
      fecha: r.creadoEn,
    }));
}

/** "Contenedor de vidrio (Casino)", o sin el punto si no se conoce. */
function nombreConPunto(c: ContenedorPorRetirar): string {
  return `${nombreContenedor(c)}${c.punto ? ` (${c.punto})` : ""}`;
}

/**
 * Administrador: un aviso por contenedor listo para retiro. Cambia de id
 * cuando llega un depósito validado nuevo, para volver a marcarse como nuevo.
 */
function avisosRetiro(porRetirar: ContenedorPorRetirar[]): Aviso[] {
  return porRetirar.map((c) => {
    const ultima = Math.max(...c.registros.map((r) => r.validadoEn ?? r.creadoEn));
    return {
      id: `${c.contenedor}-retiro-${ultima}`,
      emoji: "🚛",
      titulo: `${nombreConPunto(c)}: listo para retiro`,
      detalle: `${formatKg(c.kgEstimado)} validados en ${c.depositos} depósito${
        c.depositos === 1 ? "" : "s"
      }`,
      fecha: ultima,
    };
  });
}

/**
 * Colaborador: un contenedor de su planta apareció contaminado. Es un aviso
 * para toda la planta, porque no se sabe quién fue: educa sin señalar a nadie.
 */
function avisosContaminacion(incidencias: Incidencia[]): Aviso[] {
  const desde = Date.now() - VENTANA_COLABORADOR;
  return incidencias
    .filter((i) => i.reportadoEn >= desde)
    .map((i) => ({
      id: `${i.id}-contaminacion`,
      emoji: "!",
      tono: "alerta" as const,
      titulo: `Se encontró ${i.contaminante.toLowerCase()} en el ${i.contenedorNombre.toLowerCase()}`,
      detalle: "Recuerda botar cada material en su contenedor. Es un aviso para toda la planta.",
      fecha: i.reportadoEn,
    }));
}

/**
 * Administrador: un contenedor por retirar viene contaminado. Es una
 * advertencia de seguridad para quien lo retira.
 */
function avisosPrecaucion(incidencias: Incidencia[]): Aviso[] {
  return incidencias
    .filter((i) => !i.atendida)
    .map((i) => ({
      id: `${i.id}-precaucion`,
      emoji: "!",
      tono: "alerta" as const,
      titulo: `Precaución en el ${i.contenedorNombre.toLowerCase()}`,
      detalle: `Tiene ${i.contaminante.toLowerCase()}: avisa a quien lo retire para que lo haga con cuidado.`,
      fecha: i.reportadoEn,
    }));
}

/** Los avisos del usuario según su rol, del más reciente al más antiguo. */
export function construirAvisos(
  usuario: Usuario | null,
  registros: Registro[],
  porRetirar: ContenedorPorRetirar[],
  incidencias: Incidencia[] = []
): Aviso[] {
  if (!usuario) return [];
  const avisos =
    usuario.rol === "colaborador"
      ? [...avisosColaborador(usuario, registros), ...avisosContaminacion(incidencias)]
      : usuario.rol === "validador"
        ? avisosValidador(usuario, registros)
        : [...avisosRetiro(porRetirar), ...avisosPrecaucion(incidencias)];
  return avisos.sort((a, b) => b.fecha - a.fecha).slice(0, MAXIMO);
}
