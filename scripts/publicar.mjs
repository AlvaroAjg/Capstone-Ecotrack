/**
 * Prepara la carpeta `hosting/` para publicar EcoTrack en Firebase Hosting.
 *
 *   node scripts/publicar.mjs
 *   npx firebase-tools deploy --only hosting
 *
 * Deja en la raíz del sitio la app web exportada con Expo. Así en la defensa
 * basta abrir una URL: no hay que instalar Node, ni levantar Metro, ni depender
 * del notebook de nadie.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const carpetaApp = join(raiz, "app");
const exportado = join(carpetaApp, "dist");
const destino = join(raiz, "hosting");

const paso = (texto) => console.log(`\n> ${texto}`);

if (!existsSync(carpetaApp)) {
  console.error("No encuentro la carpeta app/. Ejecuta esto desde la raíz del repositorio.");
  process.exit(1);
}

paso("Exportando la app web con Expo (puede tardar un par de minutos)...");
execSync("npx expo export --platform web", { cwd: carpetaApp, stdio: "inherit" });

if (!existsSync(exportado)) {
  console.error("Expo no generó app/dist. Revisa los errores de arriba.");
  process.exit(1);
}

paso("Armando la carpeta hosting/...");
rmSync(destino, { recursive: true, force: true });
cpSync(exportado, destino, { recursive: true });

console.log(`
Listo. La carpeta hosting/ quedó preparada.

Ahora publica con:

    npx firebase-tools deploy --only hosting

Y quedará disponible en:

    https://ecotrack-capstone-3f12d.web.app/
`);
