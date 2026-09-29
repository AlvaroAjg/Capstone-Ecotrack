import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { esDeHoy, esDelMesActual, sumaKg } from "../lib/formato";
import * as derivados from "../lib/derivados";
import {
  kgEfectivo,
  type FilaRanking,
  type LoteRetiro,
  type Material,
  type Mision,
  type Registro,
  type ResumenTorre,
  type Contaminante,
  type Incidencia,
  type Rol,
  type Talla,
  type Torre,
  type Usuario,
} from "../lib/tipos";
import { construirAvisos, esNuevo, type Aviso } from "../lib/avisos";
import {
  misionSemanal as calcularSemanal,
  puntosDelMes,
  type MisionSistema,
} from "../lib/misionesSistema";
import * as servicioAuth from "../services/auth";
import * as servicioIncidencias from "../services/incidencias";
import * as servicioMisiones from "../services/misiones";
import * as servicioRegistros from "../services/registros";
import * as servicioTorres from "../services/torres";

// Se reexportan para no romper los imports existentes de las pantallas.
export {
  MATERIALES,
  ROLES,
  TALLAS,
  nombreContenedor,
  type Contenedor,
  kgEfectivo,
  kgEstimado,
  type Talla,
  type EstadoRegistro,
  type FilaRanking,
  type Incidencia,
  type LoteRetiro,
  type Material,
  type Mision,
  type Registro,
  type ResumenTorre,
  type Rol,
  type Torre,
  type Usuario,
} from "../lib/tipos";

interface EcoTrackValor {
  // Sesión
  cargandoSesion: boolean;
  usuario: Usuario | null;
  miTorre: Torre | null;
  errorDatos: string | null;

  // Datos en vivo desde Firestore
  registros: Registro[];
  torres: Torre[];

  // Derivados del residente
  misRegistros: Registro[];
  misKgDelMes: number;
  misCertificados: Registro[];
  miPosicionRanking: number;

  // Derivados del gestor: trabaja por lote de torre, nunca por residente
  lotesPorRetirar: LoteRetiro[];
  kgEnCola: number;
  retirosConfirmadosHoy: number;

  // Misión activa de mi torre (null si todavía no se ha definido una)
  mision: Mision | null;

  // Contenedores reportados como contaminados: los de mi torre (admin y
  // residente) o los que el gestor todavía no retira
  incidencias: Incidencia[];
  reportarContaminacion: (datos: {
    contenedor: string;
    contenedorNombre: string;
    contaminante: Contaminante;
  }) => Promise<void>;

  // Avisos del avance de la cadena, según el rol (ver lib/avisos.ts)
  avisos: Aviso[];
  avisosNuevos: number;
  marcarAvisosVistos: () => Promise<void>;

  // Misión semanal del sistema, calculada con los depósitos del residente
  misionSemanal: MisionSistema;
  ecoPuntosMes: number;

  // Acciones
  iniciarSesion: (email: string, password: string) => Promise<void>;
  iniciarSesionConGoogle: () => Promise<void>;
  registrarCuenta: (datos: {
    nombre: string;
    email: string;
    password: string;
    rol: Rol;
    depto: string;
    /** Solo para gestor: código que habilita ese rol al crear la cuenta. */
    codigoRolUsado?: string;
  }) => Promise<void>;
  vincularTorre: (codigo: string, depto: string) => Promise<Torre>;
  vincularComoAdministrador: (codigoTorre: string, codigoAdmin: string) => Promise<Torre>;
  actualizarPerfil: (datos: { nombre: string; depto?: string }) => Promise<void>;
  cambiarContrasena: (actual: string, nueva: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  crearRegistro: (material: Material, talla: Talla, contenedor: string) => Promise<string>;
  validarRegistro: (registro: Registro) => Promise<void>;
  rechazarRegistro: (id: string) => Promise<void>;
  confirmarRetiro: (torreId: string) => Promise<string>;
  registroPorId: (id: string) => Registro | undefined;
  resumenTorre: (torreId: string | null) => ResumenTorre;
  guardarMision: (datos: { metaKg: number; incentivo: string }) => Promise<void>;
  ranking: FilaRanking[];
}

const EcoTrackContext = createContext<EcoTrackValor | null>(null);

export function EcoTrackProvider({ children }: { children: React.ReactNode }) {
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [torres, setTorres] = useState<Torre[]>([]);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [mision, setMision] = useState<Mision | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // Entre `createUser` y la creación del documento de perfil hay una ventana en
  // la que el usuario está autenticado pero aún no tiene perfil. Esta bandera
  // evita mostrar la pantalla de login durante ese instante.
  const registrandoRef = useRef(false);

  // Usuario de Firebase Auth de la sesión actual, para saber si entró con Google.
  const usuarioAuthRef = useRef<servicioAuth.UsuarioAuth | null>(null);
  // Evita crear dos veces el perfil de Google si el snapshot llega repetido.
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

        // Primer ingreso con Google: no hay registro previo, así que se crea
        // el perfil de residente aquí. Sirve igual si Google volvió por
        // ventana emergente o por redirección.
        const usuarioAuth = usuarioAuthRef.current;
        if (usuarioAuth?.uid === uid && servicioAuth.entroConGoogle(usuarioAuth)) {
          creandoPerfilRef.current = true;
          servicioAuth
            .crearPerfilGoogle(usuarioAuth)
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

  // 3. Datos compartidos, en tiempo real: las torres, con la sesión.
  useEffect(() => {
    if (!uid) {
      setTorres([]);
      return;
    }
    return servicioTorres.escucharTorres(setTorres);
  }, [uid]);

  // 3b. Los registros dependen del rol y la torre (ver consultasPara en
  // services/registros.ts), así que esperan al perfil y se vuelven a pedir si
  // cambian, por ejemplo al promoverse a administrador.
  const idPerfil = usuario?.id ?? null;
  const rolPerfil = usuario?.rol ?? null;
  const torrePerfil = usuario?.torreId ?? null;
  useEffect(() => {
    if (!idPerfil || !rolPerfil) {
      setRegistros([]);
      setErrorDatos(null);
      return;
    }
    return servicioRegistros.escucharRegistros(
      { id: idPerfil, rol: rolPerfil, torreId: torrePerfil },
      (lista) => {
        setRegistros(lista);
        setErrorDatos(null);
      },
      (error) => setErrorDatos(servicioAuth.mensajeError(error))
    );
  }, [idPerfil, rolPerfil, torrePerfil]);

  // 4. Misión activa de mi torre. El gestor no tiene torre, así que nunca escucha una.
  useEffect(() => {
    const torreId = usuario?.torreId ?? null;
    if (!torreId) {
      setMision(null);
      return;
    }
    return servicioMisiones.escucharMision(torreId, setMision);
  }, [usuario?.torreId]);

  // 5. Incidencias de contaminación. El gestor ve las pendientes de todas las
  // torres (son advertencias para su retiro); los demás, las de su torre.
  useEffect(() => {
    if (usuario?.rol === "gestor") {
      return servicioIncidencias.escucharIncidenciasPendientes(setIncidencias);
    }
    if (usuario?.torreId) {
      return servicioIncidencias.escucharIncidenciasDeTorre(usuario.torreId, setIncidencias);
    }
    setIncidencias([]);
  }, [usuario?.rol, usuario?.torreId]);

  const miTorre = useMemo(
    () => torres.find((t) => t.id === usuario?.torreId) ?? null,
    [torres, usuario]
  );

  // ---------------------------------------------------------------- acciones

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    await servicioAuth.iniciarSesion(email, password);
  }, []);

  const iniciarSesionConGoogle = useCallback(async () => {
    await servicioAuth.iniciarSesionConGoogle();
  }, []);

  const registrarCuenta = useCallback(
    async (datos: {
      nombre: string;
      email: string;
      password: string;
      rol: Rol;
      depto: string;
    }) => {
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

  const vincularTorre = useCallback(
    async (codigo: string, depto: string) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      const torre = await servicioTorres.buscarTorrePorCodigo(codigo);
      if (!torre) throw new Error("Código no válido. Verifícalo con tu administrador.");
      await servicioAuth.vincularTorreAlPerfil(usuario.id, torre.id, torre.nombre, depto);
      return torre;
    },
    [usuario]
  );

  /**
   * Un residente se promueve a administrador de su torre presentando el
   * código de esa torre. La regla de Firestore es quien realmente decide: si
   * el código está mal, esta llamada falla con un mensaje claro en vez del
   * genérico "permission-denied".
   */
  const vincularComoAdministrador = useCallback(
    async (codigoTorre: string, codigoAdmin: string) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      const torre = await servicioTorres.buscarTorrePorCodigo(codigoTorre);
      if (!torre) throw new Error("Código de torre no válido. Verifícalo con tu administrador.");
      try {
        await servicioAuth.promoverAAdministrador(usuario.id, torre.id, torre.nombre, codigoAdmin);
      } catch (error) {
        if ((error as { code?: string })?.code === "permission-denied") {
          throw new Error("Código de administrador incorrecto.");
        }
        throw error;
      }
      return torre;
    },
    [usuario]
  );

  const actualizarPerfil = useCallback(
    async (datos: { nombre: string; depto?: string }) => {
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

  const validarRegistro = useCallback(
    async (registro: Registro) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      await servicioRegistros.validarRegistro(registro, usuario.id);
    },
    [usuario]
  );

  const rechazarRegistro = useCallback(
    async (id: string) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      await servicioRegistros.rechazarRegistro(id, usuario.id);
    },
    [usuario]
  );

  const registroPorId = useCallback(
    (id: string) => registros.find((r) => r.id === id),
    [registros]
  );

  const guardarMision = useCallback(
    async (datos: { metaKg: number; incentivo: string }) => {
      if (!usuario?.torreId) throw new Error("No hay una sesión activa.");
      await servicioMisiones.guardarMision(usuario.torreId, usuario.id, datos);
    },
    [usuario]
  );

  // --------------------------------------------------------------- derivados

  // Ver lib/derivados.ts: aquí solo se memorizan.
  const resumenTorre = useCallback(
    (torreId: string | null): ResumenTorre =>
      derivados.resumenDeTorre(torreId, torres, registros, mision),
    [registros, torres, mision]
  );

  const ranking = useMemo(
    () => derivados.rankingDeTorres(torres, registros, mision, usuario?.torreId ?? null),
    [torres, registros, mision, usuario?.torreId]
  );

  const misRegistros = useMemo(
    () => (usuario ? registros.filter((r) => r.residenteId === usuario.id) : []),
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
  const ecoPuntosMes = useMemo(() => puntosDelMes(misRegistros), [misRegistros]);

  const miPosicionRanking = useMemo(() => {
    const indice = ranking.findIndex((t) => t.esMiTorre);
    return indice === -1 ? ranking.length : indice + 1;
  }, [ranking]);

  // Lo que ve el gestor: un lote por torre (ver lotesPorRetirar en lib/derivados.ts).
  const lotesPorRetirar = useMemo(
    () => derivados.lotesPorRetirar(registros, torres),
    [registros, torres]
  );

  const kgEnCola = useMemo(
    () => sumaKg(lotesPorRetirar.map((l) => l.kgTotal)),
    [lotesPorRetirar]
  );

  /** Confirma el retiro del contenedor completo de una torre. */
  const confirmarRetiro = useCallback(
    async (torreId: string) => {
      if (!usuario) throw new Error("No hay una sesión activa.");
      const lote = lotesPorRetirar.find((l) => l.torreId === torreId);
      if (!lote) throw new Error("Ese lote ya no está disponible.");
      const codigo = await servicioRegistros.confirmarRetiroDeTorre(lote.registros, usuario.id);
      // Con el contenedor retirado, sus advertencias de contaminación ya se
      // atendieron. Si esto fallara, el retiro igual quedó hecho.
      await servicioIncidencias
        .marcarAtendidas(
          incidencias.filter((i) => i.torreId === torreId && !i.atendida),
          codigo
        )
        .catch(() => undefined);
      return codigo;
    },
    [usuario, lotesPorRetirar, incidencias]
  );


  const avisos = useMemo(
    () => construirAvisos(usuario, registros, lotesPorRetirar, incidencias),
    [usuario, registros, lotesPorRetirar, incidencias]
  );

  const reportarContaminacion = useCallback(
    async (datos: { contenedor: string; contenedorNombre: string; contaminante: Contaminante }) => {
      if (!usuario?.torreId) throw new Error("No hay una sesión activa.");
      await servicioIncidencias.reportarContaminacion({
        ...datos,
        torreId: usuario.torreId,
        torreNombre: usuario.torreNombre ?? usuario.torreId,
        adminUid: usuario.id,
      });
    },
    [usuario]
  );

  const avisosNuevos = useMemo(
    () => avisos.filter((a) => esNuevo(a, usuario?.avisosVistosHasta ?? 0)).length,
    [avisos, usuario?.avisosVistosHasta]
  );

  const marcarAvisosVistos = useCallback(async () => {
    if (!usuario || avisosNuevos === 0) return;
    await servicioAuth.marcarAvisosVistos(usuario.id, Date.now());
  }, [usuario, avisosNuevos]);

  const retirosConfirmadosHoy = useMemo(
    () =>
      registros.filter(
        (r) =>
          r.estado === "certificado" &&
          r.certificadoPor === usuario?.id &&
          esDeHoy(r.certificadoEn)
      ).length,
    [registros, usuario]
  );

  const valor: EcoTrackValor = {
    cargandoSesion,
    usuario,
    miTorre,
    errorDatos,
    registros,
    torres,
    misRegistros,
    misKgDelMes,
    misCertificados,
    miPosicionRanking,
    lotesPorRetirar,
    kgEnCola,
    retirosConfirmadosHoy,
    mision,
    misionSemanal,
    ecoPuntosMes,
    incidencias,
    reportarContaminacion,
    avisos,
    avisosNuevos,
    marcarAvisosVistos,
    iniciarSesion,
    iniciarSesionConGoogle,
    registrarCuenta,
    vincularTorre,
    vincularComoAdministrador,
    actualizarPerfil,
    cambiarContrasena,
    cerrarSesion,
    crearRegistro,
    validarRegistro,
    rechazarRegistro,
    confirmarRetiro,
    registroPorId,
    resumenTorre,
    guardarMision,
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
