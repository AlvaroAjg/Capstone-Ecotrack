from uml import Diagrama, VERDE, GRIS

SUB = "#F4F8F5"
FB = "#FDF1E3"
EXT = "#EDE4F1"
d = Diagrama(1800, 1010, "RecyTrack — Vista de Desarrollo: Diagrama de Componentes (UML 2.5)",
             "Componentes, interfaces provistas (○) y requeridas (◡), puertos (□) y conectores de ensamblaje")

# ---------------- Subsistema App
d.componente("app", 30, 80, 1150, 900, "App RecyTrack", ["PWA · Expo + React Native"], fill=SUB,
             estereotipo="«subsystem»", contenedor=True, capa=0)

# Presentación (componente contenedor con componentes anidados)
pres = d.componente("pres", 60, 150, 1090, 190, "Presentación", fill="#E9F3EC", contenedor=True, capa=1)
col = d.componente("col", 90, 215, 250, 105, "VistaColaborador",
                   ["Login · Registro · Unirse a área", "Inicio · Escanear QR · Depósito", "Reciclados · Ranking · Perfil"], capa=2)
val = d.componente("val", 370, 215, 220, 105, "VistaValidador", ["ValidadorScreen", "ValidacionContenedores"], capa=2)
adm = d.componente("adm", 620, 215, 250, 105, "PanelAdministrador",
                   ["Resumen · Contenedores · Personas", "Rondas · Incentivo · Retiros"], capa=2)
ui = d.componente("ui", 900, 215, 230, 105, "ComponentesUI", ["EscanerQR (jsQR) · CodigoQR", "BannerAvisos · ReporteMensual"], capa=2)

# Fila de lógica
pdf = d.componente("pdf", 90, 440, 240, 100, "GeneradorPDF", ["certificado y reporte", "(pdf-lib)"])
lp = d.componente("lp", 470, 440, 260, 100, "LogicaPura", ["derivados · rondas · retiros", "incentivo · misiones · avisos"])
est = d.componente("est", 870, 440, 260, 100, "EstadoRecyTrack", ["state/EcoTrack.tsx", "useEcoTrack()"])

# Fila de datos
mod = d.componente("mod", 470, 640, 260, 100, "ModeloDominio", ["lib/tipos.ts · KG_POR_TALLA"], estereotipo="«library»")
svc = d.componente("svc", 870, 610, 260, 240, "ServiciosDatos",
                   ["auth · areas · personas", "contenedores · registros", "retiros · incidencias",
                    "campanas · resumenes · plantas"])

# ---------------- Subsistema Firebase
d.componente("fb", 1260, 540, 300, 440, "Firebase", ["plan Spark · Google Cloud"], fill=FB,
             estereotipo="«subsystem»", contenedor=True, capa=0)
auth = d.componente("auth", 1290, 600, 240, 120, "Authentication", [])
fs = d.componente("fs", 1290, 745, 240, 220, "Cloud Firestore", [], contenedor=True, capa=1)
rules = d.componente("rules", 1325, 805, 185, 70, "ReglasSeguridad", ["firestore.rules"], capa=2, size=12)
db = d.cilindro("db", 1348, 892, 140, 64, "11 colecciones")

# Proveedores externos
g = d.componente("g", 1610, 570, 170, 70, "Google Identity", [], estereotipo="«external»", fill=EXT, size=12)
m = d.componente("m", 1610, 665, 170, 70, "Microsoft Entra ID", [], estereotipo="«external»", fill=EXT, size=12)

# ---------------- Dependencias internas de Presentación hacia ComponentesUI (bus superior)
bus_y = 202
for c in (col, val):
    d.flecha([(c.cx, c.y), (c.cx, bus_y)], tipo="dep0")
d.flecha([(col.cx, bus_y), (ui.cx, bus_y), (ui.cx, ui.y)], tipo="dep", etiqueta="«use»", en=(745, bus_y - 4))
d.flecha([(adm.cx, adm.y), (adm.cx, bus_y)], tipo="dep0")


def ensamblar(p_cons, p_prov, x, y, hacia, etiqueta, lado="t"):
    """Puerto consumidor -> enchufe | bola -> puerto proveedor."""
    s, b = d.ensamblaje(x, y, hacia, etiqueta, lado)
    d.flecha([p_cons, s], tipo="assoc")
    d.flecha([b, p_prov], tipo="assoc")
    d.puerto(*p_cons)
    d.puerto(*p_prov)


# Presentación requiere IEstado (provista por EstadoRecyTrack) e IDocumentosPDF (GeneradorPDF)
ensamblar((est.cx, pres.b), (est.cx, est.y), est.cx, 390, "b", "IEstado", "r")
ensamblar((pdf.cx, pres.b), (pdf.cx, pdf.y), pdf.cx, 390, "b", "IDocumentosPDF", "r")
# EstadoRecyTrack requiere IReglasNegocio (LogicaPura) e IRepositorio (ServiciosDatos)
ensamblar((est.x, est.cy), (lp.r, lp.cy), 800, est.cy, "l", "IReglasNegocio", "t")
ensamblar((est.cx, est.b), (est.cx, svc.y), est.cx, 580, "b", "IRepositorio", "r")
# ServiciosDatos requiere IAutenticacion e IAccesoDatos de Firebase
ensamblar((svc.r, auth.cy), (auth.x, auth.cy), 1215, auth.cy, "r", "IAutenticacion", "t")
ensamblar((svc.r, rules.cy), (fs.x, rules.cy), 1215, rules.cy, "r", "IAccesoDatos", "b")

# Delegación dentro de Cloud Firestore: todo acceso pasa por las reglas
d.flecha([(fs.x, rules.cy), (rules.x, rules.cy)], tipo="nav")
d.etiqueta(fs.x + 4, rules.y - 6, "«delegate»", size=10.5, anchor="start")
d.flecha([(rules.cx, rules.b), (rules.cx, db.y)], tipo="dep", etiqueta="«protege»", en=(rules.cx + 8, 890), anchor="start")

# Dependencias hacia ModeloDominio (sin cruces)
d.flecha([(lp.cx, lp.b), (lp.cx, mod.y)], tipo="dep", etiqueta="«use»", en=(lp.cx + 8, 595), anchor="start")
d.flecha([(svc.x, mod.cy), (mod.r, mod.cy)], tipo="dep", etiqueta="«use»")
d.flecha([(pdf.cx, pdf.b), (pdf.cx, mod.cy), (mod.x, mod.cy)], tipo="dep", etiqueta="«use»", en=(330, mod.cy - 6))

# OAuth hacia proveedores externos
d.flecha([(auth.r, 620), (g.x, 620)], tipo="dep")
d.flecha([(auth.r, 700), (m.x, 700)], tipo="dep")
d.etiqueta(1570, 664, "«OAuth 2.0»", size=10.5)



d.guardar("/root/diagramas/manual/out/RecyTrack_05_Diagrama_de_Componentes")
