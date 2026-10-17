"""Mini generador de diagramas UML con coordenadas explícitas.

Cada figura se ubica a mano y cada flecha recibe su recorrido ortogonal,
así el resultado es ordenado y reproducible. Exporta SVG y PNG.
"""
from __future__ import annotations

import math
import os
from html import escape

from PIL import ImageFont

FUENTE = "DejaVu Sans"
_RUTA_FUENTES = "/usr/share/fonts/truetype/dejavu/"
_cache: dict = {}

# Paleta
TINTA = "#1F2D24"
LINEA = "#3F5E48"
GRIS = "#5A6660"
VERDE = "#E2EDE5"
VERDE_OSC = "#CFE3D4"
AMARILLO = "#FFF2CC"
NOTA = "#FFF8DC"


def ancho_texto(s: str, size: float = 12, bold: bool = False, italic: bool = False) -> float:
    nombre = "DejaVuSans" + ("-Bold" if bold else "") + ("Oblique" if italic and not bold else "")
    if bold and italic:
        nombre = "DejaVuSans-BoldOblique"
    key = (nombre, size)
    if key not in _cache:
        _cache[key] = ImageFont.truetype(_RUTA_FUENTES + nombre + ".ttf", int(round(size * 4)))
    return _cache[key].getlength(s) / 4


class Caja:
    def __init__(self, x, y, w, h):
        self.x, self.y, self.w, self.h = x, y, w, h

    @property
    def cx(self):
        return self.x + self.w / 2

    @property
    def cy(self):
        return self.y + self.h / 2

    @property
    def r(self):
        return self.x + self.w

    @property
    def b(self):
        return self.y + self.h

    def p(self, lado: str, d: float = 0):
        """Punto en un lado: l, r, t, b; d desplaza desde el centro del lado."""
        if lado == "l":
            return (self.x, self.cy + d)
        if lado == "r":
            return (self.r, self.cy + d)
        if lado == "t":
            return (self.cx + d, self.y)
        if lado == "b":
            return (self.cx + d, self.b)
        raise ValueError(lado)


class Diagrama:
    def __init__(self, w: int, h: int, titulo: str | None = None, subtitulo: str | None = None):
        self.w, self.h = w, h
        self.capas: dict[int, list[str]] = {}  # capa -> elementos (aristas 50, etiquetas 60)
        self.cajas: dict[str, Caja] = {}
        if titulo:
            self.texto(w / 2, 30, titulo, 19, bold=True)
        # el subtítulo se omite a propósito: la página del PDF ya da el contexto

    # ------------------------------------------------------------ primitivas
    def _add(self, capa: int, s: str):
        self.capas.setdefault(capa, []).append(s)

    def texto(self, x, y, s, size=12, bold=False, italic=False, anchor="middle", color=TINTA, capa=40):
        peso = "bold" if bold else "normal"
        estilo = "italic" if italic else "normal"
        self._add(capa, f'<text x="{x:.1f}" y="{y:.1f}" font-family="{FUENTE}" font-size="{size}" '
                        f'font-weight="{peso}" font-style="{estilo}" text-anchor="{anchor}" fill="{color}">'
                        f'{escape(s)}</text>')

    def lineas(self, x, y, lineas, size=12, anchor="middle", alto=None, capa=3, color=TINTA):
        """lineas: lista de str o (str, dict(bold=, italic=, size=, color=))."""
        alto = alto or size * 1.32
        for i, ln in enumerate(lineas):
            if isinstance(ln, tuple):
                s, o = ln
            else:
                s, o = ln, {}
            self.texto(x, y + i * alto, s, o.get("size", size), o.get("bold", False), o.get("italic", False),
                       anchor, o.get("color", color), capa)

    def rect(self, x, y, w, h, fill="#FFFFFF", stroke=LINEA, sw=1.3, rx=4, dash=None, capa=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self._add(capa, f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
                        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def path(self, d, fill="none", stroke=LINEA, sw=1.3, dash=None, capa=1):
        da = f' stroke-dasharray="{dash}"' if dash else ""
        self._add(capa, f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" '
                        f'stroke-linejoin="round"{da}/>')

    # ------------------------------------------------------------ figuras UML
    def paquete(self, nombre, x, y, w, h, titulo, fill=VERDE, lineas=None, tab=None, capa=1,
                titulo_size=13, contenido_size=11.5, titulo_arriba=True, estereotipo=None):
        """Carpeta UML: pestaña + cuerpo. El nombre va centrado arriba del cuerpo."""
        tab = tab or min(max(60, w * 0.3), 130)
        th = 14
        self.rect(x, y, tab, th + 2, fill, rx=2, capa=capa)
        self.rect(x, y + th, w, h - th, fill, rx=2, capa=capa)
        cx = x + w / 2
        ty = y + th + 18
        if estereotipo:
            self.texto(cx, ty, estereotipo, 11, italic=True, color=GRIS, capa=capa + 2)
            ty += 15
        self.texto(cx, ty, titulo, titulo_size, bold=True, capa=capa + 2)
        if lineas:
            self.lineas(cx, ty + 18, lineas, contenido_size, capa=capa + 2, color=GRIS)
        c = Caja(x, y, w, h)
        self.cajas[nombre] = c
        return c

    def componente(self, nombre, x, y, w, h, titulo, lineas=None, fill=VERDE, estereotipo="«component»",
                   contenedor=False, capa=1, size=13):
        self.rect(x, y, w, h, fill, rx=3, capa=capa, sw=1.4)
        # icono de componente (UML 2)
        ix, iy = x + w - 26, y + 8
        self.rect(ix, iy, 16, 20, fill, rx=1, capa=capa, sw=1)
        self.rect(ix - 4, iy + 4, 8, 4, fill, rx=0, capa=capa, sw=1)
        self.rect(ix - 4, iy + 12, 8, 4, fill, rx=0, capa=capa, sw=1)
        if contenedor:
            self.texto(x + 12, y + 20, estereotipo, 11, italic=True, anchor="start", color=GRIS, capa=capa + 2)
            self.texto(x + 12, y + 37, titulo, size, bold=True, anchor="start", capa=capa + 2)
            if lineas:
                self.lineas(x + 12, y + 54, lineas, 11, anchor="start", capa=capa + 2, color=GRIS)
        else:
            n = len(lineas or [])
            bloque = 15 + 18 + n * 14.5
            ty = y + (h - bloque) / 2 + 12
            self.texto(x + w / 2, ty, estereotipo, 11, italic=True, color=GRIS, capa=capa + 2)
            self.texto(x + w / 2, ty + 18, titulo, size, bold=True, capa=capa + 2)
            if lineas:
                self.lineas(x + w / 2, ty + 34, lineas, 11, capa=capa + 2, color=GRIS)
        c = Caja(x, y, w, h)
        self.cajas[nombre] = c
        return c

    def nodo(self, nombre, x, y, w, h, titulo, estereotipo="«device»", fill=VERDE, lineas=None, d=12,
             capa=1, titulo_arriba=True):
        """Nodo de despliegue (cubo 3D)."""
        pts_top = f"M{x},{y + d} L{x + d},{y} L{x + w + d},{y} L{x + w},{y + d} Z"
        pts_side = f"M{x + w},{y + d} L{x + w + d},{y} L{x + w + d},{y + h - d} L{x + w},{y + h} Z"
        self.path(pts_top, fill=VERDE_OSC if fill == VERDE else fill, capa=capa)
        self.path(pts_side, fill=VERDE_OSC if fill == VERDE else fill, capa=capa)
        self.rect(x, y + d, w, h - d, fill, rx=0, capa=capa)
        ty = y + d + 18
        self.texto(x + w / 2, ty, estereotipo, 11, italic=True, color=GRIS, capa=capa + 2)
        self.texto(x + w / 2, ty + 17, titulo, 13, bold=True, capa=capa + 2)
        if lineas:
            self.lineas(x + w / 2, ty + 34, lineas, 11, capa=capa + 2, color=GRIS)
        c = Caja(x, y + d, w, h - d)
        self.cajas[nombre] = c
        return c

    def artefacto(self, nombre, x, y, w, h, titulo, lineas=None, fill="#FFFFFF", capa=3):
        self.rect(x, y, w, h, fill, rx=2, capa=capa)
        fx, fy = x + w - 18, y + 6
        self.path(f"M{fx},{fy} L{fx + 8},{fy} L{fx + 12},{fy + 4} L{fx + 12},{fy + 15} L{fx},{fy + 15} Z",
                  fill="#FFFFFF", sw=1, capa=capa)
        self.texto(x + w / 2, y + 17, "«artifact»", 10, italic=True, color=GRIS, capa=capa + 0)
        self.texto(x + w / 2, y + 33, titulo, 12, bold=True, capa=capa)
        if lineas:
            self.lineas(x + w / 2, y + 48, lineas, 10.5, capa=capa, color=GRIS)
        c = Caja(x, y, w, h)
        self.cajas[nombre] = c
        return c

    def cilindro(self, nombre, x, y, w, h, titulo, lineas=None, fill=VERDE, capa=3):
        e = 9
        self.path(f"M{x},{y + e} L{x},{y + h - e} A{w / 2},{e} 0 0 0 {x + w},{y + h - e} L{x + w},{y + e}",
                  fill=fill, capa=capa)
        self.path(f"M{x},{y + e} A{w / 2},{e} 0 0 1 {x + w},{y + e} A{w / 2},{e} 0 0 1 {x},{y + e} Z",
                  fill=fill, capa=capa)
        self.texto(x + w / 2, y + 2 * e + 18, titulo, 12, bold=True, capa=capa)
        if lineas:
            self.lineas(x + w / 2, y + 2 * e + 34, lineas, 10.5, capa=capa, color=GRIS)
        c = Caja(x, y, w, h)
        self.cajas[nombre] = c
        return c

    def actor(self, nombre, cx, cy, etiqueta, capa=3, alinear="middle"):
        """Monigote UML; cy es el centro del cuerpo. Devuelve caja del monigote."""
        top = cy - 30
        self._add(capa, f'<circle cx="{cx}" cy="{top + 8}" r="8" fill="{VERDE}" stroke="{LINEA}" stroke-width="1.4"/>')
        self.path(f"M{cx},{top + 16} L{cx},{top + 38} M{cx - 14},{top + 23} L{cx + 14},{top + 23} "
                  f"M{cx},{top + 38} L{cx - 11},{top + 54} M{cx},{top + 38} L{cx + 11},{top + 54}", sw=1.4, capa=capa)
        lns = etiqueta.split("\n")
        if alinear == "end":
            self.lineas(cx + 14, top + 70, lns, 12, anchor="end", capa=capa)
        else:
            self.lineas(cx, top + 70, lns, 12, capa=capa)
        c = Caja(cx - 16, top, 32, 56)
        self.cajas[nombre] = c
        return c

    def caso(self, nombre, cx, cy, etiqueta, w=None, h=46, fill=VERDE, capa=1):
        lns = etiqueta.split("\n")
        w = w or max(ancho_texto(l, 12) for l in lns) + 44
        if len(lns) > 1:
            h = max(h, 18 + 15 * len(lns))
        self._add(capa, f'<ellipse cx="{cx}" cy="{cy}" rx="{w / 2}" ry="{h / 2}" fill="{fill}" '
                        f'stroke="{LINEA}" stroke-width="1.3"/>')
        y0 = cy - (len(lns) - 1) * 7.5 + 4.5
        self.lineas(cx, y0, lns, 12, alto=15, capa=capa + 2)
        c = Caja(cx - w / 2, cy - h / 2, w, h)
        self.cajas[nombre] = c
        return c

    def nota(self, x, y, w, h, lineas, capa=3, size=11.5):
        f = 12
        self.path(f"M{x},{y} L{x + w - f},{y} L{x + w},{y + f} L{x + w},{y + h} L{x},{y + h} Z",
                  fill=NOTA, stroke="#B8A86A", capa=capa)
        self.path(f"M{x + w - f},{y} L{x + w - f},{y + f} L{x + w},{y + f}", stroke="#B8A86A", capa=capa)
        self.lineas(x + 10, y + 18, lineas, size, anchor="start", capa=capa)
        return Caja(x, y, w, h)

    def clase(self, nombre, x, y, w, titulo, atributos=(), operaciones=(), estereotipo=None,
              fill="#F7F9F7", cabecera=VERDE, capa=1):
        lh = 15.5
        hc = 30 + (14 if estereotipo else 0)
        ha = (len(atributos) * lh + 10) if atributos else 8
        ho = (len(operaciones) * lh + 10) if operaciones else 0
        h = hc + ha + ho
        self.rect(x, y, w, h, fill, rx=3, capa=capa, sw=1.4)
        self.rect(x, y, w, hc, cabecera, rx=3, capa=capa, sw=1.4)
        ty = y + 20
        if estereotipo:
            self.texto(x + w / 2, ty - 2, estereotipo, 10.5, italic=True, color=GRIS, capa=capa + 2)
            ty += 14
        self.texto(x + w / 2, ty, titulo, 13, bold=True, capa=capa + 2)
        yy = y + hc + 16
        for a in atributos:
            self.texto(x + 9, yy, a, 11, anchor="start", capa=capa + 2)
            yy += lh
        if operaciones:
            yl = y + hc + ha
            self.path(f"M{x},{yl} L{x + w},{yl}", sw=1, capa=capa)
            yy = yl + 16
            for o in operaciones:
                self.texto(x + 9, yy, o, 11, anchor="start", capa=capa + 2)
                yy += lh
        c = Caja(x, y, w, h)
        self.cajas[nombre] = c
        return c

    def enum(self, nombre, x, y, w, titulo, valores, capa=1):
        return self.clase(nombre, x, y, w, titulo, valores, estereotipo="«enumeration»",
                          cabecera="#F6E7B8", fill="#FFF9E8", capa=capa)

    def puerto(self, x, y, capa=3):
        self.rect(x - 5, y - 5, 10, 10, "#FFFFFF", rx=0, capa=capa, sw=1.4)

    def ensamblaje(self, x, y, hacia="r", etiqueta=None, lado_etq="t", capa=3):
        """Conector de ensamblaje: bola (proveedor) dentro de enchufe (consumidor).
        hacia = dirección del consumidor al proveedor (r, l, t, b)."""
        r_bola, r_enchufe = 6.5, 11
        self._add(capa, f'<circle cx="{x}" cy="{y}" r="{r_bola}" fill="#FFFFFF" stroke="{LINEA}" stroke-width="1.4"/>')
        ang = {"r": 180, "l": 0, "t": 90, "b": 270}[hacia]  # centro del arco (lado consumidor)
        a1, a2 = math.radians(ang - 75), math.radians(ang + 75)
        p1 = (x + r_enchufe * math.cos(a1), y + r_enchufe * math.sin(a1))
        p2 = (x + r_enchufe * math.cos(a2), y + r_enchufe * math.sin(a2))
        self.path(f"M{p1[0]:.1f},{p1[1]:.1f} A{r_enchufe},{r_enchufe} 0 0 1 {p2[0]:.1f},{p2[1]:.1f}",
                  sw=1.4, capa=capa)
        if etiqueta:
            if lado_etq == "t":
                self.etiqueta(x, y - 18, etiqueta, size=11.5, bold=False, italic=False)
            elif lado_etq == "b":
                self.etiqueta(x, y + 26, etiqueta, size=11.5)
            elif lado_etq == "r":
                self.etiqueta(x + 18, y + 4, etiqueta, size=11.5, anchor="start")
            else:
                self.etiqueta(x - 18, y + 4, etiqueta, size=11.5, anchor="end")
        # puntos de conexión: lado consumidor (enchufe) y lado proveedor (bola)
        dx, dy = {"r": (1, 0), "l": (-1, 0), "t": (0, -1), "b": (0, 1)}[hacia]
        return (x - dx * r_enchufe, y - dy * r_enchufe), (x + dx * r_bola, y + dy * r_bola)

    # ------------------------------------------------------------ aristas
    def etiqueta(self, x, y, s, size=11, bold=False, italic=False, anchor="middle", fondo=True, color=TINTA):
        lns = s.split("\n")
        alto = size * 1.25
        if fondo:
            wmax = max(ancho_texto(l, size, bold) for l in lns)
            if anchor == "middle":
                bx = x - wmax / 2 - 3
            elif anchor == "start":
                bx = x - 3
            else:
                bx = x - wmax - 3
            self._add(60, f'<rect x="{bx:.1f}" y="{y - size:.1f}" width="{wmax + 6:.1f}" '
                         f'height="{alto * len(lns) + 2:.1f}" fill="#FFFFFF" fill-opacity="0.92"/>')
        for i, l in enumerate(lns):
            self.texto(x, y + i * alto, l, size, bold, italic, anchor, color, capa=61)

    def flecha(self, pts, tipo="dep", etiqueta=None, en=None, anchor="middle", ini=None, fin=None,
               mult_ini=None, mult_fin=None, color=LINEA, sw=1.3, etq_size=11):
        """tipo: dep (punteada, punta abierta), assoc (sólida, sin punta), nav (sólida, punta abierta),
        gen (sólida, triángulo hueco), real (punteada, triángulo hueco), comp (rombo lleno al inicio),
        msg (sólida, punta llena)."""
        dash = "6,4" if tipo in ("dep", "real", "dep0") else None
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.path(d, stroke=color, sw=sw, dash=dash, capa=50)
        (x1, y1), (x2, y2) = pts[-2], pts[-1]
        ang = math.atan2(y2 - y1, x2 - x1)
        if tipo in ("dep", "nav"):
            L = 11
            a = math.radians(28)
            p1 = (x2 - L * math.cos(ang - a), y2 - L * math.sin(ang - a))
            p2 = (x2 - L * math.cos(ang + a), y2 - L * math.sin(ang + a))
            self.path(f"M{p1[0]:.1f},{p1[1]:.1f} L{x2:.1f},{y2:.1f} L{p2[0]:.1f},{p2[1]:.1f}",
                      stroke=color, sw=sw, capa=50)
        elif tipo == "msg":
            L = 10
            a = math.radians(24)
            p1 = (x2 - L * math.cos(ang - a), y2 - L * math.sin(ang - a))
            p2 = (x2 - L * math.cos(ang + a), y2 - L * math.sin(ang + a))
            self.path(f"M{p1[0]:.1f},{p1[1]:.1f} L{x2:.1f},{y2:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z",
                      fill=color, stroke=color, sw=1, capa=50)
        elif tipo in ("gen", "real"):
            L = 15
            a = math.radians(30)
            p1 = (x2 - L * math.cos(ang - a), y2 - L * math.sin(ang - a))
            p2 = (x2 - L * math.cos(ang + a), y2 - L * math.sin(ang + a))
            self.path(f"M{p1[0]:.1f},{p1[1]:.1f} L{x2:.1f},{y2:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z",
                      fill="#FFFFFF", stroke=color, sw=sw, capa=50)
        if tipo == "comp":
            (xa, ya), (xb, yb) = pts[0], pts[1]
            ang0 = math.atan2(yb - ya, xb - xa)
            L, W = 16, 6
            tip = (xa, ya)
            mid = (xa + L / 2 * math.cos(ang0), ya + L / 2 * math.sin(ang0))
            end = (xa + L * math.cos(ang0), ya + L * math.sin(ang0))
            nx, ny = -math.sin(ang0) * W, math.cos(ang0) * W
            self.path(f"M{tip[0]:.1f},{tip[1]:.1f} L{mid[0] + nx:.1f},{mid[1] + ny:.1f} L{end[0]:.1f},{end[1]:.1f} "
                      f"L{mid[0] - nx:.1f},{mid[1] - ny:.1f} Z", fill=color, stroke=color, sw=1, capa=50)
        if etiqueta:
            if en is None:
                # punto medio del tramo más largo
                best, bi = -1, 0
                for i in range(len(pts) - 1):
                    l = math.dist(pts[i], pts[i + 1])
                    if l > best:
                        best, bi = l, i
                (xa, ya), (xb, yb) = pts[bi], pts[bi + 1]
                en = ((xa + xb) / 2, (ya + yb) / 2 + 4)
            self.etiqueta(en[0], en[1], etiqueta, size=etq_size, anchor=anchor)
        for mult, extremo, vecino in ((mult_ini, pts[0], pts[1]), (mult_fin, pts[-1], pts[-2])):
            if mult:
                ex, ey = extremo
                vx, vy = vecino
                if abs(vx - ex) > abs(vy - ey):  # tramo horizontal
                    sx = 1 if vx > ex else -1
                    self.texto(ex + sx * 8, ey - 6, mult, 11, anchor="start" if sx > 0 else "end", capa=61)
                else:
                    sy = 1 if vy > ey else -1
                    self.texto(ex + 6, ey + sy * 14 + (4 if sy < 0 else -2), mult, 11, anchor="start", capa=61)

    # ------------------------------------------------------------ salida
    def svg(self) -> str:
        cuerpo = "\n".join(s for k in sorted(self.capas) for s in self.capas[k])
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
                f'viewBox="0 0 {self.w} {self.h}">\n<rect width="100%" height="100%" fill="#FFFFFF"/>\n'
                f'{cuerpo}\n</svg>\n')

    def guardar(self, ruta_sin_ext: str, escala: float = 2.0):
        svg = self.svg()
        with open(ruta_sin_ext + ".svg", "w") as f:
            f.write(svg)
        _png(ruta_sin_ext + ".svg", ruta_sin_ext + ".png", self.w, self.h, escala)


def _png(svg_path, png_path, w, h, escala):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": int(w), "height": int(h)}, device_scale_factor=escala)
        pg.goto("file://" + os.path.abspath(svg_path))
        pg.screenshot(path=png_path, full_page=False, omit_background=False)
        b.close()


def ortho_h(p1, p2, mx=None):
    """Horizontal-vertical-horizontal entre dos puntos."""
    mx = (p1[0] + p2[0]) / 2 if mx is None else mx
    if abs(p1[1] - p2[1]) < 0.5:
        return [p1, p2]
    return [p1, (mx, p1[1]), (mx, p2[1]), p2]


def ortho_v(p1, p2, my=None):
    """Vertical-horizontal-vertical entre dos puntos."""
    my = (p1[1] + p2[1]) / 2 if my is None else my
    if abs(p1[0] - p2[0]) < 0.5:
        return [p1, p2]
    return [p1, (p1[0], my), (p2[0], my), p2]


def borde_elipse(c: Caja, lado: str, dy: float = 0):
    """Punto en el borde izquierdo/derecho de una elipse a una altura dy del centro."""
    a, b = c.w / 2, c.h / 2
    k = math.sqrt(max(0.0, 1 - (dy / b) ** 2))
    return (c.cx + (a * k if lado == "r" else -a * k), c.cy + dy)


def objeto(d: Diagrama, nombre, x, y, w, h, etiqueta, estereotipo=None, fill=VERDE):
    """Objeto (instancia): rectángulo con el nombre subrayado."""
    d.rect(x, y, w, h, fill, rx=3, capa=1, sw=1.4)
    ty = y + h / 2 + 5 + (6 if estereotipo else 0)
    if estereotipo:
        d.texto(x + w / 2, ty - 17, estereotipo, 10.5, italic=True, color=GRIS, capa=3)
    d.texto(x + w / 2, ty, etiqueta, 13, bold=True, capa=3)
    tw = ancho_texto(etiqueta, 13, True)
    d.path(f"M{x + w / 2 - tw / 2:.1f},{ty + 3:.1f} L{x + w / 2 + tw / 2:.1f},{ty + 3:.1f}", stroke=TINTA, sw=1, capa=3)
    c = Caja(x, y, w, h)
    d.cajas[nombre] = c
    return c


def mensaje(d: Diagrama, x, y, direccion, texto, lado="arriba", largo=34):
    """Flecha corta de mensaje (diagrama de comunicación) con su etiqueta."""
    dx, dy = {"r": (1, 0), "l": (-1, 0), "d": (0, 1), "u": (0, -1)}[direccion]
    p1 = (x, y)
    p2 = (x + dx * largo, y + dy * largo)
    d.flecha([p1, p2], tipo="msg", color=TINTA, sw=1.4)
    lineas = texto.split("\n")
    if direccion in ("r", "l"):
        mx = (p1[0] + p2[0]) / 2
        if lado == "arriba":
            for i, l in enumerate(reversed(lineas)):
                d.texto(mx, y - 8 - i * 14, l, 11.5, capa=61)
        else:
            for i, l in enumerate(lineas):
                d.texto(mx, y + 18 + i * 14, l, 11.5, capa=61)
    else:
        my = (p1[1] + p2[1]) / 2
        anchor = "start" if lado == "der" else "end"
        off = 10 if lado == "der" else -10
        for i, l in enumerate(lineas):
            d.texto(x + off, my + 4 + (i - (len(lineas) - 1) / 2) * 14, l, 11.5, anchor=anchor, capa=61)
