/**
 * Servidor mínimo para abrir la pared de demostración.
 *
 *   node servidor.mjs
 *
 * No instala nada ni necesita internet para arrancar: usa solo lo que trae
 * Node. Existe porque `pared-demo.html` necesita servirse por HTTP para que
 * Firebase Auth y Firestore funcionen de forma confiable (abriéndolo con doble
 * clic, el navegador lo trata como origen "null" y el comportamiento varía
 * entre navegadores y versiones).
 */
import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT ?? 5500);
const INICIO = "/pared-demo.html";

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const servidor = createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent(new URL(peticion.url, "http://localhost").pathname);
  const destino = ruta === "/" ? INICIO : ruta;

  // Nunca servir fuera de esta carpeta.
  const archivo = join(carpeta, normalize(destino));
  if (archivo !== carpeta && !archivo.startsWith(carpeta + sep)) {
    respuesta.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    respuesta.end("Prohibido");
    return;
  }

  try {
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, {
      "Content-Type": TIPOS[extname(archivo).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    respuesta.end(
      '<h1>404</h1><p>No encontrado. Prueba con <a href="/pared-demo.html">/pared-demo.html</a>.</p>'
    );
  }
});

servidor.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\nEl puerto ${PUERTO} ya está ocupado.`);
    console.error(`Prueba con otro:   PORT=5501 node servidor.mjs\n`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

servidor.listen(PUERTO, () => {
  const url = `http://localhost:${PUERTO}${INICIO}`;
  console.log(`
  EcoTrack - pared de demostracion

  Abierta en:  ${url}

  Deja esta ventana abierta mientras presentas.
  Para cerrar el servidor: Ctrl + C
`);
  abrirNavegador(url);
});

function abrirNavegador(url) {
  const comando =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(comando, () => {
    /* si no se puede abrir solo, el usuario copia la URL */
  });
}
