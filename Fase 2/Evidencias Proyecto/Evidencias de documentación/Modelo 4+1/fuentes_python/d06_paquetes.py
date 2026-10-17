from uml import Diagrama, AMARILLO

LILA = "#E1D5E7"
PRES = "#D5E8D4"
NEG = "#FFDDB8"
DATOS = "#DAE8FC"
TRANS = "#B7CDEC"
HOJA = "#C5E5B4"

d = Diagrama(1440, 1090, "RecyTrack — Vista de Desarrollo: Diagrama de Paquetes",
             "Arquitectura en capas del repositorio Capstone-Ecotrack")

d.paquete("app", 20, 70, 1400, 1000, "RecyTrack — aplicación en capas", fill=AMARILLO, tab=220, capa=0)

# Fila superior
d.paquete("usuarios", 50, 150, 170, 110, "Usuarios", fill=LILA,
          lineas=["Colaborador", "Validador", "Administrador"])
pres = d.paquete("pres", 280, 120, 600, 165, "Capa de presentación", fill=PRES)
for i, (t, l) in enumerate([
        ("App.tsx", ["navegación", "por rol"]),
        ("screens", ["pantallas del", "colaborador y", "del validador"]),
        ("screens/panel", ["panel web del", "administrador"]),
        ("components", ["escáner QR, avisos", "y UI reutilizable"])]):
    d.paquete(f"p{i}", 300 + i * 143, 168, 128, 100, t, fill=HOJA, lineas=l, titulo_size=12,
              contenido_size=10.5, capa=2, tab=48)
d.paquete("plataforma", 960, 140, 210, 115, "Plataforma UI", fill=LILA, estereotipo="«library»",
          lineas=["expo · react-native", "react-native-web", "nativewind · jsqr"], contenido_size=11)

# Capa de negocio
d.paquete("neg", 280, 360, 890, 300, "Capa de negocio (lógica en el cliente)", fill=NEG, tab=200)
fach = d.paquete("fachada", 620, 412, 210, 92, "Fachada de la aplicación", fill=HOJA, titulo_size=12,
                 lineas=["state/EcoTrack.tsx", "useEcoTrack()"], contenido_size=11, capa=2)
reglas = d.paquete("reglas", 320, 545, 230, 95, "Reglas de negocio", fill=HOJA, titulo_size=12, capa=2,
                   lineas=["lib/ derivados · rondas · retiros", "incentivo · misiones · avisos"],
                   contenido_size=10.5)
d.paquete("docs", 610, 545, 230, 95, "Documentos PDF", fill=HOJA, titulo_size=12, capa=2,
          lineas=["lib/ certificadoMensual · reporte", "certificadoPdf · reportePdf"], contenido_size=10.5)
d.paquete("qr", 900, 545, 230, 95, "Códigos QR", fill=HOJA, titulo_size=12, capa=2,
          lineas=["lib/qr (lectura del QR)", "lib/etiquetaQr (impresión)"], contenido_size=10.5)

# Capa de datos
d.paquete("datos", 280, 710, 890, 195, "Capa de datos", fill=DATOS)
acc = d.paquete("acceso", 330, 765, 420, 115, "Acceso a datos", fill=HOJA, titulo_size=12, capa=2,
                lineas=["services/ registros · retiros · contenedores",
                        "áreas · personas · incidencias",
                        "campañas · resúmenes · plantas"], contenido_size=10.5)
age = d.paquete("agentes", 820, 765, 300, 115, "Agentes de servicio", fill=HOJA, titulo_size=12, capa=2,
                lineas=["services/auth.ts", "lib/firebase.ts (inicia el SDK)"], contenido_size=10.5)

# Recursos externos bajo la capa de datos
d.paquete("fuentes", 390, 950, 300, 90, "Fuentes de datos", fill=HOJA, titulo_size=12,
          lineas=["Cloud Firestore (11 colecciones)"], contenido_size=10.5)
d.paquete("externos", 820, 950, 300, 90, "Servicios externos", fill=HOJA, titulo_size=12,
          lineas=["Firebase Auth · Google · Microsoft"], contenido_size=10.5)

# Transversal
d.paquete("trans", 1225, 340, 170, 690, "Transversal", fill=TRANS, tab=90)
for i, (t, l) in enumerate([
        ("Seguridad", ["firestore.rules", "(se evalúa en", "el servidor)"]),
        ("Modelo de dominio", ["lib/tipos.ts", "KG_POR_TALLA"]),
        ("Utilidades", ["lib/formato", "lib/dialogos"]),
        ("Pruebas", ["app/pruebas", "pruebas-reglas"]),
        ("Despliegue", ["scripts/publicar", "hosting/"])]):
    d.paquete(f"t{i}", 1240, 395 + i * 125, 140, 105, t, fill=HOJA, lineas=l, titulo_size=12,
              contenido_size=10.5, capa=2, tab=48)

# ---------------- Dependencias (todas ortogonales)
d.flecha([(220, 205), (280, 205)])                                   # usuarios -> presentación
d.flecha([(880, 197), (960, 197)])                                   # presentación -> plataforma UI
d.flecha([(580, 285), (580, 360)])                                   # presentación -> negocio
d.flecha([(725, 660), (725, 710)])                                   # negocio -> datos
d.flecha([(fach.x, fach.cy), (reglas.cx, fach.cy), (reglas.cx, reglas.y)])   # fachada -> reglas
d.flecha([(acc.cx, acc.b), (acc.cx, 950)])                          # acceso -> fuentes
d.flecha([(age.cx, age.b), (age.cx, 950)])                          # agentes -> externos
d.flecha([(880, 268), (1200, 268), (1200, 380), (1225, 380)])        # presentación -> transversal
d.flecha([(1170, 510), (1225, 510)])                                 # negocio -> transversal
d.flecha([(1170, 808), (1225, 808)])                                 # datos -> transversal
d.flecha([(280, 262), (250, 262), (250, 790), (280, 790)],           # acceso directo
         etiqueta="«import» directo\n(login, registro,\nescaneo, panel)", en=(236, 520), anchor="end")



d.guardar("/root/diagramas/manual/out/RecyTrack_06_Diagrama_de_Paquetes")
