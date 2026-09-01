import "./global.css";
import React, { useState } from "react";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import JoinTorreScreen from "./src/screens/JoinTorreScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AdminScreen from "./src/screens/AdminScreen";
import ScanQRScreen from "./src/screens/ScanQRScreen";
import GestorScreen from "./src/screens/GestorScreen";
import RankingScreen from "./src/screens/RankingScreen";

export type Pantalla =
  | "login"
  | "register"
  | "joinTorre"
  | "home"
  | "admin"
  | "escanear"
  | "gestor"
  | "ranking";

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>("login");
  const [nombre, setNombre] = useState("");
  const [torre, setTorre] = useState("");

  if (pantalla === "login") return <LoginScreen ir={setPantalla} />;
  if (pantalla === "register")
    return <RegisterScreen ir={setPantalla} setNombre={setNombre} />;
  if (pantalla === "joinTorre")
    return <JoinTorreScreen ir={setPantalla} setTorre={setTorre} />;
  if (pantalla === "admin") return <AdminScreen ir={setPantalla} />;
  if (pantalla === "escanear") return <ScanQRScreen ir={setPantalla} />;
  if (pantalla === "gestor") return <GestorScreen ir={setPantalla} />;
  if (pantalla === "ranking") return <RankingScreen ir={setPantalla} />;
  return <HomeScreen ir={setPantalla} nombre={nombre} torre={torre} />;
}