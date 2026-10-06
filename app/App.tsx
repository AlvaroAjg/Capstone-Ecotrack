import "./global.css";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EcoTrackProvider, useEcoTrack, type Rol } from "./src/state/EcoTrack";
import { BarraInferior, PantallaCargando } from "./src/components/ui";
import BannerAvisos from "./src/components/BannerAvisos";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import UnirseAreaScreen from "./src/screens/UnirseAreaScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AdminScreen from "./src/screens/AdminScreen";
import ScanQRScreen from "./src/screens/ScanQRScreen";
import RankingScreen from "./src/screens/RankingScreen";
import RecicladosScreen from "./src/screens/RecicladosScreen";
import DepositoScreen from "./src/screens/DepositoScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import AvisosScreen from "./src/screens/AvisosScreen";

export type Pantalla =
  | "home"
  | "admin"
  | "escanear"
  | "ranking"
  | "reciclados"
  | "deposito"
  | "perfil"
  | "avisos";

export interface ParamsPantalla {
  registroId?: string;
}

export interface Navegacion {
  ir: (pantalla: Pantalla, params?: ParamsPantalla) => void;
  volver: () => void;
  params: ParamsPantalla;
  /** true si esta pantalla es la raíz actual de la pila (no hay a dónde volver). */
  raiz: boolean;
}

interface Ruta {
  pantalla: Pantalla;
  params: ParamsPantalla;
}

/**
 * El validador usa la vista de validación. El administrador también, mientras
 * no exista el panel web.
 */
const INICIO_POR_ROL: Record<Rol, Pantalla> = {
  colaborador: "home",
  validador: "admin",
  administrador: "admin",
};

/**
 * Pantallas del colaborador que viven en la barra inferior. Navegar a una de
 * ellas reemplaza la pila entera en vez de apilar: tocar una pestaña siempre
 * lleva limpio a esa pantalla, sin arrastrar lo que hubiera abierto encima
 * (escanear, un certificado, "Mi cuenta").
 */
const PANTALLAS_TAB: Pantalla[] = ["home", "reciclados", "ranking"];

/**
 * Pila de navegación de la app autenticada.
 * Se monta con `key={usuario.id}` para reiniciarse al cambiar de cuenta.
 */
function PilaApp({ rol }: { rol: Rol }) {
  const [pila, setPila] = useState<Ruta[]>([
    { pantalla: INICIO_POR_ROL[rol], params: {} },
  ]);
  const actual = pila[pila.length - 1];

  const ir = useCallback(
    (pantalla: Pantalla, params: ParamsPantalla = {}) => {
      setPila((prev) => {
        if (rol === "colaborador" && PANTALLAS_TAB.includes(pantalla)) {
          return [{ pantalla, params }];
        }
        return [...prev, { pantalla, params }];
      });
    },
    [rol]
  );

  const volver = useCallback(() => {
    setPila((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const nav: Navegacion = { ir, volver, params: actual.params, raiz: pila.length === 1 };

  let pantalla: React.ReactNode;
  switch (actual.pantalla) {
    case "admin":
      pantalla = <AdminScreen nav={nav} />;
      break;
    case "escanear":
      pantalla = <ScanQRScreen nav={nav} />;
      break;
    case "ranking":
      pantalla = <RankingScreen nav={nav} />;
      break;
    case "reciclados":
      pantalla = <RecicladosScreen nav={nav} />;
      break;
    case "deposito":
      pantalla = <DepositoScreen nav={nav} />;
      break;
    case "perfil":
      pantalla = <PerfilScreen nav={nav} />;
      break;
    case "avisos":
      pantalla = <AvisosScreen nav={nav} />;
      break;
    default:
      pantalla = <HomeScreen nav={nav} />;
  }

  // La barra solo se muestra en las pantallas raíz del colaborador: escanear,
  // el certificado y "Mi cuenta" se abren por encima, cubriéndola.
  const mostrarBarra = rol === "colaborador" && nav.raiz;

  // El banner de avisos va encima de todo, en cualquier pantalla. Tocarlo abre
  // el depósito del aviso, si tiene uno; si no, la lista de avisos.
  const banner = (
    <BannerAvisos
      alAbrir={(aviso) =>
        aviso.registroId
          ? ir("deposito", { registroId: aviso.registroId })
          : actual.pantalla !== "avisos" && ir("avisos")
      }
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{pantalla}</View>
      {mostrarBarra ? <BarraInferior actual={actual.pantalla} alCambiar={ir} /> : null}
      {banner}
    </View>
  );
}

/** Login y registro, para usuarios sin sesión. */
function PilaAuth() {
  const [pantalla, setPantalla] = useState<"login" | "register">("login");

  if (pantalla === "register") {
    return <RegisterScreen alVolver={() => setPantalla("login")} />;
  }
  return <LoginScreen alRegistrarse={() => setPantalla("register")} />;
}

function Raiz() {
  const { cargandoSesion, usuario } = useEcoTrack();

  if (cargandoSesion) {
    return <PantallaCargando mensaje="Conectando con RecyTrack..." />;
  }

  if (!usuario) {
    return <PilaAuth />;
  }

  // Todos operan dentro de una planta. El colaborador y el validador además
  // pertenecen a un área; el administrador, que ve la planta completa, no.
  const sinArea = usuario.rol !== "administrador" && !usuario.areaId;
  if (!usuario.plantaId || sinArea) {
    return <UnirseAreaScreen />;
  }

  return <PilaApp key={usuario.id} rol={usuario.rol} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <EcoTrackProvider>
        <StatusBar style="light" />
        <Raiz />
      </EcoTrackProvider>
    </SafeAreaProvider>
  );
}
