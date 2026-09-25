import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  esDeHoy,
  esDelMesActual,
  porcentaje,
  sumaKg,
} from "../lib/formato";
import {
  kgEfectivo,
  type FilaRanking,
  type LoteRetiro,
  type Material,
  type Mision,
  type Registro,
  type ResumenTorre,
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
import * as servicioDemo from "../services/demo";
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
  preparandoDemo: boolean;
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
  prepararDemo: (
    alAvanzar?: (mensaje: string) => void
  ) => Promise<servicioDemo.ResultadoPreparacion>;
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
  const [preparandoDemo, setPreparandoDemo] = useState(false);
  const [mision, setMision] = useState<Mision | null>(null);

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

  // 3. Datos compartidos: torres y registros, en tiempo real.
  useEffect(() => {
    if (!uid) {
      setRegistros([]);
      setTorres([]);
      setErrorDatos(null);
      return;
    }

    const dejarTorres = servicioTorres.escucharTorres(setTorres);
    const dejarRegistros = servicioRegistros.escucharRegistros(
      (lista) => {
        setRegistros(lista);
        setErrorDatos(null);
      },
      (error) => setErrorDatos(servicioAuth.mensajeError(error))
    );

    return () => {
      dejarTorres();
      dejarRegistros();
    };
  }, [uid]);

  // 4. Misión activa de mi torre. El gestor no tiene torre, así que nunca escucha una.
  useEffect(() => {
    const torreId = usuario?.torreId ?? null;
    if (!torreId) {
      setMision(null);
      return;
    }
    return servicioMisiones.escucharMision(torreId, setMision);
  }, [usuario?.torreId]);

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

  /**
   * Prepara el proyecto para demostrar: torres y las tres cuentas, de una vez.
   * Durante el proceso la sesión cambia varias veces (una por cuenta creada),
   * por eso se marca `registrandoRef` y `preparandoDemo`: así la app no
   * interpreta esos estados intermedios como una sesión rota.
   */
  const prepararDemo = useCallback(
    async (alAvanzar?: (mensaje: string) => void) => {
      registrandoRef.current = true;
      setPreparandoDemo(true);
      try {
        return await servicioDemo.prepararDemo(alAvanzar);
      } finally {
        registrandoRef.current = false;
        setPreparandoDemo(false);
      }
    },
    []
  );

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

  /**
   * Métricas reales, calculadas solo con datos de Firestore.
   * No hay valores base ni pisos artificiales: si la torre no ha certificado
   * nada este mes, el contador muestra 0.
   */
  const resumenTorre = useCallback(
    (torreId: string | null): ResumenTorre => {
      const torre = torres.find((t) => t.id === torreId) ?? null;
      const deLaTorre = registros.filter((r) => r.torreId === torreId);

      const certificadosDelMes = deLaTorre.filter(
        (r) => r.estado === "certificado" && esDelMesActual(r.certificadoEn)
      );
      const kgMes = sumaKg(certificadosDelMes.map(kgEfectivo));

      const deptosActivos = new Set(
        deLaTorre
          .filter((r) => r.estado !== "rechazado" && esDelMesActual(r.creadoEn))
          .map((r) => r.depto)
          .filter(Boolean)
      );

      const deptosTotales = torre?.deptosTotales ?? 0;
      // La misión de la torre, si el administrador definió una, reemplaza la
      // meta base sembrada en Torre.metaKg. `mision` solo está cargada para la
      // torre del usuario actual, de ahí la comprobación de torreId.
      const metaKg =
        mision && mision.torreId === torreId ? mision.metaKg : torre?.metaKg ?? 0;

      return {
        torre,
        deptosActivos: deptosActivos.size,
        deptosTotales,
        kgMes,
        participacion: porcentaje(deptosActivos.size, deptosTotales),
        metaKg,
        avanceMeta: porcentaje(kgMes, metaKg),
        pendientes: deLaTorre.filter((r) => r.estado === "pendiente"),
      };
    },
    [registros, torres, mision]
  );

  /**
   * EcoPuntos del mes por torre: la suma de los de cada residente, calculados
   * igual que los propios (misión semanal con sus depósitos no rechazados).
   */
  const ecoPuntosPorTorre = useMemo(() => {
    const porResidente = new Map<string, { torreId: string; registros: Registro[] }>();
    for (const r of registros) {
      const entrada = porResidente.get(r.residenteId) ?? { torreId: r.torreId, registros: [] };
      entrada.registros.push(r);
      porResidente.set(r.residenteId, entrada);
    }

    const totales = new Map<string, number>();
    for (const { torreId, registros: suyos } of porResidente.values()) {
      totales.set(torreId, (totales.get(torreId) ?? 0) + puntosDelMes(suyos));
    }
    return totales;
  }, [registros]);

  const ranking = useMemo<FilaRanking[]>(() => {
    return torres
      .map((torre) => {
        const resumen = resumenTorre(torre.id);
        return {
          torreId: torre.id,
          nombre: torre.nombre,
          condominio: torre.condominio,
          kg: resumen.kgMes,
          participacion: resumen.participacion,
          ecoPuntos: ecoPuntosPorTorre.get(torre.id) ?? 0,
          esMiTorre: torre.id === usuario?.torreId,
        };
      })
      .sort((a, b) => b.kg - a.kg);
  }, [torres, resumenTorre, ecoPuntosPorTorre, usuario]);

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

  /**
   * Lo que ve el gestor: un lote por torre, no depósitos individuales.
   * Refleja la operación real (se retira el contenedor de una torre) y de paso
   * evita exponerle los nombres de los residentes.
   */
  const lotesPorRetirar = useMemo<LoteRetiro[]>(() => {
    const validados = registros.filter((r) => r.estado === "validado");

    const porTorre = new Map<string, Registro[]>();
    for (const r of validados) {
      const lista = porTorre.get(r.torreId) ?? [];
      lista.push(r);
      porTorre.set(r.torreId, lista);
    }

    return Array.from(porTorre.entries())
      .map(([torreId, lista]) => {
        const torre = torres.find((t) => t.id === torreId) ?? null;

        const acumulado = new Map<Material, number>();
        for (const r of lista) {
          acumulado.set(r.material, (acumulado.get(r.material) ?? 0) + kgEfectivo(r));
        }

        return {
          torreId,
          torreNombre: torre?.nombre ?? lista[0].torreNombre ?? torreId,
          condominio: torre?.condominio ?? "",
          registros: lista,
          kgTotal: sumaKg(lista.map(kgEfectivo)),
          depositos: lista.length,
          porMaterial: Array.from(acumulado.entries())
            .map(([material, kg]) => ({ material, kg: Math.round(kg * 10) / 10 }))
            .sort((a, b) => b.kg - a.kg),
          esperandoDesde: Math.min(...lista.map((r) => r.validadoEn ?? r.creadoEn)),
        };
      })
      .sort((a, b) => a.esperandoDesde - b.esperandoDesde);
  }, [registros, torres]);

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
      return servicioRegistros.confirmarRetiroDeTorre(lote.registros, usuario.id);
    },
    [usuario, lotesPorRetirar]
  );


  const avisos = useMemo(
    () => construirAvisos(usuario, registros, lotesPorRetirar),
    [usuario, registros, lotesPorRetirar]
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
    preparandoDemo,
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
    prepararDemo,
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
