from uml import Diagrama

AM, AMH = "#FFF9E8", "#F6E7B8"
d = Diagrama(1470, 1400, "RecyTrack — Vista Lógica: Diagrama de Clases del dominio",
             "Entidades persistidas en Cloud Firestore (verde) y agregados u objetos calculados (amarillo)")

X1, X2, X3, X4 = 40, 420, 770, 1160
cod = d.clase("cod", X2, 80, 250, "CodigoRol", ["- plantaId : String", "- administrador : String"], estereotipo="«confidencial»")
camp = d.clase("camp", X1, 230, 290, "Campana", ["- nombre : String", "- metaParticipacion : Integer {1..100}",
                                                 "- incentivo : String", "- terminaEn : Long", "- actualizadaEn : Long"])
pla = d.clase("pla", X2, 230, 250, "Planta", ["- id : String", "- nombre : String", "- empresa : String"])
res = d.clase("res", X3, 230, 250, "ResumenMes", ["- mes : String {AAAA-MM}", "- ultimoRegistro : String"],
              estereotipo="«agregado»", fill=AM, cabecera=AMH)
con_a = d.clase("con_a", X4, 230, 260, "ConteoArea", ["- depositos : Integer", "- participantes : Integer"],
                estereotipo="«datatype»", fill=AM, cabecera=AMH)

area = d.clase("area", X2, 440, 250, "Area", ["- id : String", "- nombre : String", "- codigo : String", "- dotacion : Integer"])
usu = d.clase("usu", X3, 430, 330, "Usuario", ["- id : String {uid de Firebase Auth}", "- nombre : String", "- email : String",
                                               "- rol : Rol", "- avisosVistosHasta : Long"],
              ["+ unirseAArea(area : Area)", "+ promoverAAdministrador(codigo : String)"])
part = d.clase("part", X4 + 20, 420, 240, "Participacion", ["- mes : String"], estereotipo="«agregado»", fill=AM, cabecera=AMH)
cert = d.clase("cert", X4 + 20, 530, 280, "CertificadoMensual", ["- mes : String", "- codigo : String", "- kgTotal : Double",
                                                            "- kgPorMaterial : Map<Material, Double>"],
               estereotipo="«calculado»", fill=AM, cabecera=AMH)

cont = d.clase("cont", X1, 720, 280, "Contenedor", ["- codigo : String {aleatorio}", "- punto : String",
                                                    "- material : Material [0..1]", "- activo : Boolean", "- creadoEn : Long"],
               ["+ nombre() : String"])
reg = d.clase("reg", X2, 720, 250, "Registro", ["- id : String", "- material : Material", "- talla : Talla", "- kgDeclarado : Double",
                                                "- kgConfirmado : Double [0..1]", "- estado : EstadoRegistro", "- creadoEn : Long",
                                                "- validadoEn : Long [0..1]", "- certificadoEn : Long [0..1]", "- codigo : String [0..1]"],
              ["+ kgEfectivo() : Double"])
inc = d.clase("inc", X1, 1050, 280, "Incidencia", ["- id : String", "- contaminante : Contaminante", "- reportadoEn : Long",
                                                    "- atendida : Boolean", "- atendidaEn : Long [0..1]"])
ret = d.clase("ret", X2, 1020, 250, "Retiro", ["- id : String", "- fecha : Long", "- quienRetira : String", "- guia : String [0..1]",
                                               "- pesoKg : Double [0..1]", "- depositos : Integer", "- kgEstimado : Double",
                                               "- registradoEn : Long"], ["+ esVerificado() : Boolean"])

# Enumeraciones (columna derecha, fuera de las rutas)
d.enum("e1", 980, 1040, 150, "Rol", ["colaborador", "validador", "administrador"])
d.enum("e2", 1145, 1040, 150, "EstadoRegistro", ["pendiente", "validado", "certificado", "rechazado"])
d.enum("e4", 1310, 1040, 150, "Talla", ["S", "M", "L", "XL"])
d.enum("e3", 980, 1200, 150, "Material", ["PapelCarton", "Plastico", "Vidrio", "Metal"])
d.enum("e5", 1145, 1200, 150, "Contaminante", ["Vidrio", "Plastico", "PapelCarton", "Metal", "Organico", "BasuraComun"])

# ---------------- Asociaciones (todas ortogonales, sin cruces)
d.flecha([(cod.cx, cod.b), (cod.cx, pla.y)], "assoc", "protege el rol\nde administrador ▼", en=(cod.cx - 12, 182),
         anchor="end", mult_ini="0..1", mult_fin="1")
d.flecha([(camp.r, pla.y + 40), (pla.x, pla.y + 40)], "assoc", "incentivo ▶", en=(375, pla.y + 60),
         mult_ini="0..1", mult_fin="1")
d.flecha([(pla.r, pla.y + 40), (res.x, pla.y + 40)], "assoc", "lleva ▶", mult_ini="1", mult_fin="0..*")
d.flecha([(res.r, pla.y + 40), (con_a.x, pla.y + 40)], "comp", "areas[areaId]", mult_ini="1", mult_fin="0..*")
d.flecha([(pla.cx, pla.b), (pla.cx, area.y)], "comp", "se organiza en ▼", en=(pla.cx + 10, 385), anchor="start",
         mult_ini="1", mult_fin="1..*")
d.flecha([(pla.r - 25, pla.b), (pla.r - 25, 400), (usu.cx, 400), (usu.cx, usu.y)], "assoc", "trabaja en ◀",
         en=(720, 394), mult_ini="1", mult_fin="0..*")
d.flecha([(pla.x + 25, pla.b), (pla.x + 25, 350), (370, 350), (370, 690), (cont.cx, 690), (cont.cx, cont.y)], "comp",
         "dispone ▼", en=(350, 520), anchor="end", mult_ini="1", mult_fin="0..*")
d.flecha([(area.r, area.y + 50), (usu.x, area.y + 50)], "assoc", "◀ pertenece a", mult_ini="0..1", mult_fin="0..*")
d.flecha([(usu.r, part.cy), (part.x, part.cy)], "assoc", "marca 1er\ndepósito ▶", en=(usu.r + 40, part.cy + 18),
         mult_ini="1", mult_fin="0..*")
d.flecha([(usu.r, cert.cy), (cert.x, cert.cy)], "assoc", "recibe ▶", mult_ini="1", mult_fin="0..*")
d.flecha([(area.cx - 50, area.b), (area.cx - 50, reg.y)], "assoc", "suma a ◀", en=(area.cx - 58, 640), anchor="end",
         mult_ini="1", mult_fin="0..*")
d.flecha([(usu.x + 40, usu.b), (usu.x + 40, 625), (reg.cx + 20, 625), (reg.cx + 20, reg.y)], "assoc", "registra ▼",
         en=(690, 619), mult_ini="1", mult_fin="0..*")
d.flecha([(usu.x + 80, usu.b), (usu.x + 80, 665), (reg.r - 25, 665), (reg.r - 25, reg.y)], "assoc", "valida ▼",
         en=(745, 659), mult_ini="0..1", mult_fin="0..*")
d.flecha([(usu.x + 160, usu.b), (usu.x + 160, ret.y + 60), (ret.r, ret.y + 60)], "assoc", "◀ registra",
         en=(usu.x + 168, 960), anchor="start", mult_ini="1", mult_fin="0..*")
d.flecha([(cont.r, reg.y + 70), (reg.x, reg.y + 70)], "assoc", "recibe ▶", mult_ini="1", mult_fin="0..*")
d.flecha([(reg.cx, reg.b), (reg.cx, ret.y)], "assoc", "certifica ▲", en=(reg.cx - 10, 990), anchor="end",
         mult_ini="0..*", mult_fin="0..1")
d.flecha([(cont.x + 60, cont.b), (cont.x + 60, inc.y)], "assoc", "reportada en ▲", en=(cont.x + 68, 1000), anchor="start",
         mult_ini="1", mult_fin="0..*")
d.flecha([(cont.r - 40, cont.b), (cont.r - 40, ret.y + 25), (ret.x, ret.y + 25)], "assoc", "retira ◀",
         en=(330, 1037), mult_ini="1..*", mult_fin="0..*")
d.flecha([(inc.r, inc.cy + 10), (ret.x, inc.cy + 10)], "assoc", "◀ atiende", mult_ini="0..*", mult_fin="0..1")

d.nota(40, 1250, 360, 104, ["Máquina de estados de Registro",
                                      "(impuesta por firestore.rules)",
                                      "pendiente → validado | rechazado",
                                      "validado → certificado (al retirar)",
                                      "kgDeclarado = KG_POR_TALLA[mat][talla]",
                                      "No guarda el nombre de la persona."], size=11)
d.nota(X4 + 20, 670, 280, 50, ["CertificadoMensual se calcula en el", "cliente; no se almacena."], size=11)
d.guardar("/root/diagramas/manual/out/RecyTrack_02_Diagrama_de_Clases")
