import "./global.css";
import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EcoTrackProvider } from "./src/state/EcoTrack";
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
  | "login"
  | "register"
  | "joinTorre"
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

function AppNavegable() {
  const [pila, setPila] = useState<Ruta[]>([{ pantalla: "login", params: {} }]);
  const actual = pila[pila.length - 1];

  const ir = useCallback((pantalla: Pantalla, params: ParamsPantalla = {}) => {
    setPila((prev) =>

      pantalla === "login" ? [{ pantalla, params }] : [...prev, { pantalla, params }]
    );
  }, []);

  const volver = useCallback(() => {
    setPila((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const nav: Navegacion = { ir, volver, params: actual.params };

  switch (actual.pantalla) {
    case "login":
      return <LoginScreen nav={nav} />;
    case "register":
      return <RegisterScreen nav={nav} />;
    case "joinTorre":
      return <JoinTorreScreen nav={nav} />;
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

export default function App() {
  return (
    <SafeAreaProvider>
      <EcoTrackProvider>
        <StatusBar style="light" />
        <AppNavegable />
      </EcoTrackProvider>
    </SafeAreaProvider>
  );
}
