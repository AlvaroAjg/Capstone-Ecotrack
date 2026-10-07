// Etiqueta imprimible del QR de un contenedor. Se arma como una página HTML
// aparte con el QR en SVG, para imprimir solo la etiqueta y no el panel
// completo. Es una función pura (sin el navegador) para poder probarla.

import { contenidoQr, matrizQr } from "./qr";
import { nombreContenedor, type Contenedor } from "./tipos";

/** Zona de silencio alrededor del QR, en módulos (el estándar pide 4). */
const MARGEN = 4;

/** El QR de `texto` como SVG, un rectángulo por módulo oscuro. */
export function svgQr(texto: string, lado = 280): string {
  const matriz = matrizQr(texto);
  const total = matriz.length + MARGEN * 2;
  const modulos: string[] = [];
  matriz.forEach((fila, i) =>
    fila.forEach((oscuro, j) => {
      if (oscuro) modulos.push(`<rect x="${j + MARGEN}" y="${i + MARGEN}" width="1" height="1"/>`);
    })
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#fff"/><g fill="#000">${modulos.join("")}</g></svg>`
  );
}

/** El nombre del punto limpio lo escribe el administrador: se escapa. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Página con la etiqueta para pegar en el contenedor: el QR, el código debajo
 * (sirve para escribirlo si la cámara no lo lee), el material y el punto
 * limpio.
 */
export function htmlEtiquetaQr(c: Contenedor, nombrePlanta: string): string {
  const titulo = `${nombreContenedor(c)} · ${c.punto}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>
  body { margin: 0; font-family: -apple-system, "Segoe UI", system-ui, sans-serif; color: #111827; }
  .etiqueta { width: 340px; margin: 32px auto; padding: 24px; border: 2px dashed #9ca3af; border-radius: 16px; text-align: center; }
  .codigo { font-size: 32px; font-weight: 700; letter-spacing: 0.2em; margin-top: 12px; }
  .material { font-size: 18px; font-weight: 600; margin-top: 8px; }
  .detalle { font-size: 13px; color: #4b5563; margin-top: 4px; }
  @media print { .etiqueta { margin: 0 auto; } }
</style>
</head>
<body>
<div class="etiqueta">
  ${svgQr(contenidoQr(c.plantaId, c.codigo))}
  <div class="codigo">${escapar(c.codigo)}</div>
  <div class="material">${escapar(nombreContenedor(c))}</div>
  <div class="detalle">${escapar(c.punto)} · ${escapar(nombrePlanta)}</div>
  <div class="detalle">Escanéalo con RecyTrack al depositar</div>
</div>
</body>
</html>`;
}
