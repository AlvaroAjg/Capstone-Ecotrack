// Avisos dentro de la app: el avance de la cadena de verificación, para cada rol.
//
// No se guarda ningún aviso en Firestore: se arman en vivo a partir de los
// depósitos que la app ya escucha en tiempo real. Lo único que se guarda es
// hasta cuándo vio los avisos cada persona (`Usuario.avisosVistosHasta`), para
// saber cuáles son nuevos. No suenan con el teléfono bloqueado (eso exigiría
// notificaciones push con un servidor); se ven al abrir la app.

import { formatKg } from "./formato";
import { kgEfectivo, type LoteRetiro, type Registro, type Usuario } from "./tipos";

export interface Aviso {
  id: string;
  emoji: string;
  titulo: string;
  detalle: string;
  fecha: number;
  /** Certificado que abre el aviso al tocarlo, si corresponde. */
  registroId?: string;
}

const DIA = 24 * 60 * 60 * 1000;
/** El residente ve el avance de sus depósitos del último mes. */
const VENTANA_RESIDENTE = 30 * DIA;
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
  return `${r.material} · ${formatKg(kgEfectivo(r))}`;
}

/** Residente: cada paso de la cadena de sus propios depósitos. */
function avisosResidente(usuario: Usuario, registros: Registro[]): Aviso[] {
  const desde = Date.now() - VENTANA_RESIDENTE;
  const avisos: Aviso[] = [];

  for (const r of registros) {
    if (r.residenteId !== usuario.id) continue;

    if (r.estado === "rechazado" && r.validadoEn && r.validadoEn >= desde) {
      avisos.push({
        id: `${r.id}-rechazado`,
        emoji: "❌",
        titulo: "Depósito rechazado",
        detalle: `${descripcion(r)} · el administrador no lo encontró en el contenedor`,
        fecha: r.validadoEn,
      });
    }
    if ((r.estado === "validado" || r.estado === "certificado") && r.validadoEn && r.validadoEn >= desde) {
      avisos.push({
        id: `${r.id}-validado`,
        emoji: "🛡️",
        titulo: "Depósito validado por el administrador",
        detalle: `${descripcion(r)} · ahora espera el retiro del gestor`,
        fecha: r.validadoEn,
      });
    }
    if (r.estado === "certificado" && r.certificadoEn && r.certificadoEn >= desde) {
      avisos.push({
        id: `${r.id}-certificado`,
        emoji: "📄",
        titulo: "Reciclaje certificado por el gestor",
        detalle: `${descripcion(r)} · toca para ver tu certificado`,
        fecha: r.certificadoEn,
        registroId: r.id,
      });
    }
  }
  return avisos;
}

/**
 * Administrador: los depósitos de su torre que esperan validación. Al validar
 * o rechazar uno, su aviso desaparece: la lista es lo que queda por hacer.
 */
function avisosAdministrador(usuario: Usuario, registros: Registro[]): Aviso[] {
  return registros
    .filter((r) => r.torreId === usuario.torreId && r.estado === "pendiente")
    .map((r) => ({
      id: `${r.id}-pendiente`,
      emoji: "📥",
      titulo: "Nuevo depósito por validar",
      detalle: `${r.depto || "Sin depto"} · ${descripcion(r)} · contenedor ${r.contenedor}`,
      fecha: r.creadoEn,
    }));
}

/**
 * Gestor: un aviso por torre con contenedor listo para retiro. Cambia de id
 * cuando llega un depósito validado nuevo, para volver a marcarse como nuevo.
 */
function avisosGestor(lotes: LoteRetiro[]): Aviso[] {
  return lotes.map((l) => {
    const ultima = Math.max(...l.registros.map((r) => r.validadoEn ?? r.creadoEn));
    return {
      id: `${l.torreId}-lote-${ultima}`,
      emoji: "🚛",
      titulo: `${l.torreNombre}: contenedor listo para retiro`,
      detalle: `${formatKg(l.kgTotal)} validados en ${l.depositos} depósito${
        l.depositos === 1 ? "" : "s"
      }${l.condominio ? ` · ${l.condominio}` : ""}`,
      fecha: ultima,
    };
  });
}

/** Los avisos del usuario según su rol, del más reciente al más antiguo. */
export function construirAvisos(
  usuario: Usuario | null,
  registros: Registro[],
  lotes: LoteRetiro[]
): Aviso[] {
  if (!usuario) return [];
  const avisos =
    usuario.rol === "residente"
      ? avisosResidente(usuario, registros)
      : usuario.rol === "administrador"
        ? avisosAdministrador(usuario, registros)
        : avisosGestor(lotes);
  return avisos.sort((a, b) => b.fecha - a.fecha).slice(0, MAXIMO);
}
