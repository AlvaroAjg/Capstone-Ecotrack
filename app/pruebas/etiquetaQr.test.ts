import { describe, expect, test } from "vitest";
import { htmlEtiquetaQr, svgQr } from "../src/lib/etiquetaQr";
import { matrizQr } from "../src/lib/qr";
import { contenedor } from "./fabrica";

describe("svgQr", () => {
  test("un rectángulo por cada módulo oscuro del QR", () => {
    const texto = "ECOTRACK:planta-1:K7QM9X";
    const oscuros = matrizQr(texto).flat().filter(Boolean).length;
    const svg = svgQr(texto);
    // Más el fondo blanco.
    expect(svg.match(/<rect /g)?.length).toBe(oscuros + 1);
  });
});

describe("htmlEtiquetaQr", () => {
  test("lleva el código, el material y el punto limpio", () => {
    const html = htmlEtiquetaQr(contenedor({ codigo: "K7QM9X", punto: "Casino" }), "Planta Piloto");
    expect(html).toContain("K7QM9X");
    expect(html).toContain("Contenedor de plástico");
    expect(html).toContain("Casino · Planta Piloto");
  });

  test("escapa el nombre del punto limpio", () => {
    const html = htmlEtiquetaQr(contenedor({ punto: "<b>Casino</b>" }), "Planta Piloto");
    expect(html).not.toContain("<b>Casino</b>");
    expect(html).toContain("&lt;b&gt;Casino&lt;/b&gt;");
  });
});
