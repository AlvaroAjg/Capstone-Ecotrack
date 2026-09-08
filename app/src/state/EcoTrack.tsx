import React, { createContext, useContext, useMemo, useState } from "react";
import { generarCodigoVerificacion, haceMinutos, porcentaje, sumaKg } from "../lib/formato";

export type Material = "Papel/cartón" | "Plástico" | "Vidrio" | "Metal";
export type Rol = "residente" | "administrador" | "gestor";
export type TorreId = "Torre A" | "Torre B";

export const MATERIALES: { nombre: Material; emoji: string }[] = [
  { nombre: "Papel/cartón", emoji: "📄" },
  { nombre: "Plástico", emoji: "🥤" },
  { nombre: "Vidrio", emoji: "🍾" },
  { nombre: "Metal", emoji: "🥫" },
];

export const TORRES: TorreId[] = ["Torre A", "Torre B"];

export type EstadoRegistro = "pendiente" | "validado" | "certificado" | "rechazado";

export interface Registro {
  id: string;
  residenteId: string;
  residente: string;
  depto: string;
  torre: TorreId;
  material: Material;
  kg: number;
  contenedor: string;
  estado: EstadoRegistro;
  creadoEn: number;
  validadoEn: number | null;
  certificadoEn: number | null;
  codigo: string | null;
}

export interface Usuario {
  id: string;
  nombre: string;
  depto: string;
  torre: TorreId;
  rol: Rol;
}

export const METAS_TORRE: Record<TorreId, number> = {
  "Torre A": 200,
  "Torre B": 150,
};

const DEPTOS_POR_TORRE: Record<TorreId, number> = {
  "Torre A": 24,
  "Torre B": 19,
};

export const CODIGOS_TORRE: Record<string, TorreId> = {
  "ECO-TORRE-A": "Torre A",
  "ECO-TORRE-B": "Torre B",
};

const REGISTROS_INICIALES: Registro[] = [
  {
    id: "r1",
    residenteId: "u-matias",
    residente: "Matías Bustamante",
    depto: "Depto 402",
    torre: "Torre A",
    material: "Plástico",
    kg: 2.1,
    contenedor: "T-A-03",
    estado: "pendiente",
    creadoEn: haceMinutos(12),
    validadoEn: null,
    certificadoEn: null,
    codigo: null,
  },
  {
    id: "r2",
    residenteId: "u-vicente",
    residente: "Vicente Torres",
    depto: "Depto 108",
    torre: "Torre A",
    material: "Vidrio",
    kg: 1.4,
    contenedor: "T-A-01",
    estado: "pendiente",
    creadoEn: haceMinutos(34),
    validadoEn: null,
    certificadoEn: null,
    codigo: null,
  },
  {
    id: "r3",
    residenteId: "u-camila",
    residente: "Camila Rojas",
    depto: "Depto 701",
    torre: "Torre B",
    material: "Metal",
    kg: 0.8,
    contenedor: "T-B-02",
    estado: "pendiente",
    creadoEn: haceMinutos(8),
    validadoEn: null,
    certificadoEn: null,
    codigo: null,
  },
  {
    id: "r4",
    residenteId: "u-pedro",
    residente: "Pedro Soto",
    depto: "Depto 203",
    torre: "Torre B",
    material: "Plástico",
    kg: 1.6,
    contenedor: "T-B-02",
    estado: "validado",
    creadoEn: haceMinutos(180),
    validadoEn: haceMinutos(50),
    certificadoEn: null,
    codigo: null,
  },
  {
    id: "r5",
    residenteId: "yo",
    residente: "Álvaro Jaña",
    depto: "Depto 305",
    torre: "Torre A",
    material: "Vidrio",
    kg: 1.4,
    contenedor: "T-A-01",
    estado: "validado",
    creadoEn: haceMinutos(60 * 5),
    validadoEn: haceMinutos(60 * 4),
    certificadoEn: null,
    codigo: null,
  },
  {
    id: "r6",
    residenteId: "yo",
    residente: "Álvaro Jaña",
    depto: "Depto 305",
    torre: "Torre A",
    material: "Papel/cartón",
    kg: 3.0,
    contenedor: "T-A-03",
    estado: "certificado",
    creadoEn: haceMinutos(60 * 30),
    validadoEn: haceMinutos(60 * 28),
    certificadoEn: haceMinutos(60 * 26),
    codigo: "ECO-7KX2-9WMD",
  },
  {
    id: "r7",
    residenteId: "yo",
    residente: "Álvaro Jaña",
    depto: "Depto 305",
    torre: "Torre A",
    material: "Plástico",
    kg: 2.1,
    contenedor: "T-A-03",
    estado: "certificado",
    creadoEn: haceMinutos(60 * 52),
    validadoEn: haceMinutos(60 * 50),
    certificadoEn: haceMinutos(60 * 48),
    codigo: "ECO-3BQ8-HTVN",
  },
];

const BASE_KG_TORRE: Record<TorreId, number> = {
  "Torre A": 130.9,
  "Torre B": 92.4,
};

const TORRES_EXTERNAS = [
  { nombre: "Torre C", condominio: "Condominio Los Aromos", kg: 214, participacion: 81 },
  { nombre: "Torre D", condominio: "Condominio Los Aromos", kg: 121, participacion: 58 },
  { nombre: "Torre E", condominio: "Villa Sur", kg: 67, participacion: 40 },
];

export interface ResumenTorre {
  torre: TorreId;
  residentes: number;
  kgMes: number;
  participacion: number;
  metaKg: number;
  avanceMeta: number;
  pendientes: Registro[];
}

export interface FilaRanking {
  nombre: string;
  condominio: string;
  kg: number;
  participacion: number;
  esMiTorre: boolean;
}

interface EcoTrackValor {
  usuario: Usuario | null;
  registros: Registro[];
  misRegistros: Registro[];
  misKgDelMes: number;
  misCertificados: Registro[];
  miPosicionRanking: number;
  porRetirar: Registro[];
  retirosConfirmadosHoy: number;
  iniciarSesion: (rol: Rol) => void;
  registrarCuenta: (nombre: string) => void;
  vincularTorre: (codigo: string) => TorreId | null;
  cerrarSesion: () => void;
  crearRegistro: (material: Material, kg: number, contenedor: string) => string;
  validarRegistro: (id: string) => void;
  rechazarRegistro: (id: string) => void;
  confirmarRetiro: (id: string) => void;
  registroPorId: (id: string) => Registro | undefined;
  resumenTorre: (torre: TorreId) => ResumenTorre;
  ranking: FilaRanking[];
}

const EcoTrackContext = createContext<EcoTrackValor | null>(null);

const USUARIOS_DEMO: Record<Rol, Usuario> = {
  residente: {
    id: "yo",
    nombre: "Álvaro Jaña",
    depto: "Depto 305",
    torre: "Torre A",
    rol: "residente",
  },
  administrador: {
    id: "admin",
    nombre: "Carla Méndez",
    depto: "Administración",
    torre: "Torre A",
    rol: "administrador",
  },
  gestor: {
    id: "gestor",
    nombre: "Recicla Sur SpA",
    depto: "Gestor externo",
    torre: "Torre A",
    rol: "gestor",
  },
};

export function EcoTrackProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [registros, setRegistros] = useState<Registro[]>(REGISTROS_INICIALES);
  const [retirosConfirmadosHoy, setRetirosConfirmadosHoy] = useState(0);

  function iniciarSesion(rol: Rol) {
    setUsuario(USUARIOS_DEMO[rol]);
  }

  function registrarCuenta(nombre: string) {
    setUsuario({ id: "yo", nombre, depto: "Depto 305", torre: "Torre A", rol: "residente" });
  }

  function vincularTorre(codigo: string): TorreId | null {
    const torre = CODIGOS_TORRE[codigo.trim().toUpperCase()];
    if (!torre) return null;
    setUsuario((prev) => (prev ? { ...prev, torre } : prev));
    return torre;
  }

  function cerrarSesion() {
    setUsuario(null);
  }

  function crearRegistro(material: Material, kg: number, contenedor: string): string {
    const id = `r-${Date.now()}`;
    const nuevo: Registro = {
      id,
      residenteId: usuario?.id ?? "yo",
      residente: usuario?.nombre ?? "Residente",
      depto: usuario?.depto ?? "Depto 305",
      torre: usuario?.torre ?? "Torre A",
      material,
      kg,
      contenedor,
      estado: "pendiente",
      creadoEn: Date.now(),
      validadoEn: null,
      certificadoEn: null,
      codigo: null,
    };
    setRegistros((prev) => [nuevo, ...prev]);
    return id;
  }

  function validarRegistro(id: string) {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === id && r.estado === "pendiente"
          ? { ...r, estado: "validado" as const, validadoEn: Date.now() }
          : r
      )
    );
  }

  function rechazarRegistro(id: string) {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === id && r.estado === "pendiente" ? { ...r, estado: "rechazado" as const } : r
      )
    );
  }

  function confirmarRetiro(id: string) {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === id && r.estado === "validado"
          ? {
              ...r,
              estado: "certificado" as const,
              certificadoEn: Date.now(),
              codigo: generarCodigoVerificacion(),
            }
          : r
      )
    );
    setRetirosConfirmadosHoy((n) => n + 1);
  }

  function registroPorId(id: string) {
    return registros.find((r) => r.id === id);
  }

  const kgCertificadosPorTorre = useMemo(() => {
    const acumulado: Record<TorreId, number> = { "Torre A": 0, "Torre B": 0 };
    for (const r of registros) {
      if (r.estado === "certificado") acumulado[r.torre] += r.kg;
    }
    return acumulado;
  }, [registros]);

  function kgTorre(torre: TorreId): number {
    return Math.round((BASE_KG_TORRE[torre] + kgCertificadosPorTorre[torre]) * 10) / 10;
  }

  function participacionTorre(torre: TorreId): number {
    const deptosActivos = new Set(
      registros.filter((r) => r.torre === torre && r.estado !== "rechazado").map((r) => r.depto)
    );

    const piso = torre === "Torre A" ? 58 : 42;
    return Math.min(
      100,
      piso + Math.round((deptosActivos.size / DEPTOS_POR_TORRE[torre]) * 100 * 0.4)
    );
  }

  function resumenTorre(torre: TorreId): ResumenTorre {
    const kgMes = kgTorre(torre);
    return {
      torre,
      residentes: DEPTOS_POR_TORRE[torre],
      kgMes,
      participacion: participacionTorre(torre),
      metaKg: METAS_TORRE[torre],
      avanceMeta: porcentaje(kgMes, METAS_TORRE[torre]),
      pendientes: registros
        .filter((r) => r.torre === torre && r.estado === "pendiente")
        .sort((a, b) => b.creadoEn - a.creadoEn),
    };
  }

  const ranking = useMemo<FilaRanking[]>(() => {
    const propias: FilaRanking[] = TORRES.map((torre) => ({
      nombre: torre,
      condominio: "Condominio Piloto",
      kg: kgTorre(torre),
      participacion: participacionTorre(torre),
      esMiTorre: usuario?.torre === torre,
    }));
    const externas: FilaRanking[] = TORRES_EXTERNAS.map((t) => ({ ...t, esMiTorre: false }));
    return [...propias, ...externas].sort((a, b) => b.kg - a.kg);
  }, [registros, usuario]);

  const misRegistros = useMemo(
    () =>
      registros
        .filter((r) => r.residenteId === (usuario?.id ?? "yo"))
        .sort((a, b) => b.creadoEn - a.creadoEn),
    [registros, usuario]
  );

  const misCertificados = useMemo(
    () => misRegistros.filter((r) => r.estado === "certificado"),
    [misRegistros]
  );

  const misKgDelMes = useMemo(
    () => sumaKg(misCertificados.map((r) => r.kg)),
    [misCertificados]
  );

  const miPosicionRanking = useMemo(() => {
    const indice = ranking.findIndex((t) => t.esMiTorre);
    return indice === -1 ? ranking.length : indice + 1;
  }, [ranking]);

  const porRetirar = useMemo(
    () =>
      registros
        .filter((r) => r.estado === "validado")
        .sort((a, b) => (a.validadoEn ?? 0) - (b.validadoEn ?? 0)),
    [registros]
  );

  const valor: EcoTrackValor = {
    usuario,
    registros,
    misRegistros,
    misKgDelMes,
    misCertificados,
    miPosicionRanking,
    porRetirar,
    retirosConfirmadosHoy,
    iniciarSesion,
    registrarCuenta,
    vincularTorre,
    cerrarSesion,
    crearRegistro,
    validarRegistro,
    rechazarRegistro,
    confirmarRetiro,
    registroPorId,
    resumenTorre,
    ranking,
  };

  return <EcoTrackContext.Provider value={valor}>{children}</EcoTrackContext.Provider>;
}

export function useEcoTrack(): EcoTrackValor {
  const contexto = useContext(EcoTrackContext);
  if (!contexto) {
    throw new Error("useEcoTrack debe usarse dentro de <EcoTrackProvider>");
  }
  return contexto;
}
