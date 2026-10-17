from uml import Diagrama, borde_elipse, GRIS

SIS = "#F7FAF8"
OUT = "/root/diagramas/manual/out/"


def frontera(d, x, y, w, h, titulo="Sistema RecyTrack"):
    d.rect(x, y, w, h, SIS, rx=6, capa=0, sw=1.6)
    d.texto(x + w / 2, y + 22, titulo, 13.5, bold=True, capa=2)


def asoc(d, actor, caso):
    d.flecha([(actor.r + 4, actor.cy), borde_elipse(caso, "l")], tipo="assoc")


def ext(d, desde, hacia_caso, pts, etiqueta="«extend»", en=None, cond=None):
    d.flecha(pts, tipo="dep", etiqueta=etiqueta + (("\n" + cond) if cond else ""), en=en, etq_size=10.5)


# =====================================================================  01a General
d = Diagrama(1100, 690, "RecyTrack — Vista de Escenarios (+1)", "Diagrama de casos de uso general")
frontera(d, 330, 80, 470, 590)
cx, w = 565, 390
cu = {}
for k, (y, t) in {
        "1": (135, "CU-01 Acceder al sistema"),
        "2": (215, "CU-02 Registrar depósito en el punto limpio"),
        "3": (285, "CU-03 Consultar avance, ranking\ny certificado mensual"),
        "4": (375, "CU-04 Realizar la ronda diaria de validación"),
        "5": (465, "CU-05 Administrar la planta\n(contenedores, áreas, personas, incentivo)"),
        "6": (545, "CU-06 Registrar retiro y certificar depósitos"),
        "7": (620, "CU-07 Generar reporte mensual de la planta")}.items():
    cu[k] = d.caso("cu" + k, cx, y, t, w=w, h=50)
usu = d.actor("usu", 90, 135, "Usuario\nautenticado")
colab = d.actor("colab", 225, 250, "Colaborador")
valid = d.actor("valid", 225, 375, "Validador")
admin = d.actor("admin", 225, 545, "Administrador\nde planta")
prov = d.actor("prov", 980, 135, "Proveedor de identidad\n(Google / Microsoft)")
# generalización en árbol
for a in (colab, valid, admin):
    d.flecha([(a.x - 4, a.cy), (90, a.cy)], tipo="assoc")
d.flecha([(90, admin.cy), (90, colab.cy)], tipo="assoc")
d.flecha([(90, colab.cy), (90, usu.b + 34)], tipo="gen")
asoc(d, usu, cu["1"])
asoc(d, colab, cu["2"]); asoc(d, colab, cu["3"])
asoc(d, valid, cu["4"])
asoc(d, admin, cu["5"]); asoc(d, admin, cu["6"]); asoc(d, admin, cu["7"])
d.flecha([borde_elipse(cu["1"], "r"), (prov.x - 4, prov.cy)], tipo="assoc")
d.guardar(OUT + "RecyTrack_01a_Casos_de_Uso_General")

# =====================================================================  01b Colaborador
R = {i: 135 + (i - 1) * 62 for i in range(1, 10)}
d = Diagrama(1270, 700, "RecyTrack — Casos de uso del Colaborador", "CU-01 Acceder · CU-02 Registrar depósito · CU-03 Consultar avance")
frontera(d, 240, 80, 860, 595)
c1, c2, c3 = 400, 730, 975
w1, w2, w3 = 250, 230, 190
A = {}
for i, t in enumerate(["Registrar cuenta", "Iniciar sesión", "Unirse a su área\ncon el código del área",
                       "Registrar depósito", "Consultar historial\nde reciclados", "Consultar ranking de áreas",
                       "Consultar misión semanal,\nEcoPuntos e incentivo", "Consultar avisos", "Gestionar Mi cuenta"], 1):
    A[i] = d.caso(f"a{i}", c1, R[i], t, w=w1)
ext_login = d.caso("b2", c2, R[2], "Iniciar sesión con\ncuenta externa", w=w2)
declarar = d.caso("b3", c2, R[3], "Declarar material\ny talla de bolsa (S–XL)", w=w2)
escanear = d.caso("b4", c2, R[4], "Escanear el QR\ndel contenedor", w=w2)
descargar = d.caso("b5", c2, R[5], "Descargar certificado\nmensual (PDF)", w=w2)
codigo = d.caso("c4", c3, R[4], "Escribir el código\nimpreso bajo el QR", w=w3)
col = d.actor("col", 110, R[5], "Colaborador", alinear="end")
prov = d.actor("prov", 1185, R[2], "Proveedor de\nidentidad")
for i in A:
    asoc(d, col, A[i])
gap = (c1 + w1 / 2 + c2 - w2 / 2) / 2
d.flecha([borde_elipse(ext_login, "l"), borde_elipse(A[2], "r")], tipo="dep", etiqueta="«extend»", en=(gap, R[2] - 8), etq_size=10.5)
d.flecha([borde_elipse(A[4], "r", -10), (gap, R[4] - 10), (gap, R[3]), borde_elipse(declarar, "l")], tipo="dep",
         etiqueta="«include»", en=(gap + 2, R[3] + 26), etq_size=10.5)
d.flecha([borde_elipse(A[4], "r", 6), borde_elipse(escanear, "l", 6)], tipo="dep", etiqueta="«include»", en=(gap, R[4] + 22), etq_size=10.5)
d.flecha([borde_elipse(codigo, "l"), borde_elipse(escanear, "r")], tipo="dep", etiqueta="«extend»\n[la cámara\nno lee el QR]",
         en=((c2 + w2 / 2 + c3 - w3 / 2) / 2, R[4] + 26), etq_size=10.5)
d.flecha([borde_elipse(descargar, "l"), borde_elipse(A[5], "r")], tipo="dep", etiqueta="«extend»\n[mes con depósitos\ncertificados]",
         en=(gap, R[5] + 26), etq_size=10.5)
d.flecha([borde_elipse(ext_login, "r"), (prov.x - 4, prov.cy)], tipo="assoc")
d.nota(640, R[7] - 30, 400, 66, ["Precondición de Registrar depósito: el colaborador",
                                 "pertenece a un área. Los kilos no se escriben:",
                                 "se estiman con la talla de bolsa."])
d.guardar(OUT + "RecyTrack_01b_Casos_de_Uso_Colaborador")

# =====================================================================  01c Validador
d = Diagrama(1180, 560, "RecyTrack — Casos de uso del Validador", "CU-04 Realizar la ronda diaria de validación")
frontera(d, 220, 80, 900, 450)
c1, c2, c3 = 385, 790, 1030
w1, w2, w3 = 260, 230, 170
ini = d.caso("ini", c1, 140, "Iniciar sesión", w=w1)
rev = d.caso("rev", c1, 280, "Revisar validaciones\npendientes por contenedor", w=w1, h=54)
avi = d.caso("avi", c1, 420, "Consultar avisos", w=w1)
conf = d.caso("conf", c2, 190, "Validar contenedor\n(Conforme)", w=w2)
obs = d.caso("obs", c2, 280, "Validar con observación\n(Con observación)", w=w2)
rech = d.caso("rech", c2, 370, "Rechazar depósitos\n(Sin material)", w=w2)
rep = d.caso("rep", c3, 280, "Reportar\ncontaminación", w=w3)
val = d.actor("val", 130, 280, "Validador\n(titular o suplente)", alinear="end")
for c in (ini, rev, avi):
    asoc(d, val, c)
xb = 575
d.flecha([borde_elipse(conf, "l"), (xb, conf.cy), (xb, 266), borde_elipse(rev, "r", -14)], tipo="dep")
d.flecha([borde_elipse(obs, "l"), borde_elipse(rev, "r")], tipo="dep")
d.flecha([borde_elipse(rech, "l"), (xb, rech.cy), (xb, 294), borde_elipse(rev, "r", 14)], tipo="dep")
for yy in (conf.cy, obs.cy, rech.cy):
    d.etiqueta((xb + c2 - w2 / 2) / 2 + 4, yy - 7, "«extend»", size=10.5)
d.flecha([borde_elipse(obs, "r"), borde_elipse(rep, "l")], tipo="dep", etiqueta="«include»", en=((c2 + w2 / 2 + c3 - w3 / 2) / 2, 272), etq_size=10.5)
d.nota(660, 425, 430, 70, ["Una vez al día. Se valida la tanda completa del",
                           "contenedor (no bolsa por bolsa) en una sola",
                           "escritura atómica."])
d.guardar(OUT + "RecyTrack_01c_Casos_de_Uso_Validador")

# =====================================================================  01d Administrador
R = {i: 135 + (i - 1) * 62 for i in range(1, 11)}
d = Diagrama(1180, 800, "RecyTrack — Casos de uso del Administrador de planta",
             "CU-05 Administrar la planta · CU-06 Registrar retiro · CU-07 Reporte mensual")
frontera(d, 230, 80, 890, 690, "Panel web del administrador (RecyTrack)")
c1, c2, c3 = 400, 760, 1000
w1, w2 = 290, 230
B = {}
for i, t in enumerate(["Promoverse a administrador\ncon el código de la planta", "Consultar resumen del mes",
                       "Gestionar contenedores\npor punto limpio", "Gestionar áreas\n(código y dotación)",
                       "Cambiar persona de área", "Nombrar validador y suplente",
                       "Definir incentivo\n(meta de participación)", "Consultar rondas del mes",
                       "Registrar retiro", "Descargar reporte mensual (PDF)"], 1):
    B[i] = d.caso(f"b{i}", c1, R[i], t, w=w1)
imp = d.caso("imp", c2, R[3], "Imprimir QR\ndel contenedor", w=w2)
cod = d.caso("cod", c2, R[4], "Cambiar código\ndel contenedor", w=w2)
inc = d.caso("inc", c2, R[8], "Revisar incidencias\nde contaminación", w=w2)
cer = d.caso("cer", c2, R[9], "Certificar depósitos\nvalidados", w=w2)
adm = d.actor("adm", 110, (R[1] + R[10]) / 2, "Administrador\nde planta", alinear="end")
for i in B:
    asoc(d, adm, B[i])
gx = (c1 + w1 / 2 + c2 - w2 / 2) / 2
d.flecha([borde_elipse(imp, "l"), borde_elipse(B[3], "r", -6)], tipo="dep", etiqueta="«extend»", en=(gx, R[3] - 12), etq_size=10.5)
d.flecha([borde_elipse(cod, "l"), (gx, cod.cy), (gx, R[3] + 12), borde_elipse(B[3], "r", 12)], tipo="dep")
d.etiqueta(gx + 6, R[4] + 38, "«extend» [el código se filtró]", size=10.5, anchor="start")
d.flecha([borde_elipse(B[9], "r", -10), (gx, R[9] - 10), (gx, R[8]), borde_elipse(inc, "l")], tipo="dep",
         etiqueta="«include»", en=(gx + 4, R[8] + 26), etq_size=10.5, anchor="start")
d.flecha([borde_elipse(B[9], "r", 6), borde_elipse(cer, "l", 6)], tipo="dep", etiqueta="«include»", en=(gx, R[9] + 24), etq_size=10.5)
d.nota(900, R[8] + 30, 205, 110, ["Quien retira el material", "no usa la app. Se registra:",
                                  "fecha, quién retira, N° de", "guía, contenedores y peso", "opcional."])
d.guardar(OUT + "RecyTrack_01d_Casos_de_Uso_Administrador")
