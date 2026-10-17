from uml import Diagrama, Caja, GRIS, VERDE

DEV = "#EEF5F0"
NUBE = "#F5F9FD"
EXT = "#EDE4F1"
d = Diagrama(1810, 1010, "RecyTrack — Vista Física: Diagrama de Despliegue",
             "Dispositivos de la planta, red y nodos de Firebase en Google Cloud")


def dispositivo(nombre, x, y, w, h, titulo, entorno, artefacto, art_lineas=None):
    dev = d.nodo(nombre, x, y, w, h, titulo, "«device»", fill=DEV)
    env = d.nodo(nombre + "_env", x + 18, y + 64, w - 46, h - 80, entorno, "«executionEnvironment»",
                 fill="#FFFFFF", d=8, capa=2)
    d.artefacto(nombre + "_art", x + 40, y + h - 76, w - 90, 52, artefacto, art_lineas, capa=4)
    return dev


# Columna 1: punto limpio e impresora
pl = d.nodo("pl", 40, 100, 240, 340, "Punto limpio", "«device»", fill=DEV,
            lineas=["planta de Viñedos", "Familia Chadwick"])
d.artefacto("qr", 60, 230, 200, 70, "Etiqueta QR", ["ECOTRACK:{planta}:{código}"])
d.artefacto("cont", 60, 320, 200, 90, "Contenedores", ["papel/cartón · plástico", "vidrio · metal · mixto"])
imp = d.nodo("imp", 40, 560, 240, 120, "Impresora", "«device»", fill=DEV, lineas=["etiquetas QR"])

# Columna 2: dispositivos de los usuarios
col = dispositivo("col", 400, 90, 290, 205, "Celular del colaborador", "Navegador móvil", "RecyTrack PWA",
                  ["vista Colaborador"])
val = dispositivo("val", 400, 315, 290, 205, "Celular del validador", "Navegador móvil", "RecyTrack PWA",
                  ["vista Validador"])
pc = dispositivo("pc", 400, 540, 290, 205, "Computador del administrador", "Navegador de escritorio",
                 "RecyTrack web", ["Panel del administrador"])

# Columna 3: red
net = d.nodo("net", 785, 90, 130, 655, "Internet", "«network»", fill="#FFFFFF", lineas=["HTTPS / TLS"])

# Columna 4: Google Cloud
d.rect(1040, 80, 440, 690, NUBE, rx=18, dash="7,5", capa=0, sw=1.6)
d.texto(1260, 104, "«cloud» Google Cloud", 11, italic=True, color=GRIS, capa=2)
d.texto(1260, 122, "Proyecto Firebase ecotrack-capstone-3f12d (plan Spark)", 12.5, bold=True, capa=2)
host = d.nodo("host", 1070, 140, 380, 175, "Firebase Hosting (CDN)", "«executionEnvironment»", fill=VERDE)
d.artefacto("bundle", 1095, 225, 330, 66, "App web exportada", ["index.html · bundle JS · manifest · íconos"])
auth = d.nodo("auth", 1070, 345, 380, 130, "Firebase Authentication", "«executionEnvironment»", fill=VERDE,
              lineas=["correo/contraseña · Google · Microsoft"])
fsn = d.nodo("fs", 1070, 505, 380, 245, "Cloud Firestore", "«executionEnvironment»", fill=VERDE,
             lineas=["southamerica-east1"])
d.artefacto("rules", 1095, 610, 150, 60, "firestore.rules")
d.cilindro("db", 1270, 600, 155, 120, "Base documental", ["11 colecciones"], fill="#FFFFFF")

# Columna 5: proveedores de identidad
g = d.nodo("g", 1560, 340, 210, 70, "Google Identity", "«external»", fill=EXT, d=8)
m = d.nodo("m", 1560, 425, 210, 70, "Microsoft Entra ID", "«external»", fill=EXT, d=8)

# Desarrollo
dev = d.nodo("dev", 1070, 830, 380, 150, "Computador de desarrollo", "«device»", fill=DEV)
d.artefacto("repo", 1090, 905, 160, 56, "Repositorio", ["Capstone-Ecotrack"])
d.artefacto("cli", 1270, 905, 160, 56, "Firebase CLI", ["+ emulador"])

# ---------------- Rutas de comunicación (ortogonales)
d.flecha([(col.x, col.cy), (pl.r, col.cy)], tipo="assoc", etiqueta="«cámara»\nlee el QR", en=(343, col.cy - 18))
d.flecha([(val.x, val.cy), (pl.r, val.cy)], tipo="assoc", etiqueta="«inspección»\nronda diaria", en=(343, val.cy - 18))
d.flecha([(imp.r, imp.cy + 30), (pc.x, imp.cy + 30)], tipo="assoc", etiqueta="«USB / red»", en=(343, imp.cy + 22))
d.flecha([(imp.cx, imp.y), (imp.cx, pl.b)], tipo="dep", etiqueta="«imprime»", en=(imp.cx + 8, 505), anchor="start")
for dv in (col, val, pc):
    d.flecha([(dv.r, dv.cy), (net.x, dv.cy)], tipo="assoc", etiqueta="«HTTPS»", en=((dv.r + net.x) / 2, dv.cy - 8))
d.flecha([(net.r, host.cy), (host.x, host.cy)], tipo="assoc", etiqueta="«HTTPS»\ndescarga la PWA", en=(965, host.cy - 22))
d.flecha([(net.r, auth.cy), (auth.x, auth.cy)], tipo="assoc", etiqueta="«HTTPS»\ntoken de sesión", en=(965, auth.cy - 22))
d.flecha([(net.r, fsn.cy), (fsn.x, fsn.cy)], tipo="assoc", etiqueta="«WebChannel»\ntiempo real", en=(965, fsn.cy - 22))
d.flecha([(auth.r, g.cy), (g.x, g.cy)], tipo="assoc", etiqueta="«OAuth 2.0»", en=(1505, g.cy - 8))
d.flecha([(auth.r, m.cy), (m.x, m.cy)], tipo="assoc", etiqueta="«OAuth 2.0»", en=(1505, m.cy - 8))
d.flecha([(dev.cx, dev.y - 12), (dev.cx, 770)], tipo="dep", etiqueta="«deploy» firebase deploy\n(hosting · firestore:rules)",
         en=(dev.cx + 12, 795), anchor="start")

d.nota(40, 800, 640, 88, ["Sin servidores propios ni Cloud Functions: costo de infraestructura cero.",
                           "Cada lectura y escritura del navegador se evalúa contra firestore.rules",
                           "en el servidor antes de tocar la base de datos.",
                           "La PWA se instala desde el navegador (Añadir a pantalla de inicio)."])
d.guardar("/root/diagramas/manual/out/RecyTrack_08_Diagrama_de_Despliegue")
