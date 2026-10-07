import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { esDelMesActual, sumaKg } from "../lib/formato";
import { mesDe } from "../lib/certificadoMensual";
import * as derivados from "../lib/derivados";
import {
  kgEfectivo,
  type Area,
  type Campana,
  type Contaminante,
  type Contenedor,
  type ContenedorPorRetirar,
  type FilaRanking,
  type Incidencia,
  type Material,
  type Planta,
  type Registro,
  type ResumenMes,
  type Retiro,
  type Talla,
  type Usuario,
} from "../lib/tipos";
import { construirAvisos, esNuevo, type Aviso } from "../lib/avisos";
import {
  misionSemanal as calcularSemanal,
  puntosDelMes,
  type MisionSistema,
} from "../lib/misionesSistema";
import * as servicioAreas from "../services/areas";
import * as servicioAuth from "../services/auth";
import * as servicioCampanas from "../services/campanas";
import * as servicioContenedores from "../services/contenedores";
import * as servicioIncidencias from "../services/incidencias";
import * as servicioPlantas from "../services/plantas";
import * as servicioRegistros from "../services/registros";
import * as servicioResumenes from "../services/resumenes";
import * as servicioRetiros from "../services/retiros";

// Se reexportan para no romper los imports existentes de las pantallas.
export {
  MATERIALES,
  ROLES,
  TALLAS,
  nombreContenedor,
  type Area,
  type Campana,
  type Contenedor,
  type ContenedorPorRetirar,
  kgEfectivo,
  kgEstimado,
  type Talla,
  type EstadoRegistro,
  type FilaRanking,
  type Incidencia,
  type Material,
  type Planta,
  type Registro,
  type ResumenMes,
  type Retiro,
  type Rol,
  type Usuario,
} from "../lib/tipos";
export type { DatosRetiro } from "../services/retiros";

interface EcoTrackValor {
  // Sesión
  cargandoSesion: boolean;
  usuario: Usuario | null;
  miPlanta: Planta | null;
  errorDatos: string | null;

  // Datos en vivo desde Firestore
  /** Todas las plantas: para elegir una al promoverse a administrador. */
  plantas: Planta[];
  /** Las áreas de mi planta. */
  areas: Area[];
  /** Colaborador: los suyos. Validador y administrador: los de su planta. */
  registros: Registro[];

  // Derivados del colaborador
  misRegistros: Registro[];
  misKgDelMes: number;
  misCertificados: Registro[];

  // Ranking de áreas del mes, calculado con el resumen (sin depósitos ajenos)
  resumenMes: ResumenMes | null;
  ranking: FilaRanking[];
  miPosicionRanking: number;

  // Incentivo vigente de mi planta (null si todavía no se ha definido uno)
  campana: Campana | null;
  /** Cómo va mi área frente a la meta del incentivo; null si no hay tarjeta que mostrar. */
  miIncentivo: derivados.AvanceIncentivo | null;

  // Validador y administrador: los contenedores de la planta
  contenedores: Contenedor[];
  // Administrador: lo que espera retiro, por contenedor, y los retiros hechos
  porRetirar: ContenedorPorRetirar[];
  retiros: Retiro[];

  // Contenedores reportados como contaminados en mi planta
  incidencias: Incidencia[];
  /** Reporta el contenedor contaminado y valida sus depósitos, en un solo lote. */
  reportarYValidar: (
    datos: { contenedor: string; contenedorNombre: string; contaminante: Contaminante },
    registros: Registro[]
  ) => Promise<void>;

  // Avisos del avance de la cadena, según el rol (ver lib/avisos.ts)
  avisos: Aviso[];
  avisosNuevos: number;
  marcarAvisosVistos: () => Promise<void>;

  // Misión semanal del sistema, calculada con los depósitos del colaborador
  misionSemanal: MisionSistema;
  puntosMes: number;

  // Acciones
  iniciarSesion: (email: string, password: string) => Promise<void>;
  iniciarSesionConProveedor: (proveedor: servicioAuth.ProveedorExterno) => Promise<void>;
  registrarCuenta: (datos: { nombre: string; email: string; password: string }) => Promise<void>;
  /** El área de un código, para mostrar su nombre antes de unirse. */
  buscarArea: (codigo: string) => Promise<Area | null>;
  unirseAArea: (area: Area) => Promise<void>;
  promoverAAdministrador: (plantaId: string, codigoAdmin: string) => Promise<Planta>;
  actualizarPerfil: (datos: { nombre: string }) => Promise<void>;
  cambiarContrasena: (actual: string, nueva: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  crearRegistro: (material: Material, talla: Talla, contenedor: string) => Promise<string>;
  /** Cada llamada es un lote atómico: o se procesan todos, o ninguno. */
  validarRegistros: (registros: Registro[]) => Promise<void>;
  rechazarRegistros: (ids: string[]) => Promise<void>;
  /** Registra el retiro de esos contenedores y certifica sus depósitos validados. */
  registrarRetiro: (
    datos: servicioRetiros.DatosRetiro,
    contenedores: string[]
  ) => Promise<string>;
  registroPorId: (id: string) => Registro | undefined;
  guardarCampana: (datos: {
    nombre: string;
    metaParticipacion: number;
    incentivo: string;
    terminaEn: number;
  }) => Promise<void>;
}

const EcoTrackContext = createContext<EcoTrackValor | null>(null);

export function EcoTrackProvider({ children }: { children: React.ReactNode }) {
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [campana, setCampana] = useState<Campana | null>(null);
  const [resumenMes, setResumenMes] = useState<ResumenMes | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);

  // Entre `createUser` y la creación del documento de perfil hay una ventana en
  // la que el usuario está autenticado pero aún no tiene perfil. Esta bandera
  // evita mostrar la pantalla de login durante ese instante.
  const registrandoRef = useRef(false);

  // Usuario de Firebase Auth de la sesión actual, para saber si entró con
  // Google o Microsoft.
  const usuarioAuthRef = useRef<servicioAuth.UsuarioAuth | null>(null);
  // Evita crear dos veces el perfil externo si el snapshot llega repetido.
  const creandoPerfilRef = useRef(false);

  // 1. Sesión de Firebase Auth (persistida en AsyncStorage).
  useEffect(() => {
    return servicioAuth.escucharSesion((u) => {
      usuarioAuthRef.current = u;
      setUid(u?.uid ?? null);
      if (!u) {
        setUsuario(null);
        setCargandoSesion(false);
      }
    });
  }, []);

  // 2. Perfil del usuario en Firestore.
  useEffect(() => {
    if (!uid) return;
    setCargandoSesion(true);
    return servicioAuth.escucharPerfil(uid, (perfil) => {
      if (!perfil) {
        // Durante el registro el perfil todavía se está creando.
        if (registrandoRef.current || creandoPerfilRef.current) return;

        // Primer ingreso con Google o Microsoft: no hay registro previo, así
        // que se crea el perfil de colaborador aquí. Sirve igual si la cuenta
        // volvió por ventana emergente o por redirección.
        const usuarioAuth = usuarioAuthRef.current;
        const proveedor = servicioAuth.proveedorExterno(usuarioAuth);
        if (usuarioAuth?.uid === uid && proveedor) {
          creandoPerfilRef.current = true;
          servicioAuth
            .crearPerfilExterno(usuarioAuth, proveedor)
            .catch(() => servicioAuth.cerrarSesion().catch(() => undefined))
            .finally(() => {
              creandoPerfilRef.current = false;
            });
          return;
        }

        // Sesión autenticada sin documento de perfil: se cierra para no dejar
        // al usuario en un estado a medias.
        servicioAuth.cerrarSesion().catch(() => undefined);
        return;
      }
      setUsuario(perfil);
      setCargandoSesion(false);
    });
  }, [uid]);

  // 3. Las plantas, con la sesión. En el piloto hay una sola.
  useEffect(() => {
    if (!uid) {
      setPlantas([]);
      return;
    }
    return servicioPlantas.escucharPlantas(setPlantas);
  }, [uid]);

  // 3b. Los registros dependen del rol y la planta (ver consultasPara en
  // services/registros.ts), así que esperan al perfil y se vuelven a pedir si
  // cambian, por ejemplo al promoverse a administrador.
  const idPerfil = usuario?.id ?? null;
  const rolPerfil = usuario?.rol ?? null;
  const plantaPerfil = usuario?.plantaId ?? null;
  useEffect(() => {
    if (!idPerfil || !rolPerfil) {
      setRegistros([]);
      setErrorDatos(null);
      return;
    }
    return servicioRegistros.escucharRegistros(
      { id: idPerfil, rol: rolPerfil, plantaId: plantaPerfil },
      (lista) => {
        setRegistros(lista);
        setErrorDatos(null);
      },
      (error) => setErrorDatos(servicioAuth.mensajeError(error))
    );
  }, [idPerfil, rolPerfil, plantaPerfil]);

  // 4. Lo compartido por todos los de mi planta: sus áreas, el incentivo, el
  // resumen del mes (para el ranking) y las incidencias. El mes del resumen
  // se fija al suscribirse: si la app queda abierta al cambiar de mes, sigue
  // mostrando el anterior hasta volver a abrirla.
  useEffect(() => {
    if (!plantaPerfil) {
      setAreas([]);
      setCampana(null);
      setResumenMes(null);
      setIncidencias([]);
      return;
    }
    const dejar = [
      servicioAreas.escucharAreas(plantaPerfil, setAreas),
      servicioCampanas.escucharCampana(plantaPerfil, setCampana),
      servicioResumenes.escucharResumen(plantaPerfil, mesDe(Date.now()), setResumenMes),
      servicioIncidencias.escucharIncidencias(plantaPerfil, setIncidencias),
    ];
    return () => dejar.forEach((d) => d());
  }, [plantaPerfil]);

  // 5. Los contenedores, para el validador y el administrador: las reglas no
  // dejan que un colaborador los liste (así nadie descubre los códigos sin
  // estar frente al contenedor).
  useEffect(() => {
    if (!plantaPerfil || (rolPerfil !== "validador" && rolPerfil !== "administrador")) {
      setContenedores([]);
      return;
    }
    return servicioContenedores.escucharContenedores(plantaPerfil, setContenedores);
  }, [plantaPerfil, rolPerfil]);

  // 6. Los retiros, solo para el administrador, que es quien los registra.
  useEffect(() => {
    if (!plantaPerfil || rolPerfil !== "administrador") {
      setRetiros([]);
      return;
    }
    return servicioRetiros.escucharRetiros(plantaPerfil, setRetiros);
  }, [plantaPerfil, rolPerfil]);

  const miPlanta = useMemo(
    () => plantas.find((p) => p.id === usuario?.plantaId) ?? null,
    [plantas, usuario?.plantaId]
  );

  // ---------------------------------------------------------------- acciones

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    await servicioAuth.iniciarSesion(email, password);
  }, []);

  const iniciarSesionConProveedor = useCallback(
    async (proveedor: servicioAuth.ProveedorExterno) => {
      await servicioAuth.iniciarSesionConProveedor(proveedor);
    },
    []
  );

  const registrarCuenta = useCallback(
    async (datos: { nombre: string; email: string; password: string }) => {
      registrandoRef.current = true;
      try {
        await servicioAuth.registrarCuenta(datos);
      } catch (error) {
        // Si la cuenta de Auth se creó pero el perfil no, se cierra la sesión
        // para que el usuario pueda reintentar desde cero.
        await servicioAuth.cerrarSesion().catch(() => undefined);
        throw error;
      } finally {
        registrandoRef.current = false;
      }
    },
    []
  );

  const buscarArea = useCallback(
    (codigo: string) => servicioAreas.buscarAreaPorCodigo(codigo),
    []
  );

  const unirseAArea = useCallback(
    async (area: Area) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      await servicioAuth.unirseAArea(usuario.id, area);
    },
    [usuario]
  );

  /**
   * Un colaborador se promueve a administrador de una planta presentando el
   * código de esa planta. La regla de Firestore es quien realmente decide: si
   * el código está mal, esta llamada falla con un mensaje claro en vez del
   * genérico "permission-denied".
   */
  const promoverAAdministrador = useCallback(
    async (plantaId: string, codigoAdmin: string) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      const planta = plantas.find((p) => p.id === plantaId);
      if (!planta) throw new Error("Elige una planta.");
      try {
        await servicioAuth.promoverAAdministrador(usuario.id, planta.id, codigoAdmin);
      } catch (error) {
        if ((error as { code?: string })?.code === "permission-denied") {
          throw new Error("Código de administrador incorrecto.");
        }
        throw error;
      }
      return planta;
    },
    [usuario, plantas]
  );

  const actualizarPerfil = useCallback(
    async (datos: { nombre: string }) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      // El perfil se escucha en tiempo real: al guardar, `usuario` se refresca solo.
      await servicioAuth.actualizarPerfil(usuario.id, datos);
    },
    [usuario]
  );

  const cambiarContrasena = useCallback(async (actual: string, nueva: string) => {
    await servicioAuth.cambiarContrasena(actual, nueva);
  }, []);

  const cerrarSesion = useCallback(async () => {
    await servicioAuth.cerrarSesion();
  }, []);

  const crearRegistro = useCallback(
    async (material: Material, talla: Talla, contenedor: string) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      return servicioRegistros.crearRegistro(usuario, material, talla, contenedor);
    },
    [usuario]
  );

  const validarRegistros = useCallback(
    async (lista: Registro[]) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      await servicioRegistros.validarRegistros(lista, usuario.id);
    },
    [usuario]
  );

  const rechazarRegistros = useCallback(
    async (ids: string[]) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      await servicioRegistros.rechazarRegistros(ids, usuario.id);
    },
    [usuario]
  );

  const registroPorId = useCallback(
    (id: string) => registros.find((r) => r.id === id),
    [registros]
  );

  const guardarCampana = useCallback(
    async (datos: {
      nombre: string;
      metaParticipacion: number;
      incentivo: string;
      terminaEn: number;
    }) => {
      if (!usuario?.plantaId) throw new Error("No hay una sesión activa.");
      await servicioCampanas.guardarCampana(usuario.plantaId, usuario.id, datos);
    },
    [usuario]
  );

  const reportarYValidar = useCallback(
    async (
      datos: { contenedor: string; contenedorNombre: string; contaminante: Contaminante },
      lista: Registro[]
    ) => {
      if (!usuario?.plantaId) throw new Error("No hay una sesión activa.");
      const reporte = { ...datos, plantaId: usuario.plantaId, reportadoPor: usuario.id };
      await servicioRegistros.validarRegistros(lista, usuario.id, (lote) =>
        servicioIncidencias.agregarReporte(lote, reporte)
      );
    },
    [usuario]
  );

  // --------------------------------------------------------------- derivados

  // Ver lib/derivados.ts: aquí solo se memorizan.
  const ranking = useMemo(
    () => derivados.rankingDeAreas(areas, resumenMes, usuario?.areaId ?? null),
    [areas, resumenMes, usuario?.areaId]
  );

  const miPosicionRanking = useMemo(() => {
    const indice = ranking.findIndex((a) => a.esMiArea);
    return indice === -1 ? ranking.length : indice + 1;
  }, [ranking]);

  const miIncentivo = useMemo(
    () => derivados.avanceIncentivo(campana, ranking),
    [campana, ranking]
  );

  const misRegistros = useMemo(
    () => (usuario ? registros.filter((r) => r.colaboradorId === usuario.id) : []),
    [registros, usuario]
  );

  const misCertificados = useMemo(
    () => misRegistros.filter((r) => r.estado === "certificado"),
    [misRegistros]
  );

  const misKgDelMes = useMemo(
    () =>
      sumaKg(
        misCertificados
          .filter((r) => esDelMesActual(r.certificadoEn))
          .map(kgEfectivo)
      ),
    [misCertificados]
  );

  const misionSemanal = useMemo(() => calcularSemanal(misRegistros), [misRegistros]);
  const puntosMes = useMemo(() => puntosDelMes(misRegistros), [misRegistros]);

  // Lo que ve el administrador: un grupo por contenedor (ver
  // contenedoresPorRetirar en lib/derivados.ts).
  const porRetirar = useMemo(
    () => derivados.contenedoresPorRetirar(registros, contenedores),
    [registros, contenedores]
  );

  const registrarRetiro = useCallback(
    async (datos: servicioRetiros.DatosRetiro, codigos: string[]) => {
      if (!usuario?.plantaId) throw new Error("No hay una sesión activa.");
      const elegidos = porRetirar.filter((c) => codigos.includes(c.contenedor));
      if (elegidos.length === 0) throw new Error("Elige al menos un contenedor con depósitos validados.");
      return servicioRetiros.registrarRetiro(
        usuario.plantaId,
        usuario.id,
        datos,
        elegidos,
        incidencias,
        retiros.map((r) => r.id)
      );
    },
    [usuario, porRetirar, incidencias, retiros]
  );

  const avisos = useMemo(
    () => construirAvisos(usuario, registros, porRetirar, incidencias),
    [usuario, registros, porRetirar, incidencias]
  );

  const avisosNuevos = useMemo(
    () => avisos.filter((a) => esNuevo(a, usuario?.avisosVistosHasta ?? 0)).length,
    [avisos, usuario?.avisosVistosHasta]
  );

  const marcarAvisosVistos = useCallback(async () => {
    if (!usuario || avisosNuevos === 0) return;
    await servicioAuth.marcarAvisosVistos(usuario.id, Date.now());
  }, [usuario, avisosNuevos]);

  const valor: EcoTrackValor = {
    cargandoSesion,
    usuario,
    miPlanta,
    errorDatos,
    plantas,
    areas,
    registros,
    misRegistros,
    misKgDelMes,
    misCertificados,
    resumenMes,
    ranking,
    miPosicionRanking,
    campana,
    miIncentivo,
    contenedores,
    porRetirar,
    retiros,
    incidencias,
    reportarYValidar,
    avisos,
    avisosNuevos,
    marcarAvisosVistos,
    misionSemanal,
    puntosMes,
    iniciarSesion,
    iniciarSesionConProveedor,
    registrarCuenta,
    buscarArea,
    unirseAArea,
    promoverAAdministrador,
    actualizarPerfil,
    cambiarContrasena,
    cerrarSesion,
    crearRegistro,
    validarRegistros,
    rechazarRegistros,
    registrarRetiro,
    registroPorId,
    guardarCampana,
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
