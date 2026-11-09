import { describe, expect, test } from "vitest";
import { hayVersionNueva, versionDeHtml } from "../src/lib/version";

const PUBLICADO = `<!DOCTYPE html><html><head><title>RecyTrack</title></head><body><div id="root"></div>
<script src="/_expo/static/js/web/index-30f25f36c388b737b22ff8b055f3c1aa.js" defer></script></body></html>`;

describe("versionDeHtml", () => {
  test("saca el archivo de la app del index.html publicado", () => {
    expect(versionDeHtml(PUBLICADO)).toBe("/_expo/static/js/web/index-30f25f36c388b737b22ff8b055f3c1aa.js");
  });

  test("también desde la dirección completa del script que cargó la página", () => {
    expect(versionDeHtml("https://ecotrack-capstone-3f12d.web.app/_expo/static/js/web/index-abc123.js")).toBe(
      "/_expo/static/js/web/index-abc123.js"
    );
  });

  test("null en el servidor de desarrollo, que no usa ese archivo", () => {
    expect(versionDeHtml('<script src="/index.bundle?platform=web&dev=true"></script>')).toBeNull();
  });
});

describe("hayVersionNueva", () => {
  test("solo si la publicada es otra que la que está corriendo", () => {
    expect(hayVersionNueva("/a.js", "/b.js")).toBe(true);
    expect(hayVersionNueva("/a.js", "/a.js")).toBe(false);
  });

  test("sin saber alguna de las dos, no avisa", () => {
    expect(hayVersionNueva(null, "/b.js")).toBe(false);
    expect(hayVersionNueva("/a.js", null)).toBe(false);
  });
});
