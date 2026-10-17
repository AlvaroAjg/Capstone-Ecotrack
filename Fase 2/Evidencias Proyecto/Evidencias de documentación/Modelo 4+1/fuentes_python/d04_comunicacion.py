from uml import Diagrama, objeto, mensaje

d = Diagrama(1400, 660, "RecyTrack — Vista Lógica: Diagrama de Comunicación",
             "CU-04 Validar un contenedor «Con observación» durante la ronda diaria")
val = d.actor("val", 80, 150, "Validador")
scr = objeto(d, "scr", 330, 120, 230, 60, ":ValidadorScreen")
vc = objeto(d, "vc", 820, 120, 260, 60, ":ValidacionContenedores")
est = objeto(d, "est", 820, 330, 260, 60, ":EstadoRecyTrack")
sr = objeto(d, "sr", 330, 330, 230, 60, ":ServicioRegistros")
fs = objeto(d, "fs", 330, 540, 230, 70, ":CloudFirestore", estereotipo="«reglas de seguridad»")
si = objeto(d, "si", 30, 540, 230, 60, ":ServicioIncidencias")

# Enlaces (todos ortogonales)
d.flecha([(val.r + 6, 150), (scr.x, 150)], tipo="assoc")
d.flecha([(scr.r, 150), (vc.x, 150)], tipo="assoc")
d.flecha([(vc.cx, vc.b), (vc.cx, est.y)], tipo="assoc")
d.flecha([(est.x, 360), (sr.r, 360)], tipo="assoc")
d.flecha([(sr.cx, sr.b), (sr.cx, fs.y)], tipo="assoc")
d.flecha([(sr.x, 375), (si.cx, 375), (si.cx, si.y)], tipo="assoc")
d.flecha([(est.x + 30, est.y), (est.x + 30, 255), (scr.cx, 255), (scr.cx, scr.b)], tipo="assoc")

# Mensajes numerados
mensaje(d, 190, 150, "r", "1: abrirValidaciones()\n2: elegirConObservacion(\n    contenedor, contaminante)", "arriba")
mensaje(d, 673, 150, "r", "1.1: mostrar(pendientes)\n2.1: confirmar()", "arriba")
mensaje(d, vc.cx + 14, 238, "d", "2.2: reportarYValidar(datos, registros)", "der")
mensaje(d, 707, 360, "l", "2.2.1: validarRegistros(\nregistros, uid, lote)", "abajo")
mensaje(d, si.cx + 14, 440, "d", "2.2.1.1: agregarReporte(lote, datos)", "der")
mensaje(d, sr.cx + 14, 448, "d", "2.2.1.2: commit(lote)", "der")
mensaje(d, 660, 255, "l", "3: actualizarPendientes()  [onSnapshot]", "arriba")

d.nota(1110, 120, 270, 80, ["La incidencia no culpa a nadie:",
                             "advierte al administrador antes",
                             "del retiro y se cuenta en el",
                             "reporte mensual."])
d.nota(1110, 470, 270, 128, ["2.2.1.2 se evalúa en el servidor:",
                             "• quien valida es validador o",
                             "  administrador de la planta",
                             "• estado previo = pendiente",
                             "• kgConfirmado = kgDeclarado",
                             "Lote atómico: se escribe todo",
                             "o no se escribe nada."])
d.guardar("/root/diagramas/manual/out/RecyTrack_04_Comunicacion_Validar_Contenedor")
