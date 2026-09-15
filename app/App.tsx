import "./global.css";
import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EcoTrackProvider, useEcoTrack, type Rol } from "./src/state/EcoTrack";
import { PantallaCargando } from "./src/components/ui";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import JoinTorreScreen from "./src/screens/JoinTorreScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AdminScreen from "./src/screens/AdminScreen";
import ScanQRScreen from "./src/screens/ScanQRScreen";
import GestorScreen from "./src/screens/GestorScreen";
import RankingScreen from "./src/screens/RankingScreen";
import CertificadoScreen from "./src/screens/CertificadoScreen";

export type Pantalla =
  | "home"
  | "admin"
  | "escanear"
  | "gestor"
  | "ranking"
  | "certificado";

export interface ParamsPantalla {
  registroId?: string;
}

export interface Navegacion {
  ir: (pantalla: Pantalla, params?: ParamsPantalla) => void;
  volver: () => void;
  params: ParamsPantalla;
}

interface Ruta {
  pantalla: Pantalla;
  params: ParamsPantalla;
}

const INICIO_POR_ROL: Record<Rol, Pantalla> = {
  residente: "home",
  administrador: "admin",
  gestor: "gestor",
};

/**
 * Pila de navegación de la app autenticada.
 * Se monta con `key={usuario.id}` para reiniciarse al cambiar de cuenta.
 */
function PilaApp({ rol }: { rol: Rol }) {
  const [pila, setPila] = useState<Ruta[]>([
    { pantalla: INICIO_POR_ROL[rol], params: {} },
  ]);
  const actual = pila[pila.length - 1];

  const ir = useCallback((pantalla: Pantalla, params: ParamsPantalla = {}) => {
    setPila((prev) => [...prev, { pantalla, params }]);
  }, []);

  const volver = useCallback(() => {
    setPila((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const nav: Navegacion = { ir, volver, params: actual.params };

  switch (actual.pantalla) {
    case "admin":
      return <AdminScreen nav={nav} />;
    case "escanear":
      return <ScanQRScreen nav={nav} />;
    case "gestor":
      return <GestorScreen nav={nav} />;
    case "ranking":
      return <RankingScreen nav={nav} />;
    case "certificado":
      return <CertificadoScreen nav={nav} />;
    default:
      return <HomeScreen nav={nav} />;
  }
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
  const { cargandoSesion, preparandoDemo, usuario } = useEcoTrack();

  // Al preparar la demo la sesión cambia varias veces seguidas; se mantiene la
  // pantalla de login montada para no perder el progreso que muestra.
  if (cargandoSesion && !preparandoDemo) {
    return <PantallaCargando mensaje="Conectando con EcoTrack..." />;
  }

  if (!usuario || preparandoDemo) {
    return <PilaAuth />;
  }

  // Un residente o administrador debe pertenecer a una torre antes de operar.
  // El gestor es externo al condominio, así que no requiere vinculación.
  if (usuario.rol !== "gestor" && !usuario.torreId) {
    return <JoinTorreScreen />;
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
